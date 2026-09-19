
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import React from 'react';
import { Part } from '@google/genai';
import { GeminiService } from '../services/geminiService';
import type { 
    ChartSpec, 
    PipelineTabType, 
    AnalysisTabType, 
    FullScreenImageInfo, 
    FullScreenModelCardInfo, 
    FullScreenCodePanelInfo, 
    CurrentInsightContextValue, 
    ExportedAnalysisState, 
    ForecastingModelDetail, 
    AnomalyType, 
    AnalysisResult,
    FullScreenDataInfo,
    LiveExecutionStep,
    AnalysisConfig,
    DataCleaningReportResult
} from '../types';
import { MAX_FILES, MAX_FILE_SIZE_MB, DEFAULT_MODEL_ID, PIPELINE_TAB_TYPES, EXPORT_VERSION } from '../utils/constants';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ~~~~~~ UTILITY FUNCTIONS ~~~~~~~~~
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/**
 * Prepares input parts by saving files directly to the local backend workspace.
 */
const prepareInputParts = async (
    currentFiles: File[],
    geminiService?: GeminiService | null,
    onProgress?: (step: LiveExecutionStep) => void,
    runId?: string
): Promise<any[]> => {
    const parts: any[] = [];
    if (!geminiService || currentFiles.length === 0) return parts;

    for (const file of currentFiles) {
        onProgress?.({
            id: `upload-${file.name}-${Date.now()}`,
            stage: 'Data Cleaning & Profiling',
            type: 'status',
            text: `Saving "${file.name}" to local workspace...`,
            timestamp: new Date()
        });

        const uploadRes = await geminiService.uploadFile(file, (statusMsg) => {
            onProgress?.({
                id: `upload-status-${file.name}-${Date.now()}`,
                stage: 'Data Cleaning & Profiling',
                type: 'status',
                text: statusMsg,
                timestamp: new Date()
            });
        }, runId);

        parts.push({
            name: uploadRes.name,
            size: uploadRes.size,
            relativePath: uploadRes.relativePath
        });
    }

    return parts;
};


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ~~~~~~~~ APP STORE (Core) ~~~~~~~~
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

interface AppState {
    geminiApiKey: string;
    isApiKeySet: boolean;
    geminiService: GeminiService | null;
    isProcessingAnyPipeline: boolean;
    modalErrorTitle: string | null;
    modalErrorContent: React.ReactNode | null;
    setApiKeys: (geminiKey: string, fromLocalStorage?: boolean) => void;
    clearApiKeys: () => void;
    setIsProcessing: (isProcessing: boolean) => void;
    setModalError: (title: string, content: React.ReactNode) => void;
    clearModalError: () => void;
    resetApp: () => void;
}

const initialAppState = {
    geminiApiKey: '',
    isApiKeySet: false,
    geminiService: null,
    isProcessingAnyPipeline: false,
    modalErrorTitle: null,
    modalErrorContent: null,
};

export const useAppStore = create<AppState>((set, get) => ({
    ...initialAppState,
    setApiKeys: (geminiKey, fromLocalStorage = false) => {
        try {
            const geminiService = geminiKey ? new GeminiService(geminiKey) : null;
            set({
                geminiApiKey: geminiKey || '',
                geminiService,
                isApiKeySet: true,
            });
            if (!fromLocalStorage) {
                if (geminiKey) localStorage.setItem('geminiApiKey', geminiKey);
            }
        } catch (error) {
            console.error('Error setting API key:', error);
            get().setModalError("API Key Error", "Could not initialize Gemini service. Please ensure your API key is valid.");
            if (fromLocalStorage) {
                localStorage.removeItem('geminiApiKey');
                set({
                    geminiApiKey: '',
                    isApiKeySet: false,
                    geminiService: null,
                });
            }
        }
    },
    clearApiKeys: () => {
        set({
            geminiApiKey: '',
            isApiKeySet: false,
            geminiService: null,
        });
        localStorage.removeItem('geminiApiKey');
    },
    setIsProcessing: (isProcessing) => set({ isProcessingAnyPipeline: isProcessing }),
    setModalError: (title, content) => set({ modalErrorTitle: title, modalErrorContent: content }),
    clearModalError: () => set({ modalErrorTitle: null, modalErrorContent: null }),
    resetApp: () => set(initialAppState),
}));

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ~~~~~~ FILE STORE (Inputs) ~~~~~~~
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

