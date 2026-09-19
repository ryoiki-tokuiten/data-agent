
import type { Part } from '@google/genai';
import { SUPPORTED_CHART_TYPES, PIPELINE_TAB_TYPES } from './constants';


export type SupportedChartType = typeof SUPPORTED_CHART_TYPES[number];
export type AnalysisTabType = typeof PIPELINE_TAB_TYPES[number];
export type PipelineTabType = 'Agent Trace' | AnalysisTabType | 'File System';


export interface PCALoading {
  variable: string;
  loading: number;
}

export interface PCAComponent {
  componentId: number;
  explainedVarianceRatio: number;
  cumulativeExplainedVarianceRatio: number;
  loadings: PCALoading[];
}

export interface PCAProjectedPoint {
  [key: string]: number | string;
}

export interface PCAResults {
  explainedVarianceRatioPerComponent: number[];
  principalComponents: PCAComponent[];
  projectedData?: PCAProjectedPoint[];
  summary?: string;
}


export interface ACFPACFPoint {
  lag: number;
  value: number;
}

export interface ACFPACFResults {
  acfData: ACFPACFPoint[];
  pacfData: ACFPACFPoint[];
  confidenceIntervals?: {
    upper: number;
    lower: number;
  };
  summary?: string;
}


export interface ClusterCentroid {
  [feature: string]: number;
}

export interface ClusterSummary {
  clusterId: string | number;
  count: number;
  centroid?: ClusterCentroid | number[];
  description?: string;
  intraClusterSimilarity?: number;
  keyFeatures?: Array<{feature: string; importance?: number; characteristicValue?: string | number}>;
}

export interface ClusteringResults {
  method?: string;
  summaries: ClusterSummary[];
  silhouetteScore?: number;
  overallDescription?: string;
  noisePoints?: number;
}

// Sankey Diagram Types
export interface SankeyNode {
  name: string;
  [key: string]: any;
}
export interface SankeyLink {
  source: number;
  target: number;
  value: number;
}
export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

// TreeMap Types
export interface TreeMapNode {
  name: string;
  value?: number;
  children?: TreeMapNode[];
  [key: string]: any;
}

export interface TreeMapData {
  name: string;
  children: TreeMapNode[];
}

// PolarBar Types
export interface PolarBarData {
  [indexKey: string]: string | number;
}

export interface PolarBarDataKeys {
  indexBy: string;
  keys: string[];
}

// RadialBar Types
export interface RadialBarData {
  id: string;
  data: Array<{
    x: string;
    y: number;
  }>;
}


export interface RawDataInput {
  parts: Part[];
}


export interface VisualizationRequest {
  cleaningInteractionId?: string;
  dataCleaningReport?: string;
  inputParts?: any[];
}

export interface VisualizationGenerationResult {
  chartSpecs: ChartSpec[];
  pythonCodeSnippet?: string;
  executionLog?: string;
}


export interface ChartSpec {
  chartType: SupportedChartType;
  title: string;
  data: any[] | SankeyData | string;
  dataKeys: ChartDataKeys;
  description: string;
  trendline?: TrendlineSpec;
  confidenceInterval?: ConfidenceIntervalSpec;
}

export type RegressionType = 
  | 'linear'
  | 'polynomial'
  | 'exponential'
  | 'logarithmic'
  | 'power'
  | 'logistic';

export interface TrendlineSpec {
  data: any[];
  dataKeys: { xAxis: string; yAxis: string; };
  name?: string;
  rSquared?: number;
  pValue?: number;
  
  // Extended regression support
  type?: RegressionType;
  degree?: number; // For polynomial regression (2-8 recommended, higher possible but risk overfitting)
  equation?: string; // Human-readable equation (e.g., "y = 2.5x² - 3.2x + 10")
  coefficients?: number[]; // Regression coefficients [a, b, c, ...] for equation
  
  // Additional statistical metrics
  adjustedRSquared?: number;
  rmse?: number; // Root Mean Square Error
  mae?: number; // Mean Absolute Error
  
  // Confidence/prediction bands
  confidenceBands?: {
    upper: any[]; // Same structure as data
    lower: any[];
    level?: number; // e.g., 0.95 for 95% confidence
  };
}

export interface ConfidenceIntervalSpec {
  dataKey: string;
}


export type ChartDataKeys =
  | BarLineAreaDataKeys
  | PieDataKeys
  | ScatterDataKeys
  | DataTableDataKeys
  | ComposedChartDataKeys
  | HeatmapDataKeys
  | BoxPlotDataKeys
  | ViolinPlotDataKeys
  | StreamgraphDataKeys
  | BubbleChartDataKeys
  | PolarBarDataKeys
  | ChoroplethDataKeys
  | CalendarDataKeys
  | TimeRangeDataKeys
  | WaffleChartDataKeys
  | {};


