# Data Science Agent - Backend Server

This backend server handles server-side Python code execution for the Data Science Agent application.

## Requirements

- **Node.js** 18+ 
- **Python 3.8+** installed and accessible via `python3` command
- **Python packages**: pandas, numpy, matplotlib, scikit-learn

## Python Setup

Install required Python packages:

```bash
pip install pandas numpy matplotlib scikit-learn
```

Or use a virtual environment (recommended):

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install pandas numpy matplotlib scikit-learn
```

## Installation

```bash
cd Backend
npm install
```

## Development

```bash
npm run dev
```

The backend server will start on port 3001 by default.

## Production

```bash
npm run build
npm start
```

## Environment Variables

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment mode (development/production)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:5173)

## API Endpoints

### POST /api/execute-python
Execute Python code with provided data.

**Request:**
```json
{
  "code": "import pandas as pd\nprint('Hello')",
  "data": { "key": "value" },
  "options": {
    "timeout": 30000
  }
}
```

**Response:**
```json
{
  "success": true,
  "output": "Hello\n",
  "plots": ["base64..."],
  "executionTime": 1234
}
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Data Science Agent Backend is running",
  "timestamp": "2025-10-04T13:04:42.000Z"
}
```