interface FileState {
    files: File[];
    focusAndMetricsInput: string;
    addFiles: (newFiles: FileList) => void;
    removeFile: (fileNameToRemove: string) => void;
    setFocusAndMetricsInput: (value: string) => void;
    resetFileState: () => void;
}

const initialFileState = {
    files: [],
    focusAndMetricsInput: '',
};

export const useFileStore = create<FileState>((set, get) => ({
    ...initialFileState,
    addFiles: (selectedFiles) => {
        const newFiles = Array.from(selectedFiles);
        const { files } = get();

        if (files.length + newFiles.length > MAX_FILES) {
            useAppStore.getState().setModalError("File Limit Exceeded", `You can upload a maximum of ${MAX_FILES} files.`);
            return;
        }
        for (const file of newFiles) {
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                useAppStore.getState().setModalError("File Size Exceeded", `File ${file.name} exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`);
                return;
            }
        }
        set(state => ({ files: [...state.files, ...newFiles].slice(0, MAX_FILES) }));
        useAppStore.getState().clearModalError();
    },
    removeFile: (fileNameToRemove) => set(state => ({ files: state.files.filter(file => file.name !== fileNameToRemove) })),
    setFocusAndMetricsInput: (value) => set({ focusAndMetricsInput: value }),
    resetFileState: () => set(initialFileState),
}));

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ~~~~~~ ANALYSIS STORE (Results) ~~~~~
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const initialAnalysisConfig: AnalysisConfig = {
    modelId: DEFAULT_MODEL_ID,
    enabledTabs: [...PIPELINE_TAB_TYPES],
};

interface PipelineState {
    analysisConfig: AnalysisConfig;
    analysisResult: AnalysisResult | null;
    activePipelineTab: PipelineTabType;
    currentRunId: string | null;

    setAnalysisModelId: (modelId: string) => void;
    toggleAnalysisTab: (tab: AnalysisTabType, checked: boolean) => void;
    setActivePipelineTab: (tab: PipelineTabType) => void;
    setCurrentRunId: (runId: string) => void;

    runAnalysis: () => Promise<void>;

    addVisualization: (chartSpec: ChartSpec) => void;
    addForecastingModel: (modelDetail: ForecastingModelDetail) => void;
    removeVisualization: (vizIndex: number) => void;
    removeForecastingModel: (modelIndex: number) => void;
    updateVisualization: (vizIndex: number, chartSpec: ChartSpec) => void;
    updateVisualizationData: (vizIndex: number, newData: any[]) => void;

    exportState: () => void;
    resetPipelineState: () => void;
}

const initialPipelineState = {
    analysisConfig: initialAnalysisConfig,
    analysisResult: null as AnalysisResult | null,
    activePipelineTab: 'Agent Trace' as PipelineTabType,
    currentRunId: null as string | null,
};

