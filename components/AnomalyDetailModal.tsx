import React from 'react';
import { useUIStore } from '../stores';
import type { Anomaly } from '../types';
import { DataContextTable } from './DataContextTable';
import { ChartDisplay } from './ChartDisplay';
import { formatTypeLabel } from '../utils/formatting';

interface AnomalyDetailModalProps {
  anomaly: Anomaly | null;
}

export const AnomalyDetailModal: React.FC<AnomalyDetailModalProps> = ({ anomaly }) => {
  const { isAnomalyDetailModalOpen, closeAnomalyDetailModal } = useUIStore();

  if (!isAnomalyDetailModalOpen || !anomaly) return null;

  const getRiskBadgeClass = (risk?: string) => {
    if (!risk) return '';
    return `risk-level-badge ${risk.toLowerCase()}`;
  };

  return (
    <div
      className="modal-overlay"
      onClick={closeAnomalyDetailModal}
      style={{ zIndex: 9999 }}
    >
      <div
        className="modal-content anomaly-detail-modal-content custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close-btn"
          onClick={closeAnomalyDetailModal}
          aria-label="Close modal"
        >
          ×
        </button>

        <div style={{ padding: '2rem' }}>
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {anomaly.anomalyType && (
                <span className="anomaly-type-badge">
                  {formatTypeLabel(anomaly.anomalyType)}
                </span>
              )}
              <span
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  border: '1.5px solid',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  ...(anomaly.severity === 'High'
                    ? { backgroundColor: 'rgba(var(--accent-pink-rgb), 0.2)', color: 'var(--accent-pink)', borderColor: 'rgba(var(--accent-pink-rgb), 0.5)' }
                    : anomaly.severity === 'Medium'
                    ? { backgroundColor: 'rgba(var(--accent-yellow-rgb), 0.2)', color: 'var(--accent-yellow)', borderColor: 'rgba(var(--accent-yellow-rgb), 0.5)' }
                    : anomaly.severity === 'Low'
                    ? { backgroundColor: 'rgba(var(--accent-green-rgb), 0.18)', color: 'var(--accent-green)', borderColor: 'rgba(var(--accent-green-rgb), 0.45)' }
                    : { backgroundColor: 'rgba(var(--accent-blue-rgb), 0.18)', color: 'var(--accent-blue)', borderColor: 'rgba(var(--accent-blue-rgb), 0.45)' })
                }}
              >
                {anomaly.severity}
              </span>
              {anomaly.riskLevel && (
                <span className={getRiskBadgeClass(anomaly.riskLevel)}>
                  {anomaly.riskLevel} Risk
                </span>
              )}
            </div>

            <h2 style={{ 
              fontSize: '1.75rem', 
              fontWeight: 700, 
              color: 'var(--text-color)', 
              marginBottom: '1rem',
              lineHeight: 1.3
            }}>
              {anomaly.description}
            </h2>

            {/* Anomaly Score */}
            {anomaly.anomalyScore !== undefined && (
              <div className="anomaly-score-display" style={{ marginTop: '1rem' }}>
                <span style={{ fontWeight: 600, minWidth: '120px' }}>Anomaly Score:</span>
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
          </div>

          {/* Affected Variables */}
          {anomaly.affectedVariables && anomaly.affectedVariables.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '0.75rem' }}>
                Affected Variables
              </h4>
              <div className="anomaly-affected-variables">
                {anomaly.affectedVariables.map(variable => (
                  <span key={variable} className="variable-tag">
                    {variable}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Statistical Metrics */}
          {anomaly.statisticalMetrics && Object.keys(anomaly.statisticalMetrics).length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '0.75rem' }}>
                Statistical Metrics
              </h4>
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

          {/* Data Context */}
          {anomaly.dataContext && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '0.75rem' }}>
                Data Context
              </h4>
              <div style={{ 
                background: 'var(--sub-panel-bg-color)', 
                padding: '1rem', 
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--sub-panel-border-color)',
                maxHeight: '400px',
                overflowY: 'auto'
              }} className="custom-scrollbar">
                <DataContextTable data={anomaly.dataContext} />
              </div>
            </div>
          )}

          {/* Implication */}
          {anomaly.implication && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '0.75rem' }}>
                Implication
              </h4>
              <p style={{ color: 'var(--text-secondary-color)', lineHeight: 1.7 }}>
                {anomaly.implication}
              </p>
            </div>
          )}

          {/* Domain Impact */}
          {anomaly.domainImpact && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '0.75rem' }}>
                Domain Impact
              </h4>
              <p style={{ color: 'var(--text-secondary-color)', lineHeight: 1.7 }}>
                {anomaly.domainImpact}
              </p>
            </div>
          )}

          {/* Causal Hypotheses */}
          {anomaly.causalHypotheses && anomaly.causalHypotheses.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '0.75rem' }}>
                Potential Causes
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-secondary-color)', lineHeight: 1.7 }}>
                {anomaly.causalHypotheses.map((hypothesis, idx) => (
                  <li key={idx} style={{ marginBottom: '0.5rem' }}>{hypothesis}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Actions */}
          {anomaly.recommendedActions && anomaly.recommendedActions.length > 0 && (
            <div className="anomaly-recommendations">
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-green)', marginBottom: '0.75rem', margin: 0 }}>
                Recommended Actions
              </h4>
              <ul>
                {anomaly.recommendedActions.map((action, idx) => (
                  <li key={idx}>{action}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Historical Context */}
          {anomaly.historicalContext && (
            <div style={{ marginTop: '1.5rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '0.75rem' }}>
                Historical Context
              </h4>
              <p style={{ color: 'var(--text-secondary-color)', lineHeight: 1.7 }}>
                {anomaly.historicalContext}
              </p>
            </div>
          )}

          {/* Visualization */}
          {anomaly.relatedData?.visualizationData && (
            <div style={{ marginTop: '1.5rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '0.75rem' }}>
                Anomaly Visualization
              </h4>
              <div style={{ 
                background: 'var(--sub-panel-bg-color)', 
                padding: '1rem', 
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--sub-panel-border-color)'
              }}>
                <ChartDisplay 
                  chartSpec={anomaly.relatedData.visualizationData} 
                  chartIndex={0}
                  isFullScreen={false}
                  onToggleFullScreen={() => {}}
                />
              </div>
            </div>
          )}

          {/* Related Data Points */}
          {anomaly.relatedData?.dataPoints && anomaly.relatedData.dataPoints.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '0.75rem' }}>
                Related Data Points
              </h4>
              <div style={{ 
                background: 'var(--sub-panel-bg-color)', 
                padding: '1rem', 
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--sub-panel-border-color)',
                maxHeight: '300px',
                overflowY: 'auto'
              }} className="custom-scrollbar">
                <DataContextTable data={anomaly.relatedData.dataPoints} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
