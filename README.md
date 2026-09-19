# Data Science Agent

An autonomous, full-stack AI data science and analytics platform that automates exploratory data analysis (EDA), data cleaning, statistical modeling, anomaly detection, predictive forecasting, and interactive visualization generation using Google Gemini.

## Current Capabilities Include

- **Multi-Format Ingestion**: Supports CSV, Parquet, JSON, Apache Arrow, Feather, SQLite (`.db`, `.sqlite`), and Excel spreadsheets (`.xlsx`, `.xls`).
- **Autonomous Profiling & Sanitization**: Inspects dataset topology, distributions, nullability, and anomalies. Generates verified physical data slices into `./slices/` and produces an analytical dossier (`DATA_REPORT.md`).
- **25+ Interactive Visualizations**: Generates rich, production-grade visualizations powered by Recharts, Plotly, and Nivo:
  - *Statistical*: Box plots, Violin plots, Scatter plots with trendlines & confidence bands, Histograms, Frequency Spectrum plots.
  - *Hierarchical & Flow*: Sankey diagrams, Treemaps, Sunburst / Radial bars.
  - *Temporal & Multi-Dimensional*: Time-range calendars, Streamgraphs, Bubble charts, Polar bars, Waffle charts.
  - *Geospatial & Relational*: Choropleth maps, Correlation heatmaps, Composed charts.
- **Statistical Anomaly Detection**: Identifies point, contextual, and collective anomalies using Isolation Forest, Local Outlier Factor (LOF), Z-score/IQR distributions, and temporal spikes with risk scoring and root-cause explanations.
- **Predictive Modeling & Forecasting**: Trains and benchmarks models (Gradient Boosting, Random Forest, Linear/Polynomial regression, Prophet for time-series), generating diagnostics, feature importance curves, and residual distributions.
- **Sandboxed Local Runtime**: Node.js/Express backend executes Python code within isolated workspaces (`workspace/<runId>/`) backed by a local virtual environment.
- **Transparent Agent Trace**: Full visibility into the agent's thought process, bash commands, tool invocations, and live terminal outputs.
- **Context-Aware AI Chat**: Interactive chat assistant grounded in the generated charts, dataset schema, and statistical findings.

I plan to implement a well-thought abstract harness layer around the data-science domain specific stuff in future. 


## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Zustand, Recharts, React-Plotly, Nivo, Lucide / React-Icons |
| **Client Data Engine** | Apache Arrow, Parquet-WASM, SQL.js (WASM SQLite) |
| **Backend Runtime** | Node.js, Express, TypeScript, Multer, Child Process execution |
| **Python Environment** | Python 3.10+, pandas, numpy, scipy, scikit-learn, statsmodels, prophet, matplotlib |
| **AI Engine** | Google GenAI SDK (`@google/genai`), Gemini 3.1 Pro, Gemini 3.8 Flash, Gemini 3.5 Flash Lite |


## Getting Started

### Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Python**: 3.10 or higher
- **Gemini API Key**: From [Google AI Studio](https://aistudio.google.com/)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/ryoiki-tokuiten/data-agent.git
cd data-agent

# Install frontend and backend npm packages
npm run setup
```

### 2. Set Up Python Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Environment Configuration

Copy the example environment file and add your API key:

```bash
cp .env.example .env
```

Edit `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

*(You can also input your Gemini API key directly in the web UI at any time.)*

### 4. Run Development Servers

Start both the Vite frontend (`http://localhost:5173`) and the Express backend (`http://localhost:3001`):

```bash
npm run dev
```

Alternatively, start them individually:

```bash
npm run dev:frontend   # Starts Vite on port 5173
npm run dev:backend    # Starts Express on port 3001
```

## License

This project is licensed under the MIT License.