export interface BarLineAreaDataKeys {
  xAxis: string;
  yAxis: string | string[];
  errorKey?: string;
}

export interface ComposedChartDataKeys {
  xAxis: string;
  [seriesTypeAndName: string]: string | string[] | undefined;
  errorKey?: string;
}

export interface PieDataKeys {
  nameKey: string;
  dataKey: string;
}

export interface ScatterDataKeys {
  xAxis: string;
  yAxis: string;
  zAxis?: string;
  clusterKey?: string;
  labelKey?: string;
}

export interface BubbleChartDataKeys {
  xAxis: string;
  yAxis: string;
  zAxis: string;
  categoryKey?: string;
  labelKey?: string;
}

export interface DataTableColumn {
  header: string;
  accessor: string;
}
export interface DataTableDataKeys {
  columns: DataTableColumn[];
}

export interface HeatmapDataKeys {
  rowLabels: string[];
  columnLabels: string[];

}

export interface BoxPlotDataKeys {
  groupKey: string; // Field name for the category/group
  valueKey: string; // Field name for the numeric value
  muKey?: string; // Optional: mean
  sdKey?: string; // Optional: standard deviation
  nKey?: string; // Optional: sample size
  subgroupKey?: string; // Optional: subgroup for split box plots
}

export interface ViolinPlotDataKeys {
  categoryKey: string;
  yKey: string; // Array of numeric values for each category
}

export interface StreamgraphDataKeys {
  xAxis: string;
  streamKeys: string[];
}

export interface ChoroplethDataKeys {
  idKey: string;
  valueKey: string;
  featuresKey?: string; // Optional key for GeoJSON features in data
}

export type ChoroplethData = Record<string, any>;

export interface CalendarDataKeys {
  dateKey: string;
  valueKey: string;
}

export interface CalendarDataItem {
  day: string; // Date in YYYY-MM-DD format
  value: number;
}

export interface TimeRangeDataKeys {
  dateKey: string;
  valueKey: string;
}

export type TimeRangeDataItem = CalendarDataItem;

export interface WaffleChartDataKeys {
  idKey: string;
  labelKey: string;
  valueKey: string;
}

export interface WaffleChartDataItem {
  id: string;
  label: string;
  value: number;
  color?: string;
}


export type AnomalyType = 
  | 'univariate_outlier'
  | 'multivariate_outlier'
  | 'temporal_break'
  | 'correlation_anomaly'
  | 'distributional_shift'
  | 'missing_data_pattern'
  | 'clustering_anomaly'
  | 'seasonal_anomaly';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface StatisticalMetrics {
  zScore?: number;
  pValue?: number;
  confidence?: number; // 0-100%
  expectedValue?: number;
  actualValue?: number;
  deviationPercent?: number;
  anomalyScore?: number; // 0-1, normalized anomaly score from algorithms
  [key: string]: any; // Allow additional algorithm-specific metrics
}

export interface AnomalyRelatedData {
  rowIndices?: number[]; // Indices of affected rows in mainDataTable
  dataPoints?: Array<Record<string, any>>; // Small sample of related data
  visualizationData?: any; // Pre-computed data for drill-down visualizations
  temporalContext?: {
    timestamp?: string;
    window?: string; // e.g., "2024-01-01 to 2024-01-07"
  };
}

export interface Anomaly {
  id: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Informational';
  anomalyType: AnomalyType;
  affectedVariables: string[]; // List of variable names involved
  dataContext: string | Record<string, any>;
  implication?: string;
  suggestedVisualization?: string;
  
  // Enhanced fields
  anomalyScore?: number; // 0-1, higher = more anomalous
  statisticalMetrics?: StatisticalMetrics;
  relatedData?: AnomalyRelatedData;
  riskLevel?: RiskLevel;
  recommendedActions?: string[]; // Specific actionable steps
  causalHypotheses?: string[]; // Potential root causes
  historicalContext?: string; // Similar past anomalies
  domainImpact?: string; // Business/domain-specific impact explanation
}

export interface AnomalySummaryStats {
  totalAnomalies: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  byVariable: Record<string, number>;
  highestAnomalyScore: number;
  criticalCount: number;
}

export interface AnomalyReport {
  overallAssessment: string;
  detectedAnomalies: Anomaly[];
  summaryStats?: AnomalySummaryStats;
  detectionAlgorithms?: string[]; // List of algorithms used
  executionLog?: string; // Python execution log/output
  temporalRange?: {
    start?: string;
    end?: string;
  };
}


// Phase 1: Model Proposal by AI
export interface ForecastingModelProposal {
  modelIdSuggestion: string; // e.g., "ARIMA_Sales_Target1"
  modelName: string; // e.g., "ARIMA(1,1,1) for Total Sales"
  modelType: 'Time Series' | 'Regression' | 'Classification' | 'Clustering' | 'NLP-based' | 'Other';
  targetVariable: string; // The exact column/variable name from dataset slices or raw files
  description: string; // AI's description of model choice & suitability
  modelParameters?: Record<string, any>; // Optional: suggested initial parameters
  featureColumns?: string[]; // Optional: List of feature column names from dataset slices
}

