

import React, { useEffect, useRef, useState } from 'react';
import { useAppStore, useFileStore, usePipelineStore, useUIStore, resetAllStores, loadArchivedState } from '../hooks/stores';
import { FileInput } from './FileInput';
import { ChartDisplay } from './ChartDisplay';
import { LoadingSpinner } from './LoadingSpinner';
import { Modal } from './Modal';
import { ModelSelector } from './ModelSelector';
import { InsightAssistantModal } from './InsightAssistantModal';
import { AnomalyReportDisplay } from './AnomalyReportDisplay';
import { ForecastingReportDisplay, ModelExecutionDetailCard } from './ForecastingReportDisplay';
import { ChatSidePanel } from './ChatSidePanel';
import { CleanedDataTable } from './CleanedDataTable';
import { FullScreenCodePanel } from './FullScreenCodePanel';
import type { PipelineTabType, PipelineSubPartStatus, FullScreenChartInfo, AnalysisResult } from '../types';
import { AVAILABLE_MODELS, PIPELINE_TAB_TYPES } from '../utils/constants';
import PipelineStageErrorBoundary from './PipelineStageErrorBoundary';
import { ApiKeyForm } from './ApiKeyForm';
import { AgentTraceView } from './AgentTraceView';
import { VirtualizedChartGrid } from './VirtualizedChartGrid';
import { FileSystemView } from './FileSystemView';

export const getModelDisplayName = (modelId: string) => {
    return AVAILABLE_MODELS.find(m => m.id === modelId)?.displayName || modelId;
};

export const getSubPartStatus = (result: AnalysisResult | null | undefined, tabType: PipelineTabType): PipelineSubPartStatus => {
    if (!result) return 'idle';
    if (tabType === 'Agent Trace') {
        if (result.status === 'data_cleaning' || result.status === 'insights_processing' || result.status === 'pending') return 'loading';
        if (result.status === 'error') return 'error';
        return 'success';
    }
    if (tabType === 'File System') {
        if (result.status === 'data_cleaning' || result.status === 'pending') return 'loading';
        if (result.dataCleaningReport) return 'success';
        return 'idle';
    }
    if (!result.enabledTabs.includes(tabType as any)) return 'skipped';
    switch (tabType) {
        case 'Visualizations':
            if (result.status === 'data_cleaning' || (result.status === 'insights_processing' && !result.visualizations && !result.error)) return 'loading';
            if (result.error && result.visualizations === null) return 'error';
            if (result.visualizations && result.visualizations.length > 0 && !result.error) return 'success';
            if ((result.status === 'success' || result.status === 'partial_success') && (!result.visualizations || result.visualizations.length === 0) && !result.error) return 'success';
            if (result.status === 'error' && result.error) return 'error';
            return result.status === 'pending' ? 'pending' : 'idle';
        case 'Anomalies': return result.anomalyReportStatus || 'idle';
        case 'Forecasting': return result.forecastingReportStatus || 'idle';
        default: return 'idle';
    }
};