export const usePipelineStore = create(subscribeWithSelector<PipelineState>((set, get) => ({
    ...initialPipelineState,
    setAnalysisModelId: (modelId) => set(state => ({
        analysisConfig: { ...state.analysisConfig, modelId }
    })),
    toggleAnalysisTab: (tab, checked) => set(state => {
        const newEnabled = checked
            ? [...new Set([...state.analysisConfig.enabledTabs, tab])]
            : state.analysisConfig.enabledTabs.filter(t => t !== tab);
        return {
            analysisConfig: { ...state.analysisConfig, enabledTabs: newEnabled }
        };
    }),
    setActivePipelineTab: (tab) => set({ activePipelineTab: tab }),
    setCurrentRunId: (runId) => set({ currentRunId: runId }),

    runAnalysis: async () => {
        const { geminiService, setModalError } = useAppStore.getState();
        const { files, focusAndMetricsInput } = useFileStore.getState();
        const { analysisConfig } = get();

        setModalError('', null);

        // Generate clean, timestamped Run ID for run isolation
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        const runId = `run_${timestamp}_${Math.random().toString(36).substring(2, 6)}`;
        if (typeof window !== 'undefined') {
            (window as any).__activeRunId = runId;
        }
        geminiService?.setActiveRunId(runId);
        set({ currentRunId: runId });

        // Pre-initialize isolated run workspace directories on backend
        try {
            await fetch('http://localhost:3001/api/run/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ runId })
            });
        } catch (initErr) {
            console.warn('[PipelineStore] Failed to pre-init run directory on backend:', initErr);
        }

        const analysisId = `analysis-${Date.now()}`;
        const initialResult: AnalysisResult = {
            id: analysisId,
            runId: runId,
            modelId: analysisConfig.modelId,
            enabledTabs: analysisConfig.enabledTabs,
            visualizations: null,
            error: null,
            errorDetails: null,
            suggestion: null,
            dataCleaningReport: null,
            cleaningInteractionId: null,
            cleaningPythonCode: null,
            cleaningExecutionLog: null,
            visualizationPythonCode: null,
            visualizationExecutionLog: null,
            anomalyReport: null,
            anomalyReportStatus: analysisConfig.enabledTabs.includes("Anomalies") ? 'pending' : 'skipped',
            anomalyReportError: null,
            forecastingReport: null,
            forecastingReportStatus: analysisConfig.enabledTabs.includes("Forecasting") ? 'pending' : 'skipped',
            forecastingReportError: null,
            liveExecutionSteps: [],
            status: 'pending'
        };

        set({
            analysisResult: initialResult,
            activePipelineTab: 'Agent Trace'
        });

        const handleProgress = (step: LiveExecutionStep) => {
            set(state => {
                if (!state.analysisResult) return state;
                const existing = state.analysisResult.liveExecutionSteps || [];
                const existingIdx = existing.findIndex(s => s.id === step.id);
                let updated: LiveExecutionStep[];
                if (existingIdx >= 0) {
                    updated = [...existing];
                    updated[existingIdx] = step;
                } else {
                    updated = [...existing, step];
                }
                return {
                    analysisResult: {
                        ...state.analysisResult,
                        liveExecutionSteps: updated
                    }
                };
            });
        };

        // Emit initial step to inform the user that the pipeline is active
        handleProgress({
            id: `init-pipeline-${Date.now()}`,
            stage: 'Data Cleaning & Profiling',
            type: 'status',
            text: `Agent pipeline started with model ${analysisConfig.modelId}. Initializing data lakehouse and profiling environment...`,
            timestamp: new Date()
        });

        let preparedInputParts: Part[];
        try {
            preparedInputParts = await prepareInputParts(files, geminiService, handleProgress, runId);
        } catch (prepError: any) {
            setModalError(prepError.message || 'Error Preparing Input', prepError.stack || 'Check file selection or text.');
            set(state => {
                const errResult = state.analysisResult ? { ...state.analysisResult, status: 'error' as const, error: prepError.message || 'Input preparation failed' } : null;
                return {
                    analysisResult: errResult,
                };
            });
            return;
        }

        let cleaningResult: DataCleaningReportResult | null = null;

        try {
            cleaningResult = await geminiService!.getDataCleaningReport(
                { parts: preparedInputParts },
                analysisConfig.modelId,
                focusAndMetricsInput,
                handleProgress
            );
        } catch (cleaningError: any) {
            const { message: cleanErrMsg } = GeminiService.unwrapGoogleError(cleaningError);
            console.error('[Cleaning] Data cleaning failed:', cleanErrMsg, cleaningError);
            setModalError('Data Cleaning Failed', cleanErrMsg);
            set(state => {
                const errResult = state.analysisResult ? { ...state.analysisResult, status: 'error' as const, error: cleanErrMsg } : null;
                return {
                    analysisResult: errResult,
                };
            });
            return;
        }

        const updateSubPart = (updateFn: (prev: AnalysisResult) => Partial<AnalysisResult>) => {
            set(state => {
                if (!state.analysisResult) return state;
                const updated = { ...state.analysisResult, ...updateFn(state.analysisResult) };
                return {
                    analysisResult: updated,
                };
            });
        };

        updateSubPart(() => ({
            dataCleaningReport: cleaningResult?.reportMarkdown || null,
            cleaningInteractionId: cleaningResult?.interactionId || null,
            cleaningPythonCode: cleaningResult?.pythonCodeSnippet || null,
            cleaningExecutionLog: cleaningResult?.executionLog || null,
            status: 'insights_processing'
        }));

        try {
            if (analysisConfig.enabledTabs.includes("Visualizations")) {
                handleProgress({
                    id: `viz-init-${Date.now()}`,
                    stage: 'Visualizations',
                    type: 'status',
                    text: 'Visualization Agent active: inspecting lakehouse data slices and generating chart specifications...',
                    timestamp: new Date()
                });
                try {
                    const vizResult = await geminiService!.generateVisualizations(
                        { 
                            cleaningInteractionId: cleaningResult?.interactionId,
                            dataCleaningReport: cleaningResult?.reportMarkdown,
                            inputParts: preparedInputParts
                        }, 
                        analysisConfig.modelId,
                        handleProgress
                    );
                    updateSubPart(() => ({
                        visualizations: vizResult.chartSpecs,
                        visualizationPythonCode: vizResult.pythonCodeSnippet || null,
                        visualizationExecutionLog: vizResult.executionLog || null,
                        error: null
                    }));
                } catch (vizGenError: any) {
                    const { message: vizMsg } = GeminiService.unwrapGoogleError(vizGenError);
                    updateSubPart(() => ({
                        visualizations: null,
                        visualizationPythonCode: null,
                        visualizationExecutionLog: null,
                        error: vizMsg,
                        errorDetails: vizGenError.details,
                        suggestion: vizGenError.suggestion
                    }));
                }
            }

            if (analysisConfig.enabledTabs.includes("Forecasting")) {
                handleProgress({
                    id: `forecast-init-${Date.now()}`,
                    stage: 'Forecasting',
                    type: 'status',
                    text: 'Forecasting Agent active: proposing predictive models and engineering features...',
                    timestamp: new Date()
                });
                updateSubPart(() => ({ forecastingReportStatus: 'loading' }));
                try {
                    const report = await geminiService!.getForecastingReport(
                        focusAndMetricsInput, 
                        analysisConfig.modelId,
                        handleProgress,
                        cleaningResult?.interactionId,
                        cleaningResult?.reportMarkdown,
                        preparedInputParts
                    );
                    updateSubPart(() => ({ forecastingReport: report, forecastingReportStatus: 'success' }));
                } catch (err: any) {
                    const { message: forecastMsg } = GeminiService.unwrapGoogleError(err);
                    updateSubPart(() => ({ forecastingReport: null, forecastingReportStatus: 'error', forecastingReportError: forecastMsg }));
                }
            }

            if (analysisConfig.enabledTabs.includes("Anomalies")) {
                handleProgress({
                    id: `anomaly-init-${Date.now()}`,
                    stage: 'Anomaly Detection',
                    type: 'status',
                    text: 'Anomaly Detection Agent active: evaluating statistical outliers and multivariate slices...',
                    timestamp: new Date()
                });
                updateSubPart(() => ({ anomalyReportStatus: 'loading' }));
                try {
                    const report = await geminiService!.detectAnomalies(
                        focusAndMetricsInput, 
                        analysisConfig.modelId,
                        handleProgress,
                        cleaningResult?.interactionId,
                        cleaningResult?.reportMarkdown,
                        preparedInputParts
                    );
                    updateSubPart(() => ({
                        anomalyReport: report,
                        anomalyReportStatus: 'success',
                        anomalyReportPythonCode: (report as any)?._pythonCode || null,
                        anomalyReportExecutionLog: (report as any)?._executionLog || null,
                    }));
                } catch (err: any) {
                    const { message: anomalyMsg } = GeminiService.unwrapGoogleError(err);
                    updateSubPart(() => ({ anomalyReport: null, anomalyReportStatus: 'error', anomalyReportError: anomalyMsg }));
                }
            }

            const finalResult = get().analysisResult!;
            const allSucceeded = finalResult.enabledTabs.every(tab => {
                if (tab === "Visualizations") return finalResult.visualizations !== null && !finalResult.error;
                if (tab === "Anomalies") return finalResult.anomalyReportStatus === 'success';
                if (tab === "Forecasting") return finalResult.forecastingReportStatus === 'success';
                return true;
            });
            const anySucceeded = finalResult.enabledTabs.some(tab => {
                if (tab === "Visualizations") return finalResult.visualizations !== null && !finalResult.error;
                if (tab === "Anomalies") return finalResult.anomalyReportStatus === 'success';
                if (tab === "Forecasting") return finalResult.forecastingReportStatus === 'success';
                return false;
            });
            const newStatus = allSucceeded ? 'success' : anySucceeded ? 'partial_success' : 'error';
            updateSubPart(() => ({ status: newStatus }));

        } catch (err: any) {
            console.error('Error during analysis run:', err);
            updateSubPart(() => ({
                error: err.message || "An unexpected error occurred during analysis.",
                status: 'error',
                visualizations: null,
                anomalyReportStatus: 'error',
                forecastingReportStatus: 'error'
            }));
        }
    },

    addVisualization: (chartSpec: ChartSpec) => {
        set(state => {
            if (!state.analysisResult) return state;
            const updated = {
                ...state.analysisResult,
                visualizations: [chartSpec, ...(state.analysisResult.visualizations || [])]
            };
            return {
                analysisResult: updated,
            };
        });
    },
    addForecastingModel: (modelDetail: ForecastingModelDetail) => {
        set(state => {
            if (!state.analysisResult) return state;
            const existingReport = state.analysisResult.forecastingReport;
            const newReport = {
                overallSummary: existingReport?.overallSummary || 'Custom forecasting models generated by AI.',
                identifiedTargetVariables: existingReport?.identifiedTargetVariables || [modelDetail.targetVariable],
                models: [modelDetail, ...(existingReport?.models || [])],
                dataExplorationHighlights: existingReport?.dataExplorationHighlights,
                limitationsAndAssumptions: existingReport?.limitationsAndAssumptions
            };
            const updated = {
                ...state.analysisResult,
                forecastingReport: newReport
            };
            return {
                analysisResult: updated,
            };
        });
    },
    removeVisualization: (vizIndex: number) => {
        set(state => {
            if (!state.analysisResult) return state;
            const updated = {
                ...state.analysisResult,
                visualizations: state.analysisResult.visualizations?.filter((_, index) => index !== vizIndex) || null
            };
            return {
                analysisResult: updated,
            };
        });
    },
    removeForecastingModel: (modelIndex: number) => {
        set(state => {
            if (!state.analysisResult) return state;
            const updated = {
                ...state.analysisResult,
                forecastingReport: {
                    ...state.analysisResult.forecastingReport,
                    models: state.analysisResult.forecastingReport?.models?.filter((_, index) => index !== modelIndex) || []
                } as any
            };
            return {
                analysisResult: updated,
            };
        });
    },
    updateVisualization: (vizIndex: number, chartSpec: ChartSpec) => {
        set(state => {
            if (!state.analysisResult) return state;
            const updated = {
                ...state.analysisResult,
                visualizations: state.analysisResult.visualizations?.map((viz, index) =>
                    index === vizIndex ? chartSpec : viz
                ) || null
            };
            return {
                analysisResult: updated,
            };
        });
    },
    updateVisualizationData: (vizIndex: number, newData: any[]) => {
        set(state => {
            if (!state.analysisResult) return state;
            const updated = {
                ...state.analysisResult,
                visualizations: state.analysisResult.visualizations?.map((viz, index) =>
                    index === vizIndex ? { ...viz, data: newData } : viz
                ) || null
            };
            return {
                analysisResult: updated,
            };
        });
    },

    exportState: () => {
        const { files, focusAndMetricsInput } = useFileStore.getState();
        const { analysisConfig, analysisResult, activePipelineTab } = get();

        // Compile complete, structured execution logs for all pipeline agents
        const allAgentLogs = {
            dataCleaningReport: {
                stage: 'Data Cleaning & Profiling (Lakehouse)',
                reportMarkdown: analysisResult?.dataCleaningReport || null,
                interactionId: analysisResult?.cleaningInteractionId || null,
                pythonCode: analysisResult?.cleaningPythonCode || null,
                executionLog: analysisResult?.cleaningExecutionLog || null,
            },
            visualizations: {
                stage: 'Generating Visualizations',
                pythonCode: analysisResult?.visualizationPythonCode || null,
                executionLog: analysisResult?.visualizationExecutionLog || null,
            },
            anomalies: {
                stage: 'Anomaly Detection',
                pythonCode: analysisResult?.anomalyReportPythonCode || null,
                executionLog: analysisResult?.anomalyReportExecutionLog || null,
            },
            forecastingModels: (analysisResult?.forecastingReport?.models || []).map(m => ({
                modelName: m.modelName,
                modelType: m.modelType,
                pythonCodeSnippet: m.pythonCodeSnippet || null,
                executionLog: m.executionLog || null,
            })),
            agentTraceEvents: analysisResult?.liveExecutionSteps || [],
        };

        const exportData: ExportedAnalysisState = {
            version: EXPORT_VERSION,
            exportedAt: new Date().toISOString(),
            filesMetadata: files.map(file => ({ name: file.name, type: file.type, size: file.size, lastModified: file.lastModified })),
            focusAndMetricsInput,
            analysisConfig,
            analysisResult,
            activePipelineTab,
            executionLogs: allAgentLogs,
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = `analysis_export_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    resetPipelineState: () => set(initialPipelineState),
})));

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ~~~~~~ UI STORE (Modals, Overlays) ~~~~~~
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

interface UIState {
    isInsightModalOpen: boolean;
    currentInsightContext: CurrentInsightContextValue | null;
    fullScreenChartId: string | null;
    isFullScreenOverlayVisible: boolean;
    fullScreenImageInfo: FullScreenImageInfo | null;
    isFullScreenImageOverlayVisible: boolean;
    fullScreenModelCardInfo: FullScreenModelCardInfo | null;
    isFullScreenModelOverlayVisible: boolean;
    fullScreenDataInfo: FullScreenDataInfo | null;
    isFullScreenDataOverlayVisible: boolean;
    fullScreenCodePanelInfo: FullScreenCodePanelInfo | null;
    isFullScreenCodePanelVisible: boolean;
    isChatPanelOpen: boolean;
    chatPanelType: 'visualization' | 'forecasting' | null;
    theme: 'dark' | 'light';

    // Anomaly UI State
    selectedAnomalyId: string | null;
    isAnomalyDetailModalOpen: boolean;
    anomalyFilters: {
        severities: ('Low' | 'Medium' | 'High' | 'Informational')[];
        types: AnomalyType[];
        affectedVariables: string[];
        riskLevels: ('Low' | 'Medium' | 'High' | 'Critical')[];
        minAnomalyScore?: number;
    };

    openModelInsightAssistant: (modelDetail: any) => void;
    closeInsightAssistant: () => void;
    toggleFullScreenChart: (chartId: string | null) => void;
    toggleFullScreenImage: (src: string | null, alt?: string) => void;
    toggleFullScreenModelCard: (modelDetail?: any, modelIndex?: number) => void;
    toggleFullScreenData: (title: string | null, data?: any, pythonCode?: string | null, executionLog?: string | null, tabName?: string) => void;
    toggleFullScreenCodePanel: (pythonCode: string | null, executionLog?: string, tabName?: string) => void;
    closeAllOverlays: () => void;
    openChatPanel: (type: 'visualization' | 'forecasting') => void;
    closeChatPanel: () => void;
    toggleTheme: () => void;

    // Anomaly UI Actions
    openAnomalyDetailModal: (anomalyId: string) => void;
    closeAnomalyDetailModal: () => void;
    setAnomalyFilters: (filters: Partial<UIState['anomalyFilters']>) => void;
    resetAnomalyFilters: () => void;

    resetUIState: () => void;
}

const getInitialTheme = (): 'dark' | 'light' => {
    const stored = localStorage.getItem('appTheme');
    return (stored === 'light' || stored === 'dark') ? stored : 'dark';
};

const initialUIState = {
    isInsightModalOpen: false, currentInsightContext: null,
    fullScreenChartId: null, isFullScreenOverlayVisible: false,
    fullScreenImageInfo: null, isFullScreenImageOverlayVisible: false,
    fullScreenModelCardInfo: null, isFullScreenModelOverlayVisible: false,
    fullScreenDataInfo: null, isFullScreenDataOverlayVisible: false,
    fullScreenCodePanelInfo: null, isFullScreenCodePanelVisible: false,
    isChatPanelOpen: false, chatPanelType: null,
    theme: getInitialTheme(),
    selectedAnomalyId: null,
    isAnomalyDetailModalOpen: false,
    anomalyFilters: {
        severities: [] as ('Low' | 'Medium' | 'High' | 'Informational')[],
        types: [] as AnomalyType[],
        affectedVariables: [] as string[],
        riskLevels: [] as ('Low' | 'Medium' | 'High' | 'Critical')[],
        minAnomalyScore: undefined,
    },
};

export const useUIStore = create<UIState>((set, get) => ({
    ...initialUIState,
    openModelInsightAssistant: (modelDetail) => {
        const analysis = usePipelineStore.getState().analysisResult;
        if (analysis) {
            set({
                isInsightModalOpen: true,
                currentInsightContext: {
                    dataCleaningReport: analysis.dataCleaningReport,
                    cleaningInteractionId: analysis.cleaningInteractionId,
                    modelDetail: modelDetail,
                    originalModelId: analysis.modelId,
                }
            });
        } else {
            useAppStore.getState().setModalError("Insight Assistant Error", "Could not retrieve necessary context for this model.");
        }
    },
    closeInsightAssistant: () => set({ isInsightModalOpen: false, currentInsightContext: null }),
    toggleFullScreenChart: (chartId) => {
        const newFullScreenChartId = get().fullScreenChartId === chartId ? null : chartId;
        if (newFullScreenChartId) get().closeAllOverlays();
        set({ fullScreenChartId: newFullScreenChartId, isFullScreenOverlayVisible: !!newFullScreenChartId });
    },
    toggleFullScreenImage: (src, alt) => {
        if (src) {
            get().closeAllOverlays();
            set({ fullScreenImageInfo: { src, alt: alt || 'Fullscreen Image' }, isFullScreenImageOverlayVisible: true });
        } else {
            set({ fullScreenImageInfo: null, isFullScreenImageOverlayVisible: false });
        }
    },
    toggleFullScreenModelCard: (modelDetail, modelIndex) => {
        if (modelDetail !== undefined && modelIndex !== undefined) {
            get().closeAllOverlays();
            set({ fullScreenModelCardInfo: { modelDetail, modelIndex }, isFullScreenModelOverlayVisible: true });
        } else {
            set({ fullScreenModelCardInfo: null, isFullScreenModelOverlayVisible: false });
        }
    },
    toggleFullScreenData: (title, data, pythonCode, executionLog, tabName) => {
        if (title && data) {
            get().closeAllOverlays();
            set({
                fullScreenDataInfo: {
                    title,
                    data,
                    pythonCode: pythonCode || null,
                    executionLog: executionLog || null,
                    tabName
                },
                isFullScreenDataOverlayVisible: true
            });
        } else {
            set({ fullScreenDataInfo: null, isFullScreenDataOverlayVisible: false });
        }
    },
    toggleFullScreenCodePanel: (pythonCode, executionLog = '', tabName = 'Code Execution') => {
        if (pythonCode) {
            get().closeAllOverlays();
            set({
                fullScreenCodePanelInfo: { pythonCode, executionLog, tabName },
                isFullScreenCodePanelVisible: true
            });
        } else {
            set({ fullScreenCodePanelInfo: null, isFullScreenCodePanelVisible: false });
        }
    },
    closeAllOverlays: () => set({
        isFullScreenOverlayVisible: false, fullScreenChartId: null,
        isFullScreenImageOverlayVisible: false, fullScreenImageInfo: null,
        isFullScreenModelOverlayVisible: false, fullScreenModelCardInfo: null,
        isFullScreenDataOverlayVisible: false, fullScreenDataInfo: null,
        isFullScreenCodePanelVisible: false, fullScreenCodePanelInfo: null,
        isChatPanelOpen: false, chatPanelType: null,
        isAnomalyDetailModalOpen: false, selectedAnomalyId: null,
    }),
    openChatPanel: (type: 'visualization' | 'forecasting') => {
        get().closeAllOverlays();
        set({ isChatPanelOpen: true, chatPanelType: type });
    },
    closeChatPanel: () => set({ isChatPanelOpen: false, chatPanelType: null }),
    toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: newTheme });
        localStorage.setItem('appTheme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);

        const darkTheme = document.getElementById('hljs-theme-dark') as HTMLLinkElement;
        const lightTheme = document.getElementById('hljs-theme-light') as HTMLLinkElement;
        if (darkTheme && lightTheme) {
            darkTheme.disabled = newTheme === 'light';
            lightTheme.disabled = newTheme === 'dark';
        }

    },
    // Anomaly UI Actions
    openAnomalyDetailModal: (anomalyId: string) => {
        get().closeAllOverlays();
        set({ selectedAnomalyId: anomalyId, isAnomalyDetailModalOpen: true });
    },
    closeAnomalyDetailModal: () => {
        set({ selectedAnomalyId: null, isAnomalyDetailModalOpen: false });
    },
    setAnomalyFilters: (filters: Partial<UIState['anomalyFilters']>) => {
        set({ anomalyFilters: { ...get().anomalyFilters, ...filters } });
    },
    resetAnomalyFilters: () => {
        set({
            anomalyFilters: {
                severities: [],
                types: [],
                affectedVariables: [],
                riskLevels: [],
                minAnomalyScore: undefined,
            }
        });
    },

    resetUIState: () => set(initialUIState),
}));

// Initialize theme on load
if (typeof document !== 'undefined') {
    const initialTheme = getInitialTheme();
    document.documentElement.setAttribute('data-theme', initialTheme);

    setTimeout(() => {
        const darkTheme = document.getElementById('hljs-theme-dark') as HTMLLinkElement;
        const lightTheme = document.getElementById('hljs-theme-light') as HTMLLinkElement;
        if (darkTheme && lightTheme) {
            darkTheme.disabled = initialTheme === 'light';
            lightTheme.disabled = initialTheme === 'dark';
        }
    }, 100);

}




// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ~~~~~~ Global Actions & Listeners ~~~~~~~
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

usePipelineStore.subscribe(
    state => state.analysisResult,
    (analysisResult) => {
        const anyPipelineProcessing = !!analysisResult && (
            ['pending', 'data_cleaning', 'insights_processing'].includes(analysisResult.status) ||
            analysisResult.anomalyReportStatus === 'loading' ||
            analysisResult.forecastingReportStatus === 'loading'
        );
        useAppStore.getState().setIsProcessing(anyPipelineProcessing);
    }
);

export const resetAllStores = () => {
    useAppStore.getState().resetApp();
    useFileStore.getState().resetFileState();
    usePipelineStore.getState().resetPipelineState();
    useUIStore.getState().resetUIState();

    // Re-check for stored API key after reset
    const storedGeminiKey = localStorage.getItem('geminiApiKey');
    if (storedGeminiKey) {
        useAppStore.getState().setApiKeys(storedGeminiKey, true);
    }
};

export const loadArchivedState = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result as string;
            const importedData = JSON.parse(text) as ExportedAnalysisState;

            const importedVersionString = String(importedData.version);
            if (importedVersionString !== EXPORT_VERSION) {
                useAppStore.getState().setModalError('Import Error', `Invalid or unsupported export version. Expected ${EXPORT_VERSION}, got ${importedData.version || 'unknown'}.`);
                return;
            }

            resetAllStores(); // Reset before loading new state

            let analysisResult = importedData.analysisResult || null;
            if (analysisResult) {
                // Recover charts from execution log if visualizations array is empty
                if ((!analysisResult.visualizations || analysisResult.visualizations.length === 0) && analysisResult.visualizationExecutionLog) {
                    const log = analysisResult.visualizationExecutionLog;
                    const lines = log.split('\n');
                    let jsonBuffer = '';
                    let bracketCount = 0;
                    let foundStart = false;
                    for (const line of lines) {
                        for (const char of line) {
                            if (char === '[') {
                                bracketCount++;
                                if (bracketCount === 1) foundStart = true;
                            }
                            if (foundStart) jsonBuffer += char;
                            if (char === ']') {
                                bracketCount--;
                                if (bracketCount === 0 && foundStart) {
                                    try {
                                        const parsed = JSON.parse(jsonBuffer);
                                        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].chartType) {
                                            analysisResult.visualizations = parsed;
                                            break;
                                        }
                                    } catch (_) {}
                                    jsonBuffer = '';
                                    foundStart = false;
                                }
                            }
                        }
                        if (analysisResult.visualizations && analysisResult.visualizations.length > 0) break;
                        if (foundStart) jsonBuffer += '\n';
                    }
                }
            }

            const modelId = importedData.analysisConfig?.modelId || analysisResult?.modelId || DEFAULT_MODEL_ID;
            const enabledTabs = importedData.analysisConfig?.enabledTabs || analysisResult?.enabledTabs || [...PIPELINE_TAB_TYPES];
            const analysisConfig = { modelId, enabledTabs };
            const activeTab = importedData.activePipelineTab || enabledTabs[0] || PIPELINE_TAB_TYPES[0];

            useFileStore.setState({ focusAndMetricsInput: importedData.focusAndMetricsInput || '' });
            usePipelineStore.setState({
                analysisConfig,
                analysisResult,
                activePipelineTab: activeTab,
            });


        } catch (error) {
            console.error('Error importing data:', error);
            useAppStore.getState().setModalError('Import Error', `Failed to parse or apply the imported file. Error: ${(error as Error).message}.`);
        }
    };
    reader.readAsText(file);
};
