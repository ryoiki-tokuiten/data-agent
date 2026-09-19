import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import multer from 'multer';

const app = express();
const PORT = process.env.PORT || 3001;

// Repository and workspace paths
const REPO_ROOT = path.resolve(__dirname, '..');
const WORKSPACE_BASE_DIR = path.join(REPO_ROOT, 'workspace');
const VENV_BIN = path.join(REPO_ROOT, 'venv', 'bin');

let activeRunId: string = 'default';

export function sanitizeRunId(raw?: string): string {
  if (!raw || typeof raw !== 'string') return activeRunId || 'default';
  const clean = raw.replace(/[^a-zA-Z0-9_.-]/g, '_').trim();
  return clean || activeRunId || 'default';
}

export function setActiveRunId(runId: string): string {
  const safe = sanitizeRunId(runId);
  activeRunId = safe;
  return safe;
}

/**
 * Returns the isolated workspace directory for a given run ID.
 * Inside workspace/<runId>/, ensures:
 * - user_uploaded/ (where raw uploaded files are directly saved)
 * - slices/
 * - visualization/
 * - anomalies/
 * - forecasting/
 */
export function getRunWorkspaceDir(runId?: string): string {
  const safeId = sanitizeRunId(runId);
  const targetDir = safeId === 'default' 
    ? WORKSPACE_BASE_DIR 
    : path.join(WORKSPACE_BASE_DIR, safeId);

  const subdirs = [
    targetDir,
    path.join(targetDir, 'user_uploaded'),
    path.join(targetDir, 'slices'),
    path.join(targetDir, 'visualization'),
    path.join(targetDir, 'anomalies'),
    path.join(targetDir, 'forecasting'),
  ];

  for (const dir of subdirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  return targetDir;
}

// Ensure default workspace base directories exist
getRunWorkspaceDir('default');

// Multer storage: directly saves uploaded files into workspace/<runId>/user_uploaded/
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const rawRunId = (req.query.runId as string) || (req.headers['x-run-id'] as string) || (req.body?.runId as string);
    if (rawRunId) {
      setActiveRunId(rawRunId);
    }
    const runWorkspaceDir = getRunWorkspaceDir(rawRunId);
    const userUploadedDir = path.join(runWorkspaceDir, 'user_uploaded');
    if (!fs.existsSync(userUploadedDir)) {
      fs.mkdirSync(userUploadedDir, { recursive: true });
    }
    cb(null, userUploadedDir);
  },
  filename: (_req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB max file upload
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-run-id']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    message: 'Data Science Agent Backend is running with local Bash & Python environment',
    activeRunId,
    workspaceBaseDir: WORKSPACE_BASE_DIR,
    pythonVenv: VENV_BIN,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/run/init
 * Explicitly initializes a run directory and sets it as the active run
 */
app.post('/api/run/init', (req: Request, res: Response) => {
  try {
    const rawRunId = req.body?.runId || (req.query.runId as string) || `run_${Date.now()}`;
    const safeRunId = setActiveRunId(rawRunId);
    const workspaceDir = getRunWorkspaceDir(safeRunId);

    res.json({
      success: true,
      runId: safeRunId,
      workspaceDir
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Maximum tool output cap: 8,000 tokens (~32,000 characters)
const MAX_TOOL_OUTPUT_CHARS = 32000;

function capOutput(text: string, label: string = 'Output'): string {
  if (!text || text.length <= MAX_TOOL_OUTPUT_CHARS) {
    return text;
  }
  const truncated = text.slice(0, MAX_TOOL_OUTPUT_CHARS);
  return `${truncated}\n... [${label} truncated to 8,000 tokens (32,000 chars). Total length: ${text.length} chars. Use head/tail/grep or redirect to inspect specific segments]`;
}

/**
 * POST /api/files/upload
 * Saves uploaded file directly into workspace/<runId>/user_uploaded/<filename>
 */
app.post('/api/files/upload', upload.array('files', 10), (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const rawRunId = (req.query.runId as string) || (req.headers['x-run-id'] as string) || (req.body?.runId as string);
    const safeRunId = sanitizeRunId(rawRunId);
    const runWorkspaceDir = getRunWorkspaceDir(safeRunId);

    const uploadedResults = files.map(file => ({
      name: file.originalname,
      path: file.path,
      relativePath: `user_uploaded/${file.originalname}`,
      size: file.size,
      mimeType: file.mimetype
    }));

    res.json({
      success: true,
      runId: safeRunId,
      files: uploadedResults,
      workspaceDir: runWorkspaceDir
    });
  } catch (err: any) {
    console.error('[Backend] Upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/bash
 * Executes a bash command in the run workspace directory (workspace/<runId>/)
 */
app.post('/api/bash', (req: Request, res: Response) => {
  const body = req.body || {};
  let command = (typeof body === 'string' ? body : (body.command || body.cmd || body.script || body.code || '')).trim();
  if (!command && typeof body === 'object') {
    for (const k of Object.keys(body)) {
      if (k !== 'cwd' && k !== 'timeoutMs' && k !== 'runId' && typeof body[k] === 'string' && body[k].trim().length > 0) {
        command = body[k].trim();
        break;
      }
    }
  }

  const rawRunId = body.runId || (req.query.runId as string) || (req.headers['x-run-id'] as string);
  const safeRunId = sanitizeRunId(rawRunId);
  const runWorkspace = getRunWorkspaceDir(safeRunId);

  const requestedCwd = body.cwd;
  const timeoutMs = body.timeoutMs || 120000;

  if (!command) {
    return res.json({ success: false, exitCode: 0, stdout: '', stderr: '', output: 'Warning: No command specified to execute.' });
  }

  const workingDir = requestedCwd ? path.resolve(runWorkspace, requestedCwd) : runWorkspace;
  if (!workingDir.startsWith(runWorkspace)) {
    return res.status(403).json({ success: false, error: 'Working directory cannot escape run workspace' });
  }

  // Prepare environment with venv in PATH and WORKSPACE_DIR pointing to run workspace
  const env = {
    ...process.env,
    PATH: `${VENV_BIN}:${process.env.PATH}`,
    PYTHONUNBUFFERED: '1',
    WORKSPACE_DIR: runWorkspace
  };

  console.log(`[Backend Bash (Run: ${safeRunId})] Executing in ${workingDir}: ${command.slice(0, 120)}...`);

  exec(command, {
    cwd: workingDir,
    env,
    timeout: timeoutMs,
    maxBuffer: 50 * 1024 * 1024, // 50 MB buffer
    shell: '/bin/bash'
  }, (error, stdout, stderr) => {
    const rawStdout = stdout ? stdout.toString() : '';
    const rawStderr = stderr ? stderr.toString() : '';

    const cappedStdout = capOutput(rawStdout, 'stdout');
    const cappedStderr = capOutput(rawStderr, 'stderr');

    let combinedOutput = cappedStdout;
    if (cappedStderr) {
      combinedOutput += (combinedOutput ? '\n' : '') + `STDERR:\n${cappedStderr}`;
    }
    if (!combinedOutput && error) {
      combinedOutput = `Error: ${error.message}`;
    }

    const exitCode = error ? (error.code ?? 1) : 0;

    res.json({
      success: exitCode === 0,
      exitCode,
      runId: safeRunId,
      stdout: cappedStdout,
      stderr: cappedStderr,
      output: combinedOutput || '(command executed with no output)'
    });
  });
});

/**
 * GET /api/workspace/files?runId=...
 * Recursively lists all files in the designated run workspace directory
 */
app.get('/api/workspace/files', (req: Request, res: Response) => {
  try {
    const rawRunId = (req.query.runId as string) || (req.headers['x-run-id'] as string);
    const safeRunId = sanitizeRunId(rawRunId);
    const runWorkspaceDir = getRunWorkspaceDir(safeRunId);

    const fileList: Array<{ 
      name: string; 
      relativePath: string; 
      size: number; 
      modified: string; 
      isDir: boolean;
      folder: string;
    }> = [];

    function scanDir(dir: string, rel: string = '') {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        // If we are in root workspace (default run), don't recurse into other run_* directories
        if (safeRunId === 'default' && rel === '' && entry.isDirectory() && entry.name.startsWith('run_')) {
          continue;
        }

        const fullPath = path.join(dir, entry.name);
        const relPath = rel ? `${rel}/${entry.name}` : entry.name;
        const stat = fs.statSync(fullPath);

        // Derive top-level folder category
        const firstSegment = relPath.includes('/') ? relPath.split('/')[0] : 'root';

        fileList.push({
          name: entry.name,
          relativePath: relPath,
          size: stat.size,
          modified: stat.mtime.toISOString(),
          isDir: entry.isDirectory(),
          folder: firstSegment
        });

        if (entry.isDirectory()) {
          scanDir(fullPath, relPath);
        }
      }
    }

    scanDir(runWorkspaceDir);

    res.json({
      success: true,
      runId: safeRunId,
      workspaceDir: runWorkspaceDir,
      files: fileList
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/workspace/file-content?path=...&runId=...
 * Reads the content of a specific file in the run workspace
 */
app.get('/api/workspace/file-content', (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'path query parameter is required' });
    }

    const rawRunId = (req.query.runId as string) || (req.headers['x-run-id'] as string);
    const safeRunId = sanitizeRunId(rawRunId);
    const runWorkspaceDir = getRunWorkspaceDir(safeRunId);

    const resolved = path.resolve(runWorkspaceDir, filePath);
    // Security check: ensure path stays within run workspace
    if (!resolved.startsWith(runWorkspaceDir)) {
      return res.status(403).json({ success: false, error: 'Access outside run workspace directory is denied' });
    }

    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      return res.status(400).json({ success: false, error: 'Cannot read directory as file' });
    }

    // Check if binary or huge (> 10MB)
    const isLikelyBinary = filePath.endsWith('.parquet') || filePath.endsWith('.pkl') || filePath.endsWith('.png') || filePath.endsWith('.jpg');
    if (isLikelyBinary) {
      return res.json({
        success: true,
        runId: safeRunId,
        path: filePath,
        isBinary: true,
        size: stat.size,
        content: `[Binary Data: ${path.basename(filePath)} (${(stat.size / 1024).toFixed(1)} KB)]`
      });
    }

    const content = fs.readFileSync(resolved, 'utf8');
    res.json({
      success: true,
      runId: safeRunId,
      path: filePath,
      content,
      size: stat.size
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../dist');
  app.use(express.static(distPath));
  
  app.get('*', (_req: Request, res: Response) => {
    if (!_req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('[Backend] Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     Data Science Agent Backend Server Started         ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  Environment: ${process.env.NODE_ENV || 'development'}`.padEnd(57) + '║');
  console.log(`║  Backend API: http://localhost:${PORT}`.padEnd(57) + '║');
  console.log(`║  Workspace:   ${WORKSPACE_BASE_DIR}`.padEnd(57) + '║');
  console.log(`║  Python Venv: ${VENV_BIN}`.padEnd(57) + '║');
  console.log('╚════════════════════════════════════════════════════════╝');
});

export default app;