const AnalyticsView: React.FC = () => {
    const { geminiService, isProcessingAnyPipeline, setModalError } = useAppStore();
    const { files, focusAndMetricsInput } = useFileStore();
    const { analysisConfig, analysisResult, activePipelineTab, setAnalysisModelId, toggleAnalysisTab, runAnalysis, removeVisualization, removeForecastingModel } = usePipelineStore();
    const { toggleFullScreenChart, toggleFullScreenModelCard, openModelInsightAssistant } = useUIStore();

    const handleSubmit = async () => {
        if (!geminiService) {
            setModalError("API Service Not Ready", "The Gemini service is not initialized. Please ensure your API key is set correctly.");
            return;
        }
        if (files.length === 0 && focusAndMetricsInput.trim() === '') {
            setModalError('No Data or Context Provided', 'Please upload files or specify focus areas/key metrics.');
            return;
        }
        if (analysisConfig.enabledTabs.length === 0) {
            setModalError('No Analysis Tabs Selected', 'At least one analysis tab (e.g., Visualizations) must be selected.');
            return;
        }

        await runAnalysis();
    };

    const showInputForm = !analysisResult || analysisResult.status === 'idle';

    return (
        <>
            {showInputForm && (
                <section className="app-section input-form-section">
                    <FileInput />



                    <div style={{ marginTop: '2rem', padding: '1.75rem', backgroundColor: 'var(--card-bg-color)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '1.25rem' }}>
                            Analysis Configuration
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <ModelSelector
                                selectedModelId={analysisConfig.modelId}
                                onChange={(modelId) => setAnalysisModelId(modelId)}
                                disabled={isProcessingAnyPipeline}
                            />
                            <div>
                                <label style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'block', color: 'var(--text-secondary-color)' }}>
                                    Enabled Analysis Tabs:
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                                    {PIPELINE_TAB_TYPES.map(tabType => (
                                        <label
                                            key={tabType}
                                            className="checkbox-label"
                                            style={{
                                                padding: '0.6rem 1.1rem',
                                                cursor: 'pointer',
                                                borderRadius: 'var(--border-radius-sm)',
                                                border: `1px solid ${analysisConfig.enabledTabs.includes(tabType) ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                                                background: analysisConfig.enabledTabs.includes(tabType) ? 'rgba(var(--accent-blue-rgb), 0.12)' : 'transparent'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={analysisConfig.enabledTabs.includes(tabType)}
                                                onChange={(e) => toggleAnalysisTab(tabType, e.target.checked)}
                                                disabled={isProcessingAnyPipeline}
                                            />
                                            <span style={{ fontWeight: 500, color: analysisConfig.enabledTabs.includes(tabType) ? 'var(--text-color)' : 'var(--text-secondary-color)' }}>{tabType}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem' }}>
                        <button
                            onClick={handleSubmit}
                            disabled={isProcessingAnyPipeline || (files.length === 0 && focusAndMetricsInput.trim() === '') || analysisConfig.enabledTabs.length === 0}
                            className="primary-action"
                            style={{ width: '100%', padding: '0.9rem 1.5rem', fontSize: '1.1rem' }}
                            aria-live="polite"
                        >
                            {isProcessingAnyPipeline ? (<><LoadingSpinner inline /><span>Processing Analysis...</span></>) : 'Process Data'}
                        </button>
                    </div>
                </section>
            )}

            {!showInputForm && (
                <section className="app-section results-display-section" style={{ marginTop: 0, height: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: (activePipelineTab === 'Forecasting' || activePipelineTab === 'Agent Trace' || activePipelineTab === 'File System') ? 'hidden' : undefined }}>
                    <div className="results-content-area custom-scrollbar" style={{ height: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: (activePipelineTab === 'Forecasting' || activePipelineTab === 'Agent Trace' || activePipelineTab === 'File System') ? '0' : '0.25rem 0.1rem', overflow: (activePipelineTab === 'Forecasting' || activePipelineTab === 'Agent Trace' || activePipelineTab === 'File System') ? 'hidden' : 'auto' }}>
                        {analysisResult ? (() => {
                            const currentResult = analysisResult;
                            const modelNameForDisplay = getModelDisplayName(currentResult.modelId);
                            const stageErrorFallback = (tabName: string) => (<div className="status-message error"><p>Error loading {tabName.toLowerCase()} (Model: {modelNameForDisplay}). Check error details if available.</p></div>);

                            if (['pending', 'data_cleaning'].includes(currentResult.status) && activePipelineTab !== 'Anomalies' && activePipelineTab !== 'Forecasting' && activePipelineTab !== 'Agent Trace') {
                                let loadingMessage = `Analysis is pending...`;
                                if (currentResult.status === 'data_cleaning') loadingMessage = `Cleaning data (Model: ${modelNameForDisplay})... This may take a moment.`;
                                return (<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', color: 'var(--text-secondary-color)' }}><LoadingSpinner /><p style={{ marginTop: '1rem' }}>{loadingMessage}</p></div>);
                            }

                            if (activePipelineTab === 'Agent Trace') {
                                return (
                                    <PipelineStageErrorBoundary stageName="Agent Execution Trace">
                                        <AgentTraceView
                                            steps={currentResult.liveExecutionSteps || []}
                                            isAnalyzing={isProcessingAnyPipeline}
                                            error={currentResult.error}
                                            enabledTabs={currentResult.enabledTabs}
                                        />
                                    </PipelineStageErrorBoundary>
                                );
                            }

                            if (activePipelineTab === 'Visualizations') {
                                if (!currentResult.enabledTabs.includes("Visualizations")) return <p className="status-message info">Visualization generation was not selected for this analysis.</p>;
                                return (
                                    <PipelineStageErrorBoundary stageName="Visualizations Display">
                                        {getSubPartStatus(currentResult, "Visualizations") === 'loading' || (currentResult.status === 'insights_processing' && !currentResult.visualizations && !currentResult.error) ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', color: 'var(--text-secondary-color)' }}><LoadingSpinner /><p style={{ marginTop: '1rem' }}>Generating Visualizations ({modelNameForDisplay})...</p></div>
                                        ) : currentResult.error && (!currentResult.visualizations || currentResult.visualizations.length === 0) ? (
                                            <div className="status-message error" style={{ flexDirection: 'column', alignItems: 'flex-start' }}><h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Error in Visualization Generation</h3><p style={{ fontFamily: 'monospace', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{currentResult.error}</p>{currentResult.errorDetails && <pre className="error-details-box custom-scrollbar">{currentResult.errorDetails}</pre>}{currentResult.suggestion && (<div className="suggestion-box"><p>Suggestion:</p><p>{currentResult.suggestion}</p></div>)}</div>
                                        ) : currentResult.visualizations && currentResult.visualizations.length > 0 ? (
                                            <VirtualizedChartGrid
                                                charts={currentResult.visualizations}
                                                onChartClick={(chartId) => toggleFullScreenChart(chartId)}
                                                onRemoveChart={(index) => removeVisualization(index)}
                                                onDataChange={(index, newData) => {
                                                    usePipelineStore.getState().updateVisualizationData(index, newData);
                                                }}
                                            />
                                        ) : (currentResult.status === 'success' || currentResult.status === 'partial_success') && (!currentResult.visualizations || currentResult.visualizations.length === 0) && !currentResult.error ? (
                                            <p style={{ color: 'var(--text-secondary-color)', textAlign: 'center', padding: '2rem' }}>Analysis successful, but no visualizations were generated. The data might not have been suitable, or AI chose not to generate any.</p>
                                        ) : currentResult.status === 'error' ? (
                                            stageErrorFallback("Visualizations")
                                        ) : (
                                            <p style={{ color: 'var(--text-secondary-color)', textAlign: 'center', padding: '2rem' }}>Visualization results are pending or in an unknown state.</p>
                                        )}
                                    </PipelineStageErrorBoundary>
                                );
                            }

                            if (activePipelineTab === 'Anomalies') {
                                if (!currentResult.enabledTabs.includes("Anomalies") || currentResult.anomalyReportStatus === 'skipped') return <p className="status-message info">Anomaly detection was not selected for this analysis.</p>;
                                return (
                                    <PipelineStageErrorBoundary stageName="Anomaly Report">
                                        {currentResult.anomalyReportStatus === 'loading' || currentResult.anomalyReportStatus === 'pending' ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', color: 'var(--text-secondary-color)' }}><LoadingSpinner /><p style={{ marginTop: '1rem' }}>Detecting anomalies in data...</p></div>
                                        ) : currentResult.anomalyReportStatus === 'error' ? (
                                            <div className="status-message error" style={{ flexDirection: 'column', alignItems: 'flex-start' }}><h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Error Detecting Anomalies</h3><p>{currentResult.anomalyReportError || "Unknown anomaly detection error."}</p>{currentResult.suggestion && (!currentResult.error || currentResult.error !== currentResult.anomalyReportError) && <div className="suggestion-box"><p>Suggestion:</p><p>{currentResult.suggestion}</p></div>}</div>
                                        ) : currentResult.anomalyReportStatus === 'success' && currentResult.anomalyReport ? (
                                            <AnomalyReportDisplay anomalyReport={currentResult.anomalyReport} />
                                        ) : (
                                            <p style={{ color: 'var(--text-secondary-color)', textAlign: 'center', padding: '2rem' }}>Anomaly detection results are not yet available or no anomalies found.</p>
                                        )}
                                    </PipelineStageErrorBoundary>
                                );
                            }

                            if (activePipelineTab === 'Forecasting') {
                                if (!currentResult.enabledTabs.includes("Forecasting") || currentResult.forecastingReportStatus === 'skipped') return <p className="status-message info">Forecasting report generation was not selected for this analysis.</p>;
                                return (
                                    <div style={{ height: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                        <PipelineStageErrorBoundary stageName="Forecasting Report">
                                            {currentResult.forecastingReportStatus === 'loading' || currentResult.forecastingReportStatus === 'pending' ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', color: 'var(--text-secondary-color)' }}><LoadingSpinner /><p style={{ marginTop: '1rem' }}>Generating Forecasting Report...</p></div>
                                            ) : currentResult.forecastingReportStatus === 'error' ? (
                                                <div className="status-message error" style={{ flexDirection: 'column', alignItems: 'flex-start' }}><h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Error Generating Forecasting Report</h3><p>{currentResult.forecastingReportError || "Unknown forecasting report generation error."}</p>{currentResult.suggestion && (!currentResult.error || currentResult.error !== currentResult.forecastingReportError) && <div className="suggestion-box"><p>Suggestion:</p><p>{currentResult.suggestion}</p></div>}</div>
                                            ) : currentResult.forecastingReportStatus === 'success' && currentResult.forecastingReport ? (
                                                <ForecastingReportDisplay
                                                    forecastingReport={currentResult.forecastingReport}
                                                    onAskAIForModel={(modelDetail) => openModelInsightAssistant(modelDetail)}
                                                    onToggleFullScreenForChart={toggleFullScreenChart}
                                                    onToggleFullScreenModelCard={(modelDetail, modelIndex) => toggleFullScreenModelCard(modelDetail, modelIndex)}
                                                    onRemoveModel={(modelIndex) => removeForecastingModel(modelIndex)}
                                                />
                                            ) : (
                                                <p style={{ color: 'var(--text-secondary-color)', textAlign: 'center', padding: '2rem' }}>Forecasting report is not yet available or no report generated.</p>
                                            )}
                                        </PipelineStageErrorBoundary>
                                    </div>
                                );
                            }

                            if (activePipelineTab === 'File System') {
                                return (
                                    <PipelineStageErrorBoundary stageName="Workspace File System">
                                        <FileSystemView />
                                    </PipelineStageErrorBoundary>
                                );
                            }

                            if (currentResult.status === 'insights_processing') {
                                return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', color: 'var(--text-secondary-color)' }}><LoadingSpinner /><p style={{ marginTop: '1rem' }}>Processing insights for analysis...</p></div>;
                            }

                            return <p style={{ color: 'var(--text-secondary-color)', textAlign: 'center', padding: '2rem' }}>Results for this tab are not yet available or an issue was encountered processing this specific part.</p>;
                        })() : (
                            <p style={{ color: 'var(--text-secondary-color)', textAlign: 'center', padding: '3rem 1rem', fontSize: '1.1rem' }}>No analysis has been run yet. Please provide data and click Process Data in the input form.</p>
                        )}
                    </div>
                </section>
            )}
        </>
    );
};


export const App: React.FC = () => {
    const {
        isApiKeySet,
        geminiService,
        setApiKeys,
        clearApiKeys,
        clearModalError,
        modalErrorTitle,
        modalErrorContent,
        isProcessingAnyPipeline
    } = useAppStore();

    const {
        analysisResult,
        activePipelineTab,
        setActivePipelineTab,
        addVisualization,
        addForecastingModel
    } = usePipelineStore();

    const {
        isInsightModalOpen,
        currentInsightContext,
        isFullScreenOverlayVisible,
        fullScreenChartId,
        isFullScreenImageOverlayVisible,
        fullScreenImageInfo,
        isFullScreenModelOverlayVisible,
        fullScreenModelCardInfo,
        isFullScreenDataOverlayVisible,
        fullScreenDataInfo,
        isChatPanelOpen,
        chatPanelType,
        theme,
        openModelInsightAssistant,
        closeInsightAssistant,
        toggleFullScreenChart,
        toggleFullScreenImage,
        toggleFullScreenModelCard,
        toggleFullScreenData,
        toggleFullScreenCodePanel,
        closeAllOverlays,
        openChatPanel,
        closeChatPanel,
        toggleTheme
    } = useUIStore();

    const importFileRef = useRef<HTMLInputElement>(null);
    const [copiedDataState, setCopiedDataState] = useState(false);

    useEffect(() => {
        // Load API key from localStorage
        const storedGeminiKey = localStorage.getItem('geminiApiKey');
        if (storedGeminiKey) {
            setApiKeys(storedGeminiKey, true);
        }
    }, [setApiKeys]);

    useEffect(() => {
        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeAllOverlays();
            }
        };

        const hasActiveOverlay = isFullScreenOverlayVisible || isFullScreenImageOverlayVisible || isFullScreenModelOverlayVisible || isFullScreenDataOverlayVisible;

        if (hasActiveOverlay) {
            document.body.classList.add('body-no-scroll');
            document.addEventListener('keydown', handleEscKey);
        } else {
            document.body.classList.remove('body-no-scroll');
        }

        return () => {
            document.body.classList.remove('body-no-scroll');
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [isFullScreenOverlayVisible, isFullScreenImageOverlayVisible, isFullScreenModelOverlayVisible, isFullScreenDataOverlayVisible, closeAllOverlays]);

    const triggerImportDialog = () => {
        importFileRef.current?.click();
    };

    const handleImportFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        loadArchivedState(file);
        if (event.target) event.target.value = '';
    };

    const handleExportAllData = () => {
        usePipelineStore.getState().exportState();
    };

    const handleOpenDataCleaningReport = () => {
        setActivePipelineTab('File System');
    };

    const handleCopyModalData = async () => {
        if (!fullScreenDataInfo?.data) return;
        try {
            const textToCopy = typeof fullScreenDataInfo.data === 'string'
                ? fullScreenDataInfo.data
                : JSON.stringify(fullScreenDataInfo.data, null, 2);
            await navigator.clipboard.writeText(textToCopy);
            setCopiedDataState(true);
            setTimeout(() => setCopiedDataState(false), 2000);
        } catch (err) {
            console.error('Failed to copy cleaned data:', err);
        }
    };

    const handleDownloadModalData = () => {
        if (!fullScreenDataInfo?.data) return;
        try {
            const isString = typeof fullScreenDataInfo.data === 'string';
            const content = isString
                ? fullScreenDataInfo.data
                : JSON.stringify(fullScreenDataInfo.data, null, 2);
            const ext = isString ? 'md' : 'json';
            const mime = isString ? 'text/markdown' : 'application/json';
            const blob = new Blob([content], { type: mime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const sanitizedTitle = (fullScreenDataInfo.title || 'cleaned_data')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '');
            a.href = url;
            a.download = `${sanitizedTitle}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download cleaned data:', err);
        }
    };

    let currentFullScreenChartInfo: FullScreenChartInfo | null = null;
    if (fullScreenChartId && analysisResult) {
        // Check regular visualizations
        if (analysisResult.visualizations) {
            const chartIdx = analysisResult.visualizations.findIndex((_, idx) => `chart-${idx}` === fullScreenChartId);
            if (chartIdx !== -1) {
                currentFullScreenChartInfo = {
                    spec: analysisResult.visualizations[chartIdx],
                    originalIndex: chartIdx,
                    isDiagnostic: false,
                    section: 'visualizations'
                };
            }
        }

        // Check anomaly visualizations
        if (!currentFullScreenChartInfo && analysisResult.anomalyReport?.detectedAnomalies) {
            analysisResult.anomalyReport.detectedAnomalies.forEach((anomaly, anomalyIdx) => {
                if (currentFullScreenChartInfo) return;
                if (anomaly.relatedData?.visualizationData) {
                    const anomalyChartId = `anomaly-${anomaly.id}-${anomalyIdx}`;
                    if (anomalyChartId === fullScreenChartId) {
                        currentFullScreenChartInfo = {
                            spec: anomaly.relatedData.visualizationData,
                            originalIndex: anomalyIdx,
                            isDiagnostic: false,
                            section: 'anomalies'
                        };
                    }
                }
            });
        }

        // Check forecasting diagnostic charts
        if (!currentFullScreenChartInfo && analysisResult.forecastingReport?.models) {
            analysisResult.forecastingReport.models.forEach((model, modelIndex) => {
                if (currentFullScreenChartInfo) return;
                if (model.diagnosticCharts) {
                    const diagChartIdx = model.diagnosticCharts.findIndex((_, idx) => `diag-${modelIndex}-${idx}` === fullScreenChartId);
                    if (diagChartIdx !== -1) {
                        currentFullScreenChartInfo = {
                            spec: model.diagnosticCharts[diagChartIdx],
                            originalIndex: diagChartIdx,
                            modelIdForContext: model.modelIdSuggestion,
                            isDiagnostic: true,
                            section: 'forecasting'
                        };
                    }
                }
            });
        }
    }

    if (!isApiKeySet) {
        return <ApiKeyForm />;
    }



    const showInputForm = !analysisResult || analysisResult.status === 'idle';
    const isResultsView = !showInputForm;

    return (
        <div className="app-container">
            <input type="file" ref={importFileRef} style={{ display: 'none' }} accept=".json" onChange={handleImportFileSelected} />

            {/* Pinned Header at the absolute top */}
            <header className="pinned-app-header">
                <div className="pinned-header-row">
                    <div className="pinned-header-brand">
                        {isResultsView ? (
                            <button
                                onClick={resetAllStores}
                                disabled={isProcessingAnyPipeline || !!fullScreenChartId || !!fullScreenImageInfo || !!fullScreenModelCardInfo}
                                className="header-btn primary-header-btn"
                                title="Start a new analysis session"
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"></path></svg>
                                Process New Data
                            </button>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-color)', letterSpacing: '-0.01em' }}>Data Science Agent</span>
                            </div>
                        )}
                    </div>

                    <div className="pinned-header-actions">
                        <button
                            onClick={triggerImportDialog}
                            disabled={isProcessingAnyPipeline}
                            className="header-btn"
                            title="Import previously exported analysis data"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                            Import
                        </button>
                        {isResultsView && (
                            <button
                                onClick={handleExportAllData}
                                disabled={isProcessingAnyPipeline || !analysisResult || !!fullScreenChartId || !!fullScreenImageInfo || !!fullScreenModelCardInfo}
                                className="header-btn"
                                title="Export all current analysis data and configurations"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Export All
                            </button>
                        )}
                        <button
                            onClick={toggleTheme}
                            className="header-btn"
                            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                        >
                            {theme === 'dark' ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                            )}
                            {theme === 'dark' ? 'Light' : 'Dark'}
                        </button>
                        <button
                            onClick={clearApiKeys}
                            disabled={isProcessingAnyPipeline}
                            className="header-btn"
                            title="Update or reset API credentials"
                        >
                            Change API Keys
                        </button>
                    </div>
                </div>

                {isResultsView && (
                    <div className="pinned-nav-row">
                        <div className="pinned-nav-tabs">
                            <button
                                key="Agent Trace"
                                className={`tab-button ${activePipelineTab === 'Agent Trace' ? 'active' : ''}`}
                                onClick={() => setActivePipelineTab('Agent Trace')}
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                                <span>Agent Trace</span>
                                {isProcessingAnyPipeline && <LoadingSpinner inline />}
                            </button>

                            {PIPELINE_TAB_TYPES.filter(tab => analysisResult?.enabledTabs.includes(tab)).map(tab => {
                                const status = getSubPartStatus(analysisResult, tab);
                                const isSelected = activePipelineTab === tab;
                                return (
                                    <button
                                        key={tab}
                                        className={`tab-button ${isSelected ? 'active' : ''}`}
                                        onClick={() => setActivePipelineTab(tab)}
                                        disabled={isProcessingAnyPipeline}
                                    >
                                        <span>{tab}</span>
                                        {status === 'loading' && <LoadingSpinner inline />}
                                        {status === 'success' && <span className="tab-status-icon success">✓</span>}
                                        {status === 'error' && <span className="tab-status-icon error">!</span>}
                                    </button>
                                );
                            })}

                            <button
                                key="File System"
                                className={`tab-button ${activePipelineTab === 'File System' ? 'active' : ''}`}
                                onClick={() => setActivePipelineTab('File System')}
                                title="Open workspace File System (DATA_REPORT.md, slices, uploaded files)"
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                <span>File System</span>
                            </button>
                        </div>

                        <div>
                            {activePipelineTab === 'Visualizations' && (
                                <button
                                    className="pinned-chat-btn"
                                    onClick={() => openChatPanel('visualization')}
                                    disabled={!analysisResult?.visualizations || analysisResult.visualizations.length === 0}
                                    title="Open conversational assistant for visualizations"
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                    Chat with Visualizations
                                </button>
                            )}
                            {activePipelineTab === 'Forecasting' && (
                                <button
                                    className="pinned-chat-btn"
                                    onClick={() => openChatPanel('forecasting')}
                                    disabled={!analysisResult?.forecastingReport?.models || analysisResult.forecastingReport.models.length === 0}
                                    title="Open conversational assistant for forecasting models"
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                    Chat with Forecasting
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </header>

            <main className={`app-main-content custom-scrollbar ${(activePipelineTab === 'Forecasting' || activePipelineTab === 'Agent Trace' || activePipelineTab === 'File System') && isResultsView ? 'forecasting-active-view' : ''}`}>

            {modalErrorTitle && (
                <Modal title={modalErrorTitle} onClose={clearModalError} type={modalErrorTitle?.toLowerCase().includes("success") ? "success" : "error"} modalIsActive={!!modalErrorTitle}>
                    {typeof modalErrorContent === 'string' ? <p>{modalErrorContent}</p> : modalErrorContent}
                </Modal>
            )}

            {isInsightModalOpen && currentInsightContext && geminiService && (
                <InsightAssistantModal
                    show={isInsightModalOpen}
                    onClose={closeInsightAssistant}
                    modelDetail={currentInsightContext.modelDetail ?? null}
                    dataCleaningReport={currentInsightContext.dataCleaningReport}
                    geminiService={geminiService}
                    originalModelId={currentInsightContext.originalModelId}
                />
            )}

            {isFullScreenOverlayVisible && currentFullScreenChartInfo && (
                <PipelineStageErrorBoundary stageName={`Fullscreen Chart: ${currentFullScreenChartInfo.spec.title}`} onRetry={() => toggleFullScreenChart(fullScreenChartId!)}>
                    <div className={`fullscreen-chart-overlay ${isFullScreenOverlayVisible ? 'active' : ''}`}>
                        <ChartDisplay
                            chartSpec={currentFullScreenChartInfo.spec}
                            chartIndex={currentFullScreenChartInfo.originalIndex}
                            isFullScreen={true}
                            onToggleFullScreen={() => toggleFullScreenChart(fullScreenChartId!)}
                            onDataChange={(newData) => {
                                const chartInfo = currentFullScreenChartInfo;
                                if (chartInfo) {
                                    usePipelineStore.getState().updateVisualizationData(
                                        chartInfo.originalIndex,
                                        newData
                                    );
                                }
                            }}
                        />
                    </div>
                </PipelineStageErrorBoundary>
            )}

            {isFullScreenImageOverlayVisible && fullScreenImageInfo && (
                <PipelineStageErrorBoundary stageName="Fullscreen Image Display">
                    <div className={`fullscreen-image-overlay active`}>
                        <div className="fullscreen-image-content">
                            <img src={fullScreenImageInfo.src} alt={fullScreenImageInfo.alt} />
                            <button onClick={() => toggleFullScreenImage(null)} className="button fullscreen-image-close-button" aria-label="Close fullscreen image">&times;</button>
                        </div>
                    </div>
                </PipelineStageErrorBoundary>
            )}

            {fullScreenModelCardInfo && (
                <PipelineStageErrorBoundary stageName={`Fullscreen Model Card: ${fullScreenModelCardInfo.modelDetail.modelName}`} onRetry={() => toggleFullScreenModelCard()}>
                    <div className={`fullscreen-model-card-overlay active`}>
                        <ModelExecutionDetailCard
                            modelDetail={fullScreenModelCardInfo.modelDetail}
                            modelIndex={fullScreenModelCardInfo.modelIndex}
                            onAskAIForModel={(modelDetail) => openModelInsightAssistant(modelDetail)}
                            onToggleFullScreenForChart={(chartId) => toggleFullScreenChart(chartId)}
                            onToggleFullScreenModelCard={() => toggleFullScreenModelCard()}
                            isFullScreenModel={true}
                        />
                    </div>
                </PipelineStageErrorBoundary>
            )}

            {isFullScreenDataOverlayVisible && fullScreenDataInfo && (
                <div className="fullscreen-data-overlay">
                    <div className="fullscreen-data-container">
                        <div className="data-panel-header">
                            <div className="data-panel-title-section">
                                <svg className="data-panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="3" y1="9" x2="21" y2="9"></line>
                                    <line x1="9" y1="21" x2="9" y2="9"></line>
                                </svg>
                                <h2>{fullScreenDataInfo.title}</h2>
                            </div>
                            <div className="fullscreen-data-header-actions">
                                {fullScreenDataInfo.pythonCode && (
                                    <button
                                        className="header-btn executed-code-header-btn"
                                        onClick={() => toggleFullScreenCodePanel(
                                            fullScreenDataInfo.pythonCode!,
                                            fullScreenDataInfo.executionLog || '',
                                            fullScreenDataInfo.tabName || 'Executed Code'
                                        )}
                                        title="View executed Python code"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                                        Executed Code
                                    </button>
                                )}
                                <button
                                    className="header-btn"
                                    onClick={handleCopyModalData}
                                    title="Copy data as JSON to clipboard"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                    {copiedDataState ? 'Copied!' : 'Copy'}
                                </button>
                                <button
                                    className="header-btn"
                                    onClick={handleDownloadModalData}
                                    title="Download data as JSON"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    Download
                                </button>
                                <button
                                    className="data-panel-close-button"
                                    onClick={() => toggleFullScreenData(null)}
                                    aria-label="Close data panel"
                                    title="Close (Esc)"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div className="data-panel-content">
                            <CleanedDataTable data={fullScreenDataInfo.data} mode="fullscreen" />
                        </div>
                    </div>
                </div>
            )}

            <FullScreenCodePanel />

            <AnalyticsView />

            <ChatSidePanel
                isOpen={isChatPanelOpen}
                onClose={closeChatPanel}
                type={chatPanelType || 'visualization'}
                dataCleaningReport={analysisResult?.dataCleaningReport}
                cleaningInteractionId={analysisResult?.cleaningInteractionId}
                visualizations={chatPanelType === 'visualization'
                    ? analysisResult?.visualizations || []
                    : []
                }
                forecastingModels={chatPanelType === 'forecasting'
                    ? analysisResult?.forecastingReport?.models || []
                    : []
                }
                modelId={analysisResult?.modelId}
                onNewVisualization={(chartSpec) => {
                    addVisualization(chartSpec);
                }}
                onNewForecastingModel={(modelDetail) => {
                    addForecastingModel(modelDetail);
                }}
            />

            </main>
        </div>
    );
};