// Phase 2: Detailed Model Output after Code Execution
export interface ForecastingModelDetail extends ForecastingModelProposal {
  // Fields from proposal are inherited
  interpretationOfResults?: string; // AI's textual summary of its process, findings, plot
  pythonCodeSnippet: string; // The Python code Gemini wrote and executed
  executionLog?: string; // Stdout/stderr from code execution, including printed metrics
  plotBase64?: string | null; // The Matplotlib plot image, if generated
  evaluationMetrics?: Record<string, number | string>; // Metrics extracted from executionLog or interpretation
  forecasts?: Array<Record<string, any>>; // Sample forecasts extracted or interpreted
  error?: string | null; // Errors specific to this model's processing/execution
  diagnosticCharts?: ChartSpec[]; // Optional diagnostic charts related to this model
}

export interface ForecastingReport {
  overallSummary: string;
  identifiedTargetVariables: string[];
  dataExplorationHighlights?: string;
  models: ForecastingModelDetail[];
  limitationsAndAssumptions?: string;
}

export interface AnalysisConfig {
  modelId: string;
  enabledTabs: AnalysisTabType[];
}

export type PipelineSubPartStatus = 'idle' | 'pending' | 'loading' | 'success' | 'error' | 'skipped';

export interface LiveExecutionStep {
  id: string;
  stage: string;
  type: 'thought' | 'code_execution_call' | 'code_execution_result' | 'text' | 'status' | 'google_search' | 'url_context' | 'function_call' | 'function_result' | 'image_output';
  code?: string;
  output?: string;
  text?: string;
  functionName?: string;
  functionArgs?: Record<string, any>;
  functionResult?: any;
  citations?: Array<{ title: string; url: string }>;
  imageOutput?: { data: string; mimeType: string; url?: string };
  timestamp: Date;
}


export interface AnalysisResult {
  id: string;
  runId?: string;
  modelId: string;
  enabledTabs: AnalysisTabType[];
  visualizations: ChartSpec[] | null;
  error: string | null;
  errorDetails?: string | null;
  suggestion?: string | null;

  status: 'idle' | 'pending' | 'data_cleaning' | 'insights_processing' | 'success' | 'error' | 'partial_success';

  dataCleaningReport?: string | null;
  cleaningInteractionId?: string | null;
  cleaningPythonCode?: string | null;
  cleaningExecutionLog?: string | null;
  visualizationPythonCode?: string | null;
  visualizationExecutionLog?: string | null;

  anomalyReport?: AnomalyReport | null;
  anomalyReportStatus?: PipelineSubPartStatus;
  anomalyReportError?: string | null;
  anomalyReportPythonCode?: string | null;
  anomalyReportExecutionLog?: string | null;

  forecastingReport?: ForecastingReport | null;
  forecastingReportStatus?: PipelineSubPartStatus;
  forecastingReportError?: string | null;

  liveExecutionSteps?: LiveExecutionStep[];
}

export interface DataCleaningReportResult {
  reportMarkdown: string;
  interactionId: string;
  pythonCodeSnippet?: string | null;
  executionLog?: string | null;
}

// State-related types moved from App.tsx
export interface FullScreenChartInfo {
  spec: ChartSpec;
  originalIndex: number;
  modelIdForContext?: string;
  isDiagnostic?: boolean;
  section?: 'visualizations' | 'forecasting' | 'anomalies';
}

export interface FullScreenImageInfo {
    src: string;
    alt: string;
}

export interface FullScreenModelCardInfo {
    modelDetail: ForecastingModelDetail;
    modelIndex: number;
}

export interface FullScreenCodePanelInfo {
    pythonCode: string;
    executionLog: string;
    tabName: string;
}

export interface FullScreenDataInfo {
    title: string;
    data: any;
    pythonCode?: string | null;
    executionLog?: string | null;
    tabName?: string;
}

export interface CurrentInsightContextValue {
  dataCleaningReport?: string | null;
  cleaningInteractionId?: string | null;
  modelDetail?: ForecastingModelDetail | null;
  originalModelId: string;
}

export interface ExportedFileMetadata {
  name: string;
  type: string;
  size: number;
  lastModified: number;
}

export interface ExportedAnalysisState {
  version: string;
  exportedAt: string;
  filesMetadata: ExportedFileMetadata[];
  focusAndMetricsInput: string;
  analysisConfig: AnalysisConfig;
  analysisResult: AnalysisResult | null;
  activePipelineTab?: PipelineTabType;
  executionLogs?: Record<string, any>;
}
