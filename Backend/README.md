# Data Science Agent — Backend Runtime

The backend service powers isolated workspace management and local Python/Bash script execution for the Data Science Agent.

---

## Overview

- **Isolated Execution per Run**: Scaffolds isolated workspaces (`workspace/<runId>/`) containing `user_uploaded/`, `slices/`, `visualization/`, `anomalies/`, and `forecasting/`.
- **Python Virtual Environment Integration**: Executes commands directly within the local Python virtual environment (`venv/`), giving the agent full access to `pandas`, `numpy`, `scipy`, `scikit-learn`, `matplotlib`, and system utilities.
- **Output Capping**: Caps command stdout/stderr to 8,000 tokens (~32,000 characters) to prevent context buffer overflows in LLM tool calling.
- **Run-Scoped File Browser**: Serves real-time workspace tree listings and file contents to the frontend's file system explorer.

---

## Requirements

- **Node.js**: 18+
- **Python**: 3.10+ with packages installed from the root `requirements.txt`
- **Linux / macOS / WSL**: Bash shell environment

---

## Installation & Setup

From the repository root:

```bash
# Setup Python virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Install backend dependencies
cd Backend
npm install
```

---

## Running the Server

### Development
```bash
npm run dev
```
Starts with `nodemon` and `ts-node` on port `3001` (with live reload).

### Production
```bash
npm run build
npm start
```

---

## Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Server listening port | `3001` |
| `NODE_ENV` | Environment mode (`development` / `production`) | `development` |
| `FRONTEND_URL` | Allowed frontend origin for CORS | `http://localhost:5173` |

---

## API Endpoints

### Health Check
- **`GET /api/health`**
  - Returns backend status, active run ID, workspace base path, and Python venv path.

### Workspace & Run Management
- **`POST /api/run/init`**
  - Initializes isolated subdirectories for a new run session.
  - **Body**: `{ "runId": "run_..." }`

- **`POST /api/files/upload`**
  - Multi-part form upload storing raw files directly into `workspace/<runId>/user_uploaded/`.
  - **Query / Header**: `runId` or `x-run-id`
  - **Payload**: `multipart/form-data` with key `files`

- **`GET /api/workspace/files?runId=<id>`**
  - Returns a recursive tree of files, sizes, modification dates, and folder categories for the designated run.

- **`GET /api/workspace/file-content?path=<relPath>&runId=<id>`**
  - Returns text content of a file within the run workspace (or a binary descriptor for `.parquet`, `.pkl`, `.png`, etc.).

### Command Execution
- **`POST /api/bash`**
  - Executes a bash command in the run's workspace directory with `venv/bin` in `PATH`.
  - **Body**: `{ "command": "python3 -c \"...\"", "runId": "run_...", "cwd"?: "string", "timeoutMs"?: 120000 }`
  - **Response**: `{ "success": boolean, "exitCode": number, "stdout": string, "stderr": string, "output": string }`
