

import React, { useMemo } from 'react';
import type { AnomalyReport, Anomaly, AnomalyType, RiskLevel } from '../types';
import PipelineStageErrorBoundary from './PipelineStageErrorBoundary';
import { AnomalyFilters } from './AnomalyFilters';
import { AnomalyDetailModal } from './AnomalyDetailModal';
import { DataContextTable } from './DataContextTable';
import { ChartDisplay } from './ChartDisplay';
import { useUIStore } from '../stores';
import { formatTypeLabel } from '../utils/formatting';

interface AnomalyReportDisplayProps {
  anomalyReport: AnomalyReport;
}

const getSeverityStyles = (severity: Anomaly['severity']): React.CSSProperties => {
  let styles: React.CSSProperties = {
    padding: '0.4rem 0.8rem', 
    borderRadius: 'var(--border-radius-sm)',
    fontSize: '0.85rem', 
    fontWeight: 600, 
    border: '1.5px solid',
    flexShrink: 0,
    textAlign: 'center',
    minWidth: '90px', 
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  };
  switch (severity) {
    case 'High':
      return { ...styles, backgroundColor: 'rgba(var(--accent-pink-rgb), 0.2)', color: 'var(--accent-pink)', borderColor: 'rgba(var(--accent-pink-rgb), 0.5)' };
    case 'Medium':
      return { ...styles, backgroundColor: 'rgba(var(--accent-yellow-rgb), 0.2)', color: 'var(--accent-yellow)', borderColor: 'rgba(var(--accent-yellow-rgb), 0.5)' };
    case 'Low':
      return { ...styles, backgroundColor: 'rgba(var(--accent-green-rgb), 0.18)', color: 'var(--accent-green)', borderColor: 'rgba(var(--accent-green-rgb), 0.45)' };
    case 'Informational':
      return { ...styles, backgroundColor: 'rgba(var(--accent-blue-rgb), 0.18)', color: 'var(--accent-blue)', borderColor: 'rgba(var(--accent-blue-rgb), 0.45)' };
    default:
      return { ...styles, backgroundColor: 'rgba(var(--text-tertiary-color-rgb, 122, 130, 160), 0.15)', color: 'var(--text-tertiary-color)', borderColor: 'rgba(var(--text-tertiary-color-rgb, 122, 130, 160),0.35)'};
  }
};

