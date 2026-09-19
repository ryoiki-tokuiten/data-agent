import React from 'react';
import { useUIStore } from '../stores';
import type { AnomalyType, RiskLevel } from '../types';
import { formatTypeLabel } from '../utils/formatting';

interface AnomalyFiltersProps {
  availableTypes: AnomalyType[];
  availableVariables: string[];
  availableRiskLevels: RiskLevel[];
}

export const AnomalyFilters: React.FC<AnomalyFiltersProps> = ({ 
  availableTypes, 
  availableVariables,
  availableRiskLevels 
}) => {
  const { anomalyFilters, setAnomalyFilters, resetAnomalyFilters } = useUIStore();

  const toggleFilter = <T extends string>(
    filterKey: 'severities' | 'types' | 'affectedVariables' | 'riskLevels',
    value: T
  ) => {
    const currentFilters = anomalyFilters[filterKey] as T[];
    const newFilters = currentFilters.includes(value)
      ? currentFilters.filter(v => v !== value)
      : [...currentFilters, value];
    setAnomalyFilters({ [filterKey]: newFilters });
  };

  const hasActiveFilters = 
    anomalyFilters.severities.length > 0 ||
    anomalyFilters.types.length > 0 ||
    anomalyFilters.affectedVariables.length > 0 ||
    anomalyFilters.riskLevels.length > 0 ||
    anomalyFilters.minAnomalyScore !== undefined;

  return (
    <div className="anomaly-filters-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)' }}>
          Filter Anomalies
        </h3>
        {hasActiveFilters && (
          <button
            onClick={resetAnomalyFilters}
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.8rem',
              background: 'rgba(var(--accent-pink-rgb), 0.1)',
              color: 'var(--accent-pink)',
              border: '1px solid rgba(var(--accent-pink-rgb), 0.3)',
              borderRadius: 'var(--border-radius-sm)',
              cursor: 'pointer',
            }}
          >
            Clear All
          </button>
        )}
      </div>

      {/* Compact Filter Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
      
      {/* Severity Filters */}
      <div className="filter-group" style={{ marginBottom: 0 }}>
        <label className="filter-label" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Severity</label>
        <div className="filter-chips">
          {(['High', 'Medium', 'Low', 'Informational'] as const).map(severity => (
            <button
              key={severity}
              className={`filter-chip ${anomalyFilters.severities.includes(severity) ? 'active' : ''}`}
              onClick={() => toggleFilter('severities', severity)}
            >
              {severity}
            </button>
          ))}
        </div>
      </div>

      {/* Risk Level Filters */}
      {availableRiskLevels.length > 0 && (
        <div className="filter-group" style={{ marginBottom: 0 }}>
          <label className="filter-label" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Risk Level</label>
          <div className="filter-chips">
            {availableRiskLevels.map(risk => (
              <button
                key={risk}
                className={`filter-chip ${anomalyFilters.riskLevels.includes(risk) ? 'active' : ''}`}
                onClick={() => toggleFilter('riskLevels', risk)}
              >
                {risk}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Anomaly Type Filters */}
      {availableTypes.length > 0 && (
        <div className="filter-group" style={{ marginBottom: 0 }}>
          <label className="filter-label" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Anomaly Type</label>
          <div className="filter-chips">
            {availableTypes.map(type => (
              <button
                key={type}
                className={`filter-chip ${anomalyFilters.types.includes(type) ? 'active' : ''}`}
                onClick={() => toggleFilter('types', type)}
              >
                {formatTypeLabel(type)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Affected Variables Filters */}
      {availableVariables.length > 0 && (
        <div className="filter-group" style={{ marginBottom: 0 }}>
          <label className="filter-label" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Affected Variables</label>
          <div className="filter-chips">
            {availableVariables.slice(0, 15).map(variable => (
              <button
                key={variable}
                className={`filter-chip ${anomalyFilters.affectedVariables.includes(variable) ? 'active' : ''}`}
                onClick={() => toggleFilter('affectedVariables', variable)}
              >
                {variable}
              </button>
            ))}
            {availableVariables.length > 15 && (
              <span style={{ 
                padding: '0.5rem 1rem', 
                fontSize: '0.85rem', 
                color: 'var(--text-tertiary-color)' 
              }}>
                +{availableVariables.length - 15} more
              </span>
            )}
          </div>
        </div>
      )}

      
      {/* Anomaly Score Filter - Full Width */}
      </div>
      
      <div className="filter-group" style={{ marginBottom: 0 }}>
        <label className="filter-label" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          Min Score: {anomalyFilters.minAnomalyScore !== undefined ? (anomalyFilters.minAnomalyScore).toFixed(2) : 'None'}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={anomalyFilters.minAnomalyScore ?? 0}
          onChange={(e) => {
            const value = parseFloat(e.target.value);
            setAnomalyFilters({ minAnomalyScore: value > 0 ? value : undefined });
          }}
          className="dark-theme-slider"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};
