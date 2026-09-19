import React, { useState, useEffect, useRef } from 'react';
import type { ForecastingReport, ForecastingModelDetail } from '../types';
import { ChartDisplay } from './ChartDisplay'; 
import PipelineStageErrorBoundary from './PipelineStageErrorBoundary';
import { FiCode } from 'react-icons/fi';

declare var hljs: any;

interface ForecastingReportDisplayProps {
  forecastingReport: ForecastingReport;
  onAskAIForModel?: (modelDetail: ForecastingModelDetail) => void;
  onToggleFullScreenForChart?: (chartId: string) => void;
  onRemoveModel?: (modelIndex: number) => void;
}

const highlightSnippet = (code: string, lang: string): string => {
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

const escapeHtml = (text: string): string => {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

const CopyToClipboardButton: React.FC<{ textToCopy: string, buttonText?: string }> = ({ textToCopy, buttonText = "Copy" }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <button onClick={handleCopy} className="button copy-button" title="Copy to Clipboard">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
            {copied ? 'Copied!' : buttonText}
        </button>
    );
};

export const ModelExecutionDetailCard: React.FC<{ 
    modelDetail: ForecastingModelDetail, 
    modelIndex: number, 
    onAskAIForModel?: (modelDetail: ForecastingModelDetail) => void,
    onToggleFullScreenForChart?: (chartId: string) => void,
    onRemove?: () => void;
    hideHeader?: boolean;
}> = ({ modelDetail, modelIndex, onAskAIForModel, onToggleFullScreenForChart, onRemove, hideHeader }) => {
    const [selectedLeftSubTab, setSelectedLeftSubTab] = useState<'params' | 'code_execution'>('params');

    const modelCharts = modelDetail.diagnosticCharts || [];
    const primaryChart = modelCharts[0] || null;
    const secondaryCharts = modelCharts.slice(1);

    const metricsEntries = modelDetail.evaluationMetrics ? Object.entries(modelDetail.evaluationMetrics) : [];
    const paramsEntries = modelDetail.modelParameters ? Object.entries(modelDetail.modelParameters) : [];
    const shouldShowError = modelDetail.error && modelCharts.length === 0 && !modelDetail.plotBase64;

    const hasSecondary = secondaryCharts.length > 0 || (!!modelDetail.plotBase64 && !!primaryChart);
    const secondaryCount = secondaryCharts.length + (modelDetail.plotBase64 && primaryChart ? 1 : 0);

    const codeContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof hljs !== 'undefined' && codeContainerRef.current) {
            codeContainerRef.current.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }
    }, [modelDetail, selectedLeftSubTab]);

    return (
        <div className="model-detail-card dashboard-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {!hideHeader && (
                <div className="model-detail-header">
                    <div className="model-title-area">
                        <h4 className="model-title">
                            {modelDetail.modelName || `Predictive Model ${modelIndex + 1}`}
                        </h4>
                        <div className="model-meta-tags">
                            <span className="meta-type">Type: {modelDetail.modelType}</span>
                            {modelDetail.targetVariable && <span className="meta-target">Target: {modelDetail.targetVariable}</span>}
                        </div>
                    </div>
                    <div className="model-card-actions">
                        {onAskAIForModel && (
                            <button 
                                onClick={() => onAskAIForModel(modelDetail)} 
                                className="button ask-ai-button" 
                                title="Ask AI for insights about this model's results"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.83 9.17 2.5 2.5-2.5 2.5"></path><path d="M12 2a10 10 0 1 0 10 10c0-2.24-.76-4.32-2.05-6.04L12 2"></path><path d="M12 22a10 10 0 0 0 7.95-3.96L12 22Z"></path><circle cx="12" cy="10"></circle></svg>
                                Ask AI
                            </button>
                        )}
                        {onRemove && (
                            <button 
                                onClick={onRemove} 
                                className="button remove-button"
                                title="Remove this predictive model"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3,6 5,6 21,6"></polyline>
                                    <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {shouldShowError && (
                <div className="status-message error model-error-message" style={{ margin: '0 0 0.65rem 0' }}>
                    <p><strong>Error processing this model:</strong> {modelDetail.error}</p>
                </div>
            )}

            <div className="forecasting-compact-body">
                {/* LEFT COLUMN: Specs, Metrics & Code */}
                <div className="forecasting-compact-left">
                    {/* Evaluation Metrics Card */}
                    <div className="compact-metrics-card">
                        <div className="compact-metrics-title">Evaluation Metrics</div>
                        {metricsEntries.length > 0 ? (
                            <div className="compact-metrics-grid custom-scrollbar">
                                {metricsEntries.map(([key, value]) => (
                                    <div key={key} className="compact-metric-pill" title={`${key}: ${value}`}>
                                        <span className="compact-metric-name">{key}</span>
                                        <span className="compact-metric-value">
                                            {typeof value === 'number' ? value.toFixed(3) : String(value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary-color)' }}>
                                No numerical evaluation metrics recorded for this model.
                            </p>
                        )}
                    </div>

                    {/* Sub-Tabs Section: Parameters / Code Execution */}
                    <div className="compact-specs-card">
                        <div className="compact-specs-nav">
                            <button
                                className={`compact-subtab-btn ${selectedLeftSubTab === 'params' ? 'active' : ''}`}
                                onClick={() => setSelectedLeftSubTab('params')}
                            >
                                Parameters ({paramsEntries.length})
                            </button>
                            {(modelDetail.pythonCodeSnippet || modelDetail.executionLog) && (
                                <button
                                    className={`compact-subtab-btn ${selectedLeftSubTab === 'code_execution' ? 'active' : ''}`}
                                    onClick={() => setSelectedLeftSubTab('code_execution')}
                                >
                                    <FiCode size={13} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                                    Code Execution
                                </button>
                            )}
                        </div>

                        <div className="compact-specs-content custom-scrollbar" ref={codeContainerRef}>
                            {selectedLeftSubTab === 'params' && (
                                paramsEntries.length > 0 ? (
                                    <div>
                                        {paramsEntries.map(([k, v]) => (
                                            <div key={k} className="compact-param-row">
                                                <span className="param-key">{k}</span>
                                                <span className="param-val">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary-color)' }}>
                                        No explicit model parameters specified.
                                    </p>
                                )
                            )}

                            {selectedLeftSubTab === 'code_execution' && (
                                <div className="compact-code-execution-container">
                                    {/* Python Code */}
                                    <div className="compact-code-section">
                                        <div className="compact-code-bar">
                                            <span className="compact-code-label">Python Code</span>
                                            {modelDetail.pythonCodeSnippet && (
                                                <CopyToClipboardButton textToCopy={modelDetail.pythonCodeSnippet} buttonText="Copy Code" />
                                            )}
                                        </div>
                                        {modelDetail.pythonCodeSnippet ? (
                                            <pre className="compact-code-block">
                                                <code
                                                    className="language-python"
                                                    dangerouslySetInnerHTML={{ __html: highlightSnippet(modelDetail.pythonCodeSnippet, 'python') }}
                                                />
                                            </pre>
                                        ) : (
                                            <p className="compact-empty-text">No Python code available for this model.</p>
                                        )}
                                    </div>

                                    {/* Divider */}
                                    <div className="compact-code-divider" />

                                    {/* Execution Log */}
                                    <div className="compact-code-section">
                                        <div className="compact-code-bar">
                                            <span className="compact-code-label">Execution Log</span>
                                            {modelDetail.executionLog && (
                                                <CopyToClipboardButton textToCopy={modelDetail.executionLog} buttonText="Copy Log" />
                                            )}
                                        </div>
                                        {modelDetail.executionLog ? (
                                            <pre className="compact-code-block">
                                                <code
                                                    className="language-bash"
                                                    dangerouslySetInnerHTML={{ __html: highlightSnippet(modelDetail.executionLog, 'bash') }}
                                                />
                                            </pre>
                                        ) : (
                                            <p className="compact-empty-text">No execution log recorded.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT AREA: Left 1 Primary Chart, Right Up to 3 Secondary Charts Stacked */}
                <div className="forecasting-charts-stage">
                    {/* Primary Forecast Chart Stage */}
                    <div className={`primary-forecast-stage ${!hasSecondary ? 'full-width' : ''}`}>
                        {primaryChart ? (
                            <PipelineStageErrorBoundary stageName={`Chart: ${primaryChart.title}`}>
                                <ChartDisplay
                                    chartSpec={primaryChart}
                                    chartIndex={modelIndex * 10}
                                    isFullScreen={false}
                                    onToggleFullScreen={() => onToggleFullScreenForChart && onToggleFullScreenForChart(`diag-${modelIndex}-0`)}
                                />
                            </PipelineStageErrorBoundary>
                        ) : modelDetail.plotBase64 ? (
                            <div className="primary-plot-image-container">
                                <img
                                    src={`data:image/png;base64,${modelDetail.plotBase64}`}
                                    alt={modelDetail.modelName || 'Forecasting Plot'}
                                    style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', borderRadius: 'var(--border-radius-sm)' }}
                                />
                            </div>
                        ) : (
                            <div className="forecasting-no-chart-msg">
                                No visual forecast prediction chart generated for this model.
                            </div>
                        )}
                    </div>

                    {/* Secondary Diagnostic / Feature Coefficients Charts Stage */}
                    {hasSecondary && (
                        <div className={`secondary-diagnostic-stage count-${Math.min(secondaryCount, 4)} ${secondaryCount > 3 ? 'has-scroll custom-scrollbar' : ''}`}>
                            {secondaryCharts.map((diag, sIdx) => {
                                const diagId = `diag-${modelIndex}-${sIdx + 1}`;
                                const fitClass = secondaryCount === 1 ? 'fit-1' : secondaryCount === 2 ? 'fit-2' : secondaryCount === 3 ? 'fit-3' : 'fit-scroll';
                                return (
                                    <div key={diag.title || sIdx} className={`secondary-chart-item ${fitClass}`}>
                                        <PipelineStageErrorBoundary stageName={`Chart: ${diag.title || `Diagnostic ${sIdx + 1}`}`}>
                                            <ChartDisplay
                                                chartSpec={diag}
                                                chartIndex={modelIndex * 10 + sIdx + 1}
                                                isFullScreen={false}
                                                onToggleFullScreen={() => onToggleFullScreenForChart && onToggleFullScreenForChart(diagId)}
                                            />
                                        </PipelineStageErrorBoundary>
                                    </div>
                                );
                            })}
                            {modelDetail.plotBase64 && primaryChart && (
                                <div className={`secondary-chart-item ${secondaryCount === 1 ? 'fit-1' : secondaryCount === 2 ? 'fit-2' : secondaryCount === 3 ? 'fit-3' : 'fit-scroll'} plot-image-item`}>
                                    <div className="secondary-chart-card-header">
                                        <h5 className="secondary-chart-title">Diagnostic Plot Image</h5>
                                    </div>
                                    <div className="secondary-plot-render-area">
                                        <img
                                            src={`data:image/png;base64,${modelDetail.plotBase64}`}
                                            alt={modelDetail.modelName || 'Diagnostic Plot'}
                                            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const ForecastingReportDisplay: React.FC<ForecastingReportDisplayProps> = ({ 
    forecastingReport, 
    onAskAIForModel, 
    onToggleFullScreenForChart,
    onRemoveModel
}) => {
  const [currentModelIndex, setCurrentModelIndex] = useState(0);

  if (!forecastingReport) {
    return <div className="status-message info forecasting-status-message">No forecasting report available for this configuration.</div>;
  }

  const { models } = forecastingReport;

  if (!models || models.length === 0) {
    return (
      <div className="status-message info forecasting-status-message">
        <p>No specific forecasting models were proposed or processed in this report.</p>
      </div>
    );
  }

  const safeIndex = Math.min(Math.max(0, currentModelIndex), models.length - 1);
  const currentModel = models[safeIndex];

  const prevTitle = safeIndex > 0 ? (models[safeIndex - 1]?.modelName || `Model ${safeIndex}`) : '';
  const nextTitle = safeIndex < models.length - 1 ? (models[safeIndex + 1]?.modelName || `Model ${safeIndex + 2}`) : '';

  const handlePrev = () => {
    if (safeIndex > 0) setCurrentModelIndex(safeIndex - 1);
  };

  const handleNext = () => {
    if (safeIndex < models.length - 1) setCurrentModelIndex(safeIndex + 1);
  };

  const handleRemove = () => {
    if (onRemoveModel) {
      onRemoveModel(safeIndex);
      if (safeIndex >= models.length - 1 && safeIndex > 0) {
        setCurrentModelIndex(safeIndex - 1);
      }
    }
  };

  return (
    <div className="forecasting-report-dashboard carousel-mode">
      {/* Top Carousel Navigation Bar */}
      <div className="forecasting-carousel-header">
        <div className="carousel-nav-controls">
          <div className="carousel-arrow-group">
            <button
              className="carousel-arrow-btn"
              onClick={handlePrev}
              disabled={safeIndex <= 0}
              title={prevTitle ? `Previous: ${prevTitle}` : 'No previous model'}
              aria-label="Previous model"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button
              className="carousel-arrow-btn"
              onClick={handleNext}
              disabled={safeIndex >= models.length - 1}
              title={nextTitle ? `Next: ${nextTitle}` : 'No next model'}
              aria-label="Next model"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
          
          <div className="carousel-title-container">
            <h3 className="carousel-model-title" title={currentModel.modelName || `Predictive Model ${safeIndex + 1}`}>
              {currentModel.modelName || `Predictive Model ${safeIndex + 1}`}
            </h3>
            <div className="carousel-model-meta">
              <span className="carousel-meta-pill type-pill">{currentModel.modelType}</span>
              {currentModel.targetVariable && (
                <span className="carousel-meta-pill target-pill">Target: {currentModel.targetVariable}</span>
              )}
              <span className="carousel-counter-pill">{safeIndex + 1} of {models.length}</span>
            </div>
          </div>
        </div>

        <div className="carousel-actions">
          {onAskAIForModel && (
            <button 
              onClick={() => onAskAIForModel(currentModel)} 
              className="button ask-ai-button" 
              title="Ask AI for insights about this model's results"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.83 9.17 2.5 2.5-2.5 2.5"></path><path d="M12 2a10 10 0 1 0 10 10c0-2.24-.76-4.32-2.05-6.04L12 2"></path><path d="M12 22a10 10 0 0 0 7.95-3.96L12 22Z"></path><circle cx="12" cy="10"></circle></svg>
              Ask AI
            </button>
          )}
          {onRemoveModel && (
            <button 
              onClick={handleRemove} 
              className="button remove-button"
              title="Remove this predictive model"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3,6 5,6 21,6"></polyline>
                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Single Active Model Card */}
      <div className="forecasting-carousel-body">
        <PipelineStageErrorBoundary 
            key={currentModel.modelIdSuggestion || `model-carousel-${safeIndex}`} 
            stageName={`Forecasting Model: ${currentModel.modelName || `Model ${safeIndex + 1}`}`}
        >
            <ModelExecutionDetailCard 
                modelDetail={currentModel} 
                modelIndex={safeIndex}
                onAskAIForModel={onAskAIForModel}
                onToggleFullScreenForChart={onToggleFullScreenForChart}
                onRemove={onRemoveModel ? handleRemove : undefined}
                hideHeader={true}
            />
        </PipelineStageErrorBoundary>
      </div>
    </div>
  );
};
