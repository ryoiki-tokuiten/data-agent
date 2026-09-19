export const EXPORT_VERSION = "1.0.0";

export const AVAILABLE_MODELS = [
  { id: "gemini-3.1-pro-preview", displayName: "Gemini 3 Pro" },
  { id: "gemini-3.8-flash", displayName: "Gemini 3.8 Flash" },
  { id: "gemini-3.5-flash-lite", displayName: "Gemini 3.5 Flash Lite" },
  { id: "gemma-4-31b-it", displayName: "Gemma4-31B" },
  { id: "gemma-4-26b-a4b-it", displayName: "Gemma4-26B" },
  { id: "gemini-2.5-flash-lite", displayName: "Gemini 2.5 Flash Lite" },
];

export const DEFAULT_MODEL_ID = "gemini-3.5-flash-lite";
export const MAX_FILES = 20;
export const MAX_FILE_SIZE_MB = 100;
export const ACCEPTED_MIME_TYPES = [
  'text/plain',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'application/json',
  'application/xml',
  'text/xml',
  'application/x-yaml',
  'text/yaml',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/octet-stream',
  'application/x-parquet',
  '.parquet',
  'application/vnd.apache.arrow.file',
  '.feather',
  'application/vnd.sqlite3',
  'application/x-sqlite3',
  '.db',
  '.sqlite',
];

export const SUPPORTED_CHART_TYPES = [
  "BarChart",
  "LineChart",
  "PieChart",
  "ScatterPlot",
  "AreaChart",
  "PolarBar",
  "ComposedChart",
  "DataTable",
  "Heatmap",
  "BoxPlot",
  "ViolinPlot",
  "Streamgraph",
  "StackedBarChart",
  "BubbleChart",
  "CorrelationHeatmap",
  "ComplexPlanePlot",
  "FrequencySpectrumPlot",
  "MultiLineRateOfChangePlot",
  "RadialBar",
  "SankeyDiagram",
  "TreeMap",
  "Choropleth",
  "Calendar",
  "TimeRange",
  "WaffleChart",
] as const;


export const PIPELINE_TAB_TYPES = ["Visualizations", "Anomalies", "Forecasting"] as const;


export const CHART_COLORS = [
  '#8AB4F8', // Google Sky Blue
  '#F28B82', // Google Soft Coral / Terracotta
  '#81C995', // Google Mint Emerald
  '#FDD663', // Google Warm Amber / Gold
  '#C58AF9', // Google Lavender Amethyst
  '#78D9EC', // Google Crisp Aqua / Cyan
  '#FCAD70', // Google Sunset Apricot
  '#FF8BCB', // Google Rose Pink
  '#A8DAB5', // Google Sage Leaf
  '#939BF5', // Google Periwinkle Indigo
  '#669DF6', // Google Azure Blue
  '#EA4335', // Google Warm Red
  '#34A853', // Google Deep Emerald
  '#FBBC04', // Google Solar Yellow
  '#AF5CF7', // Google Orchid Violet
  '#24C1E0', // Google Ocean Teal
  '#FA7B17', // Google Sunset Orange
  '#F439A0', // Google Magenta Rose
];

/**
 * Convert hex color string to rgba format with specified opacity.
 */
export const hexToRgba = (hex: string, alpha: number = 1): string => {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
};

