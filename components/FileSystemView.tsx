import React, { useState, useMemo, useEffect } from 'react';
import { usePipelineStore, useFileStore } from '../hooks/stores';
import type { VirtualFile } from '../types';
import './FileSystemView.css';

// Eagerly import all 27 markdown chart specifications from disk
const chartSpecModules = import.meta.glob('../chart_specifications/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

declare var hljs: any;

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const highlightCode = (code: string, lang: string): string => {
  if (!code) return '';
  if (typeof hljs !== 'undefined') {
    try {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language, ignoreIllegals: true }).value;
    } catch {
      return escapeHtml(code);
    }
  }
  return escapeHtml(code);
};

export interface FileSystemVirtualFile {
  path: string;
  name: string;
  folder: string;
  type: 'markdown' | 'csv' | 'json' | 'python';
  content: string;
  size?: string;
  metadata?: string;
  pythonCode?: string | null;
  executionLog?: string | null;
}

interface BackendFileItem {
  name: string;
  relativePath: string;
  size: number;
  modified: string;
  isDir: boolean;
  folder: string;
}

interface FileSystemViewProps {
  onOpenCodeModal?: (code: string, log?: string, title?: string) => void;
}

export const FileSystemView: React.FC<FileSystemViewProps> = ({ onOpenCodeModal: _onOpenCodeModal }) => {
  const analysisResult = usePipelineStore((s) => s.analysisResult);
  const currentRunId = usePipelineStore((s) => s.currentRunId);
  const uploadedFiles = useFileStore((s) => s.files);

  const effectiveRunId = analysisResult?.runId || currentRunId || 'default';

  const [backendFiles, setBackendFiles] = useState<BackendFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  const [fetchedFileContents, setFetchedFileContents] = useState<Record<string, string>>({});
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false);

  const [selectedFilePath, setSelectedFilePath] = useState<string>('DATA_REPORT.md');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({
    chart_specifications: true, // collapse specifications by default to keep explorer clean
  });
  const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);
  const [tablePage, setTablePage] = useState<number>(0);
  const [tableSearch, setTableSearch] = useState<string>('');
  const [tableRowsPerPage, setTableRowsPerPage] = useState<number>(20);
  const [copiedCellId, setCopiedCellId] = useState<string | null>(null);

  // Cached in-memory file contents for newly selected files before backend confirms upload
  const [localUploadedContents, setLocalUploadedContents] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;
    const loadFiles = async () => {
      const contents: Record<string, string> = {};
      for (const file of uploadedFiles) {
        try {
          const text = await file.text();
          contents[file.name] = text;
        } catch {
          contents[file.name] = `Binary file (${file.size} bytes)`;
        }
      }
      if (isMounted) {
        setLocalUploadedContents(contents);
      }
    };
    loadFiles();
    return () => {
      isMounted = false;
    };
  }, [uploadedFiles]);

  // Fetch real files from backend workspace for the current run
  useEffect(() => {
    let isCancelled = false;

    const fetchWorkspaceFiles = async () => {
      setIsLoadingFiles(true);
      try {
        const resp = await fetch(`http://localhost:3001/api/workspace/files?runId=${encodeURIComponent(effectiveRunId)}`);
        if (resp.ok) {
          const data = await resp.json();
          if (!isCancelled && data.success && Array.isArray(data.files)) {
            setBackendFiles(data.files);
          }
        }
      } catch (err) {
        console.warn('[FileSystemView] Failed to fetch workspace files:', err);
      } finally {
        if (!isCancelled) setIsLoadingFiles(false);
      }
    };

    fetchWorkspaceFiles();

    // While agent pipeline is processing, poll for newly generated files every 3.5 seconds
    const isProcessing =
      analysisResult?.status === 'pending' ||
      analysisResult?.status === 'data_cleaning' ||
      analysisResult?.status === 'insights_processing';

    let pollInterval: any = null;
    if (isProcessing) {
      pollInterval = setInterval(fetchWorkspaceFiles, 3500);
    }

    return () => {
      isCancelled = true;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [effectiveRunId, refreshCounter, analysisResult?.status]);

  // Build the complete virtual file system scoped to the current run
  const virtualFiles = useMemo<FileSystemVirtualFile[]>(() => {
    const filesMap = new Map<string, FileSystemVirtualFile>();

    // 1. Root DATA_REPORT.md (Primary Data Cleaning & Profiling Report)
    const reportText =
      analysisResult?.dataCleaningReport ||
      fetchedFileContents['DATA_REPORT.md'] ||
      '# Data Cleaning & Quality Report\n\nNo report generated yet. Run the pipeline to inspect data and generate slices.';

    filesMap.set('DATA_REPORT.md', {
      path: 'DATA_REPORT.md',
      name: 'DATA_REPORT.md',
      folder: 'root',
      type: 'markdown',
      content: reportText,
      size: `${(new Blob([reportText]).size / 1024).toFixed(1)} KB`,
      metadata: 'Authoritative Technical Dossier',
      pythonCode: analysisResult?.cleaningPythonCode || null,
      executionLog: analysisResult?.cleaningExecutionLog || null,
    });

    // 2. Add real files discovered on disk in the run's workspace
    for (const bf of backendFiles) {
      if (bf.isDir) continue;
      if (bf.relativePath === 'DATA_REPORT.md') continue;

      const ext = bf.name.split('.').pop()?.toLowerCase() || '';
      let ftype: FileSystemVirtualFile['type'] = 'csv';
      if (ext === 'json') ftype = 'json';
      else if (ext === 'py') ftype = 'python';
      else if (ext === 'md' || ext === 'parquet') ftype = 'markdown';

      const folder = bf.folder || (bf.relativePath.includes('/') ? bf.relativePath.split('/')[0] : 'root');

      let metadata = 'Workspace Artifact';
      if (folder === 'slices') metadata = 'High-Signal Lakehouse Slice';
      else if (folder === 'user_uploaded') metadata = 'Immutable Source Dataset';
      else if (folder === 'visualization') metadata = 'Visualization Spec / Script';
      else if (folder === 'anomalies') metadata = 'Anomaly Detection Artifact';
      else if (folder === 'forecasting') metadata = 'Predictive Model Artifact';

      // Use fetched content if available, or placeholder for binary
      let content = fetchedFileContents[bf.relativePath] ?? '';
      if (!content && bf.name.endsWith('.parquet')) {
        content = `Parquet Binary Dataset: ${bf.name} (${(bf.size / 1024).toFixed(1)} KB)\nUse pd.read_parquet('${bf.relativePath}') in Python.`;
      }

      filesMap.set(bf.relativePath, {
        path: bf.relativePath,
        name: bf.name,
        folder,
        type: ftype,
        content,
        size: `${(bf.size / 1024).toFixed(1)} KB`,
        metadata,
        pythonCode: folder === 'visualization' ? analysisResult?.visualizationPythonCode : folder === 'slices' ? analysisResult?.cleaningPythonCode : null,
        executionLog: folder === 'visualization' ? analysisResult?.visualizationExecutionLog : folder === 'slices' ? analysisResult?.cleaningExecutionLog : null,
      });
    }

    // 3. Fallback: user_uploaded files in memory if not yet reflected by disk scan
    for (const f of uploadedFiles) {
      const relPath = `user_uploaded/${f.name}`;
      if (!filesMap.has(relPath)) {
        const ext = f.name.split('.').pop()?.toLowerCase() || '';
        let ftype: FileSystemVirtualFile['type'] = 'csv';
        if (ext === 'json') ftype = 'json';
        else if (ext === 'py') ftype = 'python';
        else if (ext === 'md') ftype = 'markdown';

        filesMap.set(relPath, {
          path: relPath,
          name: f.name,
          folder: 'user_uploaded',
          type: ftype,
          content: localUploadedContents[f.name] || '',
          size: `${(f.size / 1024).toFixed(1)} KB`,
          metadata: 'Immutable Source Dataset',
        });
      }
    }

    // 4. In-memory stage results fallback if not yet written to disk
    if (analysisResult?.visualizations && analysisResult.visualizations.length > 0 && !filesMap.has('visualization/final_output.json')) {
      const vizJson = JSON.stringify(analysisResult.visualizations, null, 2);
      filesMap.set('visualization/final_output.json', {
        path: 'visualization/final_output.json',
        name: 'final_output.json',
        folder: 'visualization',
        type: 'json',
        content: vizJson,
        size: `${(new Blob([vizJson]).size / 1024).toFixed(1)} KB`,
        metadata: `${analysisResult.visualizations.length} Chart Specifications`,
        pythonCode: analysisResult.visualizationPythonCode || null,
        executionLog: analysisResult.visualizationExecutionLog || null,
      });
    }
    if (analysisResult?.visualizationPythonCode && !filesMap.has('visualization/generate_charts.py')) {
      filesMap.set('visualization/generate_charts.py', {
        path: 'visualization/generate_charts.py',
        name: 'generate_charts.py',
        folder: 'visualization',
        type: 'python',
        content: analysisResult.visualizationPythonCode,
        size: `${(new Blob([analysisResult.visualizationPythonCode]).size / 1024).toFixed(1)} KB`,
        metadata: 'Executable Python Script',
        pythonCode: analysisResult.visualizationPythonCode,
        executionLog: analysisResult.visualizationExecutionLog || null,
      });
    }

    if (analysisResult?.anomalyReport && !filesMap.has('anomalies/final_output.json')) {
      const anomJson = JSON.stringify(analysisResult.anomalyReport, null, 2);
      const count = analysisResult.anomalyReport.detectedAnomalies?.length || 0;
      filesMap.set('anomalies/final_output.json', {
        path: 'anomalies/final_output.json',
        name: 'final_output.json',
        folder: 'anomalies',
        type: 'json',
        content: anomJson,
        size: `${(new Blob([anomJson]).size / 1024).toFixed(1)} KB`,
        metadata: `${count} Anomalies Detected`,
        pythonCode: (analysisResult.anomalyReport as any)?._pythonCode || null,
        executionLog: (analysisResult.anomalyReport as any)?._executionLog || null,
      });
    }

    if (analysisResult?.forecastingReport && !filesMap.has('forecasting/final_output.json')) {
      const fcastJson = JSON.stringify(analysisResult.forecastingReport, null, 2);
      const mCount = analysisResult.forecastingReport.models?.length || 0;
      filesMap.set('forecasting/final_output.json', {
        path: 'forecasting/final_output.json',
        name: 'final_output.json',
        folder: 'forecasting',
        type: 'json',
        content: fcastJson,
        size: `${(new Blob([fcastJson]).size / 1024).toFixed(1)} KB`,
        metadata: `${mCount} Predictive Models`,
      });
    }

    // 5. chart_specifications/ directory (all 27 markdown specs)
    for (const [modPath, specContent] of Object.entries(chartSpecModules)) {
      const fileName = modPath.split('/').pop() || 'Specification.md';
      filesMap.set(`chart_specifications/${fileName}`, {
        path: `chart_specifications/${fileName}`,
        name: fileName,
        folder: 'chart_specifications',
        type: 'markdown',
        content: specContent,
        size: `${(new Blob([specContent]).size / 1024).toFixed(1)} KB`,
        metadata: 'Contract Schema Specification',
      });
    }

    return Array.from(filesMap.values());
  }, [analysisResult, backendFiles, uploadedFiles, localUploadedContents, fetchedFileContents]);

  // Selected file lookup
  const selectedFile = useMemo(() => {
    return (
      virtualFiles.find((f) => f.path === selectedFilePath) ||
      virtualFiles.find((f) => f.path === 'DATA_REPORT.md') ||
      virtualFiles[0]
    );
  }, [virtualFiles, selectedFilePath]);

  // Fetch real file content on-demand when user selects a file that is not in memory
  useEffect(() => {
    if (!selectedFile) return;

    // Chart specifications and in-memory DATA_REPORT have content already
    if (selectedFile.path.startsWith('chart_specifications/')) return;
    if (selectedFile.path === 'DATA_REPORT.md' && analysisResult?.dataCleaningReport) return;
    if (selectedFile.content && selectedFile.content.length > 0) return;

    let isCancelled = false;
    const fetchContent = async () => {
      setIsLoadingContent(true);
      try {
        const resp = await fetch(
          `http://localhost:3001/api/workspace/file-content?path=${encodeURIComponent(selectedFile.path)}&runId=${encodeURIComponent(effectiveRunId)}`
        );
        if (resp.ok) {
          const json = await resp.json();
          if (!isCancelled && json.success && typeof json.content === 'string') {
            setFetchedFileContents((prev) => ({
              ...prev,
              [selectedFile.path]: json.content,
            }));
          }
        }
      } catch (err) {
        console.warn(`[FileSystemView] Failed to fetch content for ${selectedFile.path}:`, err);
      } finally {
        if (!isCancelled) setIsLoadingContent(false);
      }
    };

    fetchContent();
    return () => {
      isCancelled = true;
    };
  }, [selectedFile?.path, effectiveRunId, selectedFile?.content, analysisResult?.dataCleaningReport]);

  // Group files by folder
  const groupedFolders = useMemo(() => {
    const folders: Record<string, FileSystemVirtualFile[]> = {
      root: [],
      user_uploaded: [],
      slices: [],
      visualization: [],
      anomalies: [],
      forecasting: [],
      chart_specifications: [],
    };

    const q = searchQuery.trim().toLowerCase();

    for (const file of virtualFiles) {
      if (q && !file.path.toLowerCase().includes(q) && !file.name.toLowerCase().includes(q)) {
        continue;
      }
      const folderKey = file.folder in folders ? file.folder : 'root';
      folders[folderKey].push(file);
    }

    return folders;
  }, [virtualFiles, searchQuery]);

  const toggleFolder = (folderName: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  const handleCopyContent = async () => {
    if (!selectedFile) return;
    try {
      await navigator.clipboard.writeText(selectedFile.content);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy file content:', err);
    }
  };

  const handleDownloadFile = () => {
    if (!selectedFile) return;
    try {
      let mime = 'text/plain';
      if (selectedFile.type === 'markdown') mime = 'text/markdown';
      else if (selectedFile.type === 'csv') mime = 'text/csv';
      else if (selectedFile.type === 'json') mime = 'application/json';
      else if (selectedFile.type === 'python') mime = 'text/x-python';

      const blob = new Blob([selectedFile.content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download file:', err);
    }
  };

  // CSV parsing for tabular preview
  const parsedCsvData = useMemo(() => {
    if (selectedFile?.type !== 'csv' || !selectedFile.content) return null;

    const lines = selectedFile.content.trim().split('\n');
    if (lines.length === 0) return null;

    // Parse CSV line handling commas inside quotes
    const parseCsvLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, ''));
      return result;
    };

    const headers = parseCsvLine(lines[0]);
    const rows: string[][] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parsed = parseCsvLine(line);
      rows.push(parsed);
    }

    return { headers, rows };
  }, [selectedFile?.content, selectedFile?.type]);

  // Filtered rows for CSV
  const filteredCsvRows = useMemo(() => {
    if (!parsedCsvData) return [];
    if (!tableSearch.trim()) return parsedCsvData.rows;
    const q = tableSearch.toLowerCase();
    return parsedCsvData.rows.filter((row) =>
      row.some((cell) => cell.toLowerCase().includes(q))
    );
  }, [parsedCsvData, tableSearch]);

  const totalPages = Math.ceil(filteredCsvRows.length / tableRowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = tablePage * tableRowsPerPage;
    return filteredCsvRows.slice(start, start + tableRowsPerPage);
  }, [filteredCsvRows, tablePage, tableRowsPerPage]);

  const handleCopyCell = async (val: string, cellKey: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedCellId(cellKey);
      setTimeout(() => setCopiedCellId(null), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to render Markdown with syntax highlighting
  const renderMarkdown = (text: string): string => {
    if (!text) return '';

    // 1. Extract fenced code blocks first to protect against markdown collisions & apply hljs
    const codeBlocks: string[] = [];
    let html = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const language = lang?.trim() || 'plaintext';
      const highlighted = highlightCode(code, language);
      const blockHtml = `<pre class="fs-code-block custom-scrollbar"><code class="hljs language-${escapeHtml(language)}">${highlighted}</code></pre>`;
      codeBlocks.push(blockHtml);
      return `@@@FS_CODE_BLOCK_${codeBlocks.length - 1}@@@`;
    });

    // 2. Extract inline code
    const inlineCodes: string[] = [];
    html = html.replace(/`([^`]+)`/g, (_, code) => {
      inlineCodes.push(`<code class="fs-inline-code">${escapeHtml(code)}</code>`);
      return `@@@FS_INLINE_CODE_${inlineCodes.length - 1}@@@`;
    });

    // 3. Headers
    html = html
      .replace(/^### (.*$)/gim, '<h3 class="fs-md-h3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="fs-md-h2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="fs-md-h1">$1</h1>');

    // 4. Bold / italic
    html = html
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 5. Lists
    html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li class="fs-li">$1</li>');

    // 6. Tables
    html = html.replace(/((?:\|.+?\|\n?)+)/g, (match) => {
      const lines = match.trim().split('\n');
      if (lines.length < 2) return match;
      const rows = lines.map((line, idx) => {
        const cells = line.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1);
        if (cells.every((c) => c.trim().match(/^:?-+:?$/))) {
          return '';
        }
        const tag = idx === 0 ? 'th' : 'td';
        return `<tr>${cells.map((c) => `<${tag}>${c.trim()}</${tag}>`).join('')}</tr>`;
      }).filter(Boolean);
      return `<div class="fs-table-wrapper"><table class="fs-md-table">${rows.join('')}</table></div>`;
    });

    // 7. Paragraph breaks
    html = html.replace(/\n\n/g, '<div class="fs-p-break"></div>');

    // 8. Restore inline code
    inlineCodes.forEach((codeHtml, idx) => {
      html = html.replace(`@@@FS_INLINE_CODE_${idx}@@@`, codeHtml);
    });

    // 9. Restore code blocks
    codeBlocks.forEach((blockHtml, idx) => {
      html = html.replace(`@@@FS_CODE_BLOCK_${idx}@@@`, blockHtml);
    });

    return html;
  };

  const highlightedFileContent = useMemo(() => {
    if (!selectedFile) return '';
    if (selectedFile.type === 'python') {
      return highlightCode(selectedFile.content, 'python');
    }
    if (selectedFile.type === 'json') {
      return highlightCode(selectedFile.content, 'json');
    }
    return '';
  }, [selectedFile?.path, selectedFile?.content, selectedFile?.type]);

  return (
    <div className="file-system-container">
      {/* Left Pane: File Tree Explorer */}
      <aside className="file-system-sidebar">
        <div className="fs-sidebar-header">
          <div className="fs-sidebar-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>WORKSPACE FILE SYSTEM</span>
          </div>
          <div className="fs-sidebar-actions">
            <button
              className="fs-refresh-btn"
              title="Refresh files from workspace disk"
              onClick={() => setRefreshCounter((c) => c + 1)}
              disabled={isLoadingFiles}
            >
              <svg className={isLoadingFiles ? 'animate-spin' : ''} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
            <div className="fs-file-counter">{virtualFiles.length} files</div>
          </div>
        </div>

        <div className="fs-search-container">
          <input
            type="text"
            className="fs-search-input"
            placeholder="Filter files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="fs-search-clear" onClick={() => setSearchQuery('')}>
              ✕
            </button>
          )}
        </div>

        <div className="fs-tree-scroll custom-scrollbar">
          {/* Root Level: DATA_REPORT.md and root files */}
          {groupedFolders.root.length > 0 && (
            <div className="fs-folder-group">
              {groupedFolders.root.map((file) => (
                <div
                  key={file.path}
                  className={`fs-tree-item ${selectedFilePath === file.path ? 'active' : ''}`}
                  onClick={() => setSelectedFilePath(file.path)}
                >
                  <span className={`fs-file-icon fs-icon-${file.type}`}>
                    {file.type === 'markdown' ? 'MD' : file.type.toUpperCase()}
                  </span>
                  <span className="fs-item-name">{file.name}</span>
                  {file.path === 'DATA_REPORT.md' && <span className="fs-item-badge">Default</span>}
                </div>
              ))}
            </div>
          )}

          {/* user_uploaded/ */}
          <div className="fs-folder-group">
            <div className="fs-folder-header" onClick={() => toggleFolder('user_uploaded')}>
              <span className={`fs-caret ${collapsedFolders.user_uploaded ? 'collapsed' : ''}`}>▼</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <span className="fs-folder-name">user_uploaded/</span>
              <span className="fs-folder-count">{groupedFolders.user_uploaded.length}</span>
            </div>
            {!collapsedFolders.user_uploaded && (
              <div className="fs-folder-children">
                {groupedFolders.user_uploaded.length === 0 ? (
                  <div className="fs-empty-folder">No raw files in this run</div>
                ) : (
                  groupedFolders.user_uploaded.map((file) => (
                    <div
                      key={file.path}
                      className={`fs-tree-item ${selectedFilePath === file.path ? 'active' : ''}`}
                      onClick={() => setSelectedFilePath(file.path)}
                    >
                      <span className={`fs-file-icon fs-icon-${file.type}`}>
                        {file.type.toUpperCase()}
                      </span>
                      <span className="fs-item-name">{file.name}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* slices/ */}
          <div className="fs-folder-group">
            <div className="fs-folder-header" onClick={() => toggleFolder('slices')}>
              <span className={`fs-caret ${collapsedFolders.slices ? 'collapsed' : ''}`}>▼</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <span className="fs-folder-name">slices/</span>
              <span className="fs-folder-count">{groupedFolders.slices.length}</span>
            </div>
            {!collapsedFolders.slices && (
              <div className="fs-folder-children">
                {groupedFolders.slices.length === 0 ? (
                  <div className="fs-empty-folder">No slices generated yet</div>
                ) : (
                  groupedFolders.slices.map((file) => (
                    <div
                      key={file.path}
                      className={`fs-tree-item ${selectedFilePath === file.path ? 'active' : ''}`}
                      onClick={() => setSelectedFilePath(file.path)}
                    >
                      <span className={`fs-file-icon fs-icon-${file.type}`}>
                        {file.type.toUpperCase()}
                      </span>
                      <span className="fs-item-name">{file.name}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* visualization/ */}
          <div className="fs-folder-group">
            <div className="fs-folder-header" onClick={() => toggleFolder('visualization')}>
              <span className={`fs-caret ${collapsedFolders.visualization ? 'collapsed' : ''}`}>▼</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <span className="fs-folder-name">visualization/</span>
              <span className="fs-folder-count">{groupedFolders.visualization.length}</span>
            </div>
            {!collapsedFolders.visualization && (
              <div className="fs-folder-children">
                {groupedFolders.visualization.length === 0 ? (
                  <div className="fs-empty-folder">No visualization artifacts</div>
                ) : (
                  groupedFolders.visualization.map((file) => (
                    <div
                      key={file.path}
                      className={`fs-tree-item ${selectedFilePath === file.path ? 'active' : ''}`}
                      onClick={() => setSelectedFilePath(file.path)}
                    >
                      <span className={`fs-file-icon fs-icon-${file.type}`}>
                        {file.type.toUpperCase()}
                      </span>
                      <span className="fs-item-name">{file.name}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* anomalies/ */}
          <div className="fs-folder-group">
            <div className="fs-folder-header" onClick={() => toggleFolder('anomalies')}>
              <span className={`fs-caret ${collapsedFolders.anomalies ? 'collapsed' : ''}`}>▼</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <span className="fs-folder-name">anomalies/</span>
              <span className="fs-folder-count">{groupedFolders.anomalies.length}</span>
            </div>
            {!collapsedFolders.anomalies && (
              <div className="fs-folder-children">
                {groupedFolders.anomalies.length === 0 ? (
                  <div className="fs-empty-folder">No anomaly artifacts</div>
                ) : (
                  groupedFolders.anomalies.map((file) => (
                    <div
                      key={file.path}
                      className={`fs-tree-item ${selectedFilePath === file.path ? 'active' : ''}`}
                      onClick={() => setSelectedFilePath(file.path)}
                    >
                      <span className={`fs-file-icon fs-icon-${file.type}`}>
                        {file.type.toUpperCase()}
                      </span>
                      <span className="fs-item-name">{file.name}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* forecasting/ */}
          <div className="fs-folder-group">
            <div className="fs-folder-header" onClick={() => toggleFolder('forecasting')}>
              <span className={`fs-caret ${collapsedFolders.forecasting ? 'collapsed' : ''}`}>▼</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <span className="fs-folder-name">forecasting/</span>
              <span className="fs-folder-count">{groupedFolders.forecasting.length}</span>
            </div>
            {!collapsedFolders.forecasting && (
              <div className="fs-folder-children">
                {groupedFolders.forecasting.length === 0 ? (
                  <div className="fs-empty-folder">No forecasting artifacts</div>
                ) : (
                  groupedFolders.forecasting.map((file) => (
                    <div
                      key={file.path}
                      className={`fs-tree-item ${selectedFilePath === file.path ? 'active' : ''}`}
                      onClick={() => setSelectedFilePath(file.path)}
                    >
                      <span className={`fs-file-icon fs-icon-${file.type}`}>
                        {file.type.toUpperCase()}
                      </span>
                      <span className="fs-item-name">{file.name}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* chart_specifications/ */}
          <div className="fs-folder-group">
            <div className="fs-folder-header" onClick={() => toggleFolder('chart_specifications')}>
              <span className={`fs-caret ${collapsedFolders.chart_specifications ? 'collapsed' : ''}`}>▼</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <span className="fs-folder-name">chart_specifications/</span>
              <span className="fs-folder-count">{groupedFolders.chart_specifications.length}</span>
            </div>
            {!collapsedFolders.chart_specifications && (
              <div className="fs-folder-children">
                {groupedFolders.chart_specifications.map((file) => (
                  <div
                    key={file.path}
                    className={`fs-tree-item ${selectedFilePath === file.path ? 'active' : ''}`}
                    onClick={() => setSelectedFilePath(file.path)}
                  >
                    <span className="fs-file-icon fs-icon-md">MD</span>
                    <span className="fs-item-name">{file.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Right Pane: File Viewer */}
      <main className="file-system-viewer">
        <header className="fs-viewer-header">
          <div className="fs-viewer-path">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span className="fs-path-text">{selectedFile.path}</span>
            {selectedFile.size && <span className="fs-badge fs-badge-size">{selectedFile.size}</span>}
            {selectedFile.metadata && (
              <span className="fs-badge fs-badge-meta">{selectedFile.metadata}</span>
            )}
          </div>

          <div className="fs-viewer-actions">
            <button
              className="fs-header-btn"
              onClick={handleCopyContent}
              title="Copy file content to clipboard"
            >
              {copiedFeedback ? (
                <>
                  <span style={{ color: '#22c55e' }}>✓</span> Copied
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  Copy
                </>
              )}
            </button>

            <button
              className="fs-header-btn"
              onClick={handleDownloadFile}
              title="Download file to local machine"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download
            </button>
          </div>
        </header>

        <div className="fs-viewer-content custom-scrollbar">
          {/* Content Loading State */}
          {isLoadingContent && (!selectedFile.content || selectedFile.content.length === 0) ? (
            <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#888888', fontFamily: 'var(--font-mono, monospace)' }}>
              <span className="animate-spin" style={{ display: 'inline-block', marginRight: '8px', fontSize: '1.2rem' }}>⟳</span>
              Loading {selectedFile.name} from workspace...
            </div>
          ) : (
            <>
              {/* 1. Tabular CSV/TSV View */}
              {selectedFile.type === 'csv' && parsedCsvData && (
                <div className="fs-tabular-view">
                  <div className="fs-table-toolbar">
                    <div className="fs-table-metrics">
                      <span>{parsedCsvData.headers.length} columns</span>
                      <span className="fs-bullet">•</span>
                      <span>{parsedCsvData.rows.length} total rows</span>
                    </div>
                    <div className="fs-table-controls">
                      <input
                        type="text"
                        placeholder="Search table rows..."
                        className="fs-table-search"
                        value={tableSearch}
                        onChange={(e) => {
                          setTableSearch(e.target.value);
                          setTablePage(0);
                        }}
                      />
                      <select
                        className="fs-table-page-size"
                        value={tableRowsPerPage}
                        onChange={(e) => {
                          setTableRowsPerPage(Number(e.target.value));
                          setTablePage(0);
                        }}
                      >
                        <option value={15}>15 rows</option>
                        <option value={25}>25 rows</option>
                        <option value={50}>50 rows</option>
                        <option value={100}>100 rows</option>
                      </select>
                    </div>
                  </div>

                  <div className="fs-grid-scroll custom-scrollbar">
                    <table className="fs-data-grid">
                      <thead>
                        <tr>
                          <th className="fs-col-idx">#</th>
                          {parsedCsvData.headers.map((h, i) => (
                            <th key={i} title={h}>
                              <div className="fs-th-content">
                                <span className="fs-th-title">{h}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={parsedCsvData.headers.length + 1}
                              className="fs-td-empty"
                            >
                              No matching records found
                            </td>
                          </tr>
                        ) : (
                          paginatedRows.map((row, rIdx) => {
                            const globalIdx = tablePage * tableRowsPerPage + rIdx + 1;
                            return (
                              <tr key={rIdx}>
                                <td className="fs-col-idx">{globalIdx}</td>
                                {row.map((cell, cIdx) => {
                                  const cellKey = `${globalIdx}-${cIdx}`;
                                  const isCopied = copiedCellId === cellKey;
                                  return (
                                    <td
                                      key={cIdx}
                                      onClick={() => handleCopyCell(cell, cellKey)}
                                      title="Click to copy cell value"
                                      className={isCopied ? 'fs-cell-copied' : ''}
                                    >
                                      {isCopied ? 'Copied' : cell}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="fs-table-pagination">
                      <div className="fs-page-info">
                        Page {tablePage + 1} of {totalPages} ({filteredCsvRows.length} filtered records)
                      </div>
                      <div className="fs-pagination-buttons">
                        <button
                          className="fs-page-btn"
                          disabled={tablePage === 0}
                          onClick={() => setTablePage(0)}
                        >
                          «
                        </button>
                        <button
                          className="fs-page-btn"
                          disabled={tablePage === 0}
                          onClick={() => setTablePage((p) => p - 1)}
                        >
                          ‹
                        </button>
                        <span className="fs-current-page">{tablePage + 1}</span>
                        <button
                          className="fs-page-btn"
                          disabled={tablePage >= totalPages - 1}
                          onClick={() => setTablePage((p) => p + 1)}
                        >
                          ›
                        </button>
                        <button
                          className="fs-page-btn"
                          disabled={tablePage >= totalPages - 1}
                          onClick={() => setTablePage(totalPages - 1)}
                        >
                          »
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Empty / Unparsed CSV */}
              {selectedFile.type === 'csv' && !parsedCsvData && (
                <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#777777', fontFamily: 'var(--font-mono, monospace)' }}>
                  Empty or unparsed dataset: {selectedFile.name}
                </div>
              )}

              {/* 2. Markdown View */}
              {selectedFile.type === 'markdown' && (
                <div className="fs-markdown-container">
                  <div
                    className="fs-markdown-body"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedFile.content) }}
                  />
                </div>
              )}

              {/* 3. JSON View */}
              {selectedFile.type === 'json' && (
                <div className="fs-code-viewer">
                  <pre className="fs-code-pre custom-scrollbar">
                    <code
                      className="hljs language-json"
                      dangerouslySetInnerHTML={{ __html: highlightedFileContent }}
                    />
                  </pre>
                </div>
              )}

              {/* 4. Python View */}
              {selectedFile.type === 'python' && (
                <div className="fs-code-viewer">
                  <pre className="fs-code-pre custom-scrollbar">
                    <code
                      className="hljs language-python"
                      dangerouslySetInnerHTML={{ __html: highlightedFileContent }}
                    />
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};