export const AnomalyReportDisplay: React.FC<AnomalyReportDisplayProps> = ({ anomalyReport }) => {
  const { anomalyFilters, selectedAnomalyId, toggleFullScreenChart } = useUIStore();

  if (!anomalyReport) {
    return <p style={{color: 'var(--text-secondary-color)', textAlign: 'center', padding: '2rem'}}>No anomaly report available for this configuration.</p>;
  }

  const { overallAssessment, detectedAnomalies, summaryStats } = anomalyReport;

  // Extract unique values for filters
  const availableTypes = useMemo(() => {
    const types = new Set<AnomalyType>();
    detectedAnomalies?.forEach(a => { if (a.anomalyType) types.add(a.anomalyType); });
    return Array.from(types);
  }, [detectedAnomalies]);

  const availableVariables = useMemo(() => {
    const vars = new Set<string>();
    detectedAnomalies?.forEach(a => a.affectedVariables?.forEach(v => vars.add(v)));
    return Array.from(vars);
  }, [detectedAnomalies]);

  const availableRiskLevels = useMemo(() => {
    const risks = new Set<RiskLevel>();
    detectedAnomalies?.forEach(a => { if (a.riskLevel) risks.add(a.riskLevel); });
    return Array.from(risks);
  }, [detectedAnomalies]);

  // Filter anomalies
  const filteredAnomalies = useMemo(() => {
    if (!detectedAnomalies) return [];
    
    return detectedAnomalies.filter(anomaly => {
      // Severity filter
      if (anomalyFilters.severities.length > 0 && !anomalyFilters.severities.includes(anomaly.severity)) {
        return false;
      }
      
      // Type filter
      if (anomalyFilters.types.length > 0 && (!anomaly.anomalyType || !anomalyFilters.types.includes(anomaly.anomalyType))) {
        return false;
      }
      
      // Risk level filter
      if (anomalyFilters.riskLevels.length > 0 && (!anomaly.riskLevel || !anomalyFilters.riskLevels.includes(anomaly.riskLevel))) {
        return false;
      }
      
      // Affected variables filter
      if (anomalyFilters.affectedVariables.length > 0) {
        const hasMatchingVar = anomaly.affectedVariables?.some(v => anomalyFilters.affectedVariables.includes(v));
        if (!hasMatchingVar) return false;
      }
      
      // Anomaly score filter
      if (anomalyFilters.minAnomalyScore !== undefined && anomaly.anomalyScore !== undefined) {
        if (anomaly.anomalyScore < anomalyFilters.minAnomalyScore) return false;
      }
      
      return true;
    });
  }, [detectedAnomalies, anomalyFilters]);

  const selectedAnomaly = useMemo(() => {
    return detectedAnomalies?.find(a => a.id === selectedAnomalyId) || null;
  }, [detectedAnomalies, selectedAnomalyId]);

  return (
    <PipelineStageErrorBoundary stageName="Anomaly Report">
        <div className="anomaly-report-container" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        
        {detectedAnomalies && detectedAnomalies.length > 0 && (
            <div>
            {/* Filters */}
            <AnomalyFilters
              availableTypes={availableTypes}
              availableVariables={availableVariables}
              availableRiskLevels={availableRiskLevels}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-color)', margin: 0 }}>
                Detected Anomalies ({filteredAnomalies.length}/{detectedAnomalies.length})
              </h3>
            </div>
            
            <div className="grid-anomaly-container">
                {filteredAnomalies.map((anomaly, index) => (
                    <PipelineStageErrorBoundary key={anomaly.id} stageName={`Anomaly Item: ${anomaly.description.substring(0,30)}...`}>
                        <div className="anomaly-card" style={{ animationDelay: `${index * 0.07}s` }}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap'}}>
                                <h4 title={anomaly.id} style={{ flex: '1 1 300px' }}>
                                    {anomaly.description}
                                </h4>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  {anomaly.anomalyType && (
                                    <span className="anomaly-type-badge">
                                      {formatTypeLabel(anomaly.anomalyType)}
                                    </span>
                                  )}
                                  <span style={getSeverityStyles(anomaly.severity)}>
                                      {anomaly.severity}
                                  </span>
                                </div>
                            </div>

                            {/* Anomaly Score */}
                            {anomaly.anomalyScore !== undefined && (
                              <div className="anomaly-score-display" style={{ marginTop: '1rem' }}>
                                <span style={{ fontWeight: 600, minWidth: '100px' }}>Score:</span>
                                <div className="anomaly-score-bar">
                                  <div
                                    className="anomaly-score-fill"
                                    style={{ width: `${anomaly.anomalyScore * 100}%` }}
                                  />
                                </div>
                                <span style={{ fontWeight: 600, minWidth: '45px' }}>
                                  {(anomaly.anomalyScore * 100).toFixed(1)}%
                                </span>
                              </div>
                            )}

                            {/* Risk Level */}
                            {anomaly.riskLevel && (
                              <div style={{ marginTop: '0.75rem' }}>
                                <span className={`risk-level-badge ${anomaly.riskLevel.toLowerCase()}`}>
                                  {anomaly.riskLevel} Risk
                                </span>
                              </div>
                            )}

                            {/* Affected Variables */}
                            {anomaly.affectedVariables && anomaly.affectedVariables.length > 0 && (
                              <div style={{ marginTop: '1rem' }}>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--text-color)', display: 'block', marginBottom: '0.5rem' }}>
                                  Affected Variables:
                                </strong>
                                <div className="anomaly-affected-variables">
                                  {anomaly.affectedVariables.slice(0, 5).map(variable => (
                                    <span key={variable} className="variable-tag">
                                      {variable}
                                    </span>
                                  ))}
                                  {anomaly.affectedVariables.length > 5 && (
                                    <span className="variable-tag">
                                      +{anomaly.affectedVariables.length - 5} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Statistical Metrics */}
                            {anomaly.statisticalMetrics && Object.keys(anomaly.statisticalMetrics).length > 0 && (
                              <div style={{ marginTop: '1rem' }}>
                                <strong style={{ fontSize: '0.85rem', color: 'var(--text-secondary-color)', display: 'block', marginBottom: '0.5rem' }}>
                                  Key Metrics:
                                </strong>
                                <div className="anomaly-metrics-grid">
                                  {Object.entries(anomaly.statisticalMetrics).map(([key, value]) => {
                                    if (value === null || value === undefined) return null;
                                    return (
                                      <div key={key} className="anomaly-metric-item">
                                        <div className="anomaly-metric-label">{key}</div>
                                        <div className="anomaly-metric-value">
                                          {typeof value === 'number' ? value.toFixed(3) : String(value)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {/* Data Context - Compact */}
                            {anomaly.dataContext && (
                              <div style={{ marginTop: '1rem' }}> 
                                <strong style={{ fontSize: '0.85rem', color: 'var(--text-secondary-color)', display: 'block', marginBottom: '0.5rem' }}>
                                  Data Context:
                                </strong>
                                <div style={{ maxHeight: '120px', overflowY: 'auto', marginTop: '0.5rem' }} className="custom-scrollbar">
                                  <DataContextTable data={anomaly.dataContext} />
                                </div>
                              </div>
                            )}


                            {/* Visualization if available */}
                            {anomaly.relatedData?.visualizationData && (() => {
                              const vizData = anomaly.relatedData.visualizationData;
                              console.log(`[Anomaly ${anomaly.id}] Rendering visualization:`, {
                                chartType: vizData.chartType,
                                dataLength: Array.isArray(vizData.data) ? vizData.data.length : 'NOT_ARRAY',
                                dataKeys: vizData.dataKeys,
                                hasTitle: !!vizData.title,
                                hasDescription: !!vizData.description
                              });
                              const chartId = `anomaly-${anomaly.id}-${index}`;
                              return (
                                <div style={{ 
                                  marginTop: '1.5rem', 
                                  height: '500px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  isolation: 'isolate'
                                }}>
                                  <ChartDisplay 
                                    chartSpec={{ ...vizData, description: '' }}
                                    chartIndex={index}
                                    isFullScreen={false}
                                    onToggleFullScreen={() => toggleFullScreenChart(chartId)}
                                  />
                                </div>
                              );
                            })()}

                            {anomaly.suggestedVisualization && !anomaly.relatedData?.visualizationData && (
                            <div className="suggestion-box">
                                <p>Visualization Suggestion:</p>
                                <p>{anomaly.suggestedVisualization}</p>
                            </div>
                            )}
                        </div>
                    </PipelineStageErrorBoundary>
                ))}
            </div>

            {/* Empty State for Filtered Results */}
            {filteredAnomalies.length === 0 && detectedAnomalies.length > 0 && (
              <div className="status-message info" style={{marginTop: '1rem'}}>
                <p>No anomalies match the current filters. Try adjusting your filter criteria.</p>
              </div>
            )}
            </div>
        )}

        {(!detectedAnomalies || detectedAnomalies.length === 0) && (
            <div className="status-message info" style={{marginTop: '1rem'}}>
            <p>No specific anomalies were detected or reported for this dataset.</p>
            </div>
        )}

        {/* Anomaly Detail Modal */}
        <AnomalyDetailModal anomaly={selectedAnomaly} />
        </div>
    </PipelineStageErrorBoundary>
  );
};
