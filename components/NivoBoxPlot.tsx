import React from 'react';
import { ResponsiveBoxPlot } from '@nivo/boxplot';
import type { BoxPlotDataKeys } from '../types';
import { CHART_COLORS } from '../utils/constants';
import { validateNumericKey, validateKeyExists, sanitizeNumericKeys } from '../utils/dataValidation';
import { useUIStore } from '../hooks/stores';

interface NivoBoxPlotProps {
  data: Array<Record<string, any>>;
  dataKeys: BoxPlotDataKeys;
  isFullScreen: boolean;
}

export const NivoBoxPlot: React.FC<NivoBoxPlotProps> = ({ 
  data, 
  dataKeys, 
  isFullScreen
}) => {
  const theme = useUIStore(state => state.theme);
  const isDark = theme === 'dark';

  if (!data || data.length === 0) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: 'var(--text-secondary-color)' 
      }}>
        No data available for Box Plot
      </div>
    );
  }

  // Resolve keys with robust fallbacks
  const firstItem = (data && data[0]) || {};
  const effectiveGroupKey = dataKeys?.groupKey 
    || (dataKeys as any)?.xAxis 
    || (dataKeys as any)?.group 
    || (dataKeys as any)?.category 
    || ('group' in firstItem ? 'group' : ('category' in firstItem ? 'category' : ('name' in firstItem ? 'name' : Object.keys(firstItem)[0] || 'group')));

  const effectiveValueKey = dataKeys?.valueKey 
    || (dataKeys as any)?.yAxis 
    || (dataKeys as any)?.value 
    || (dataKeys as any)?.val 
    || ('value' in firstItem ? 'value' : Object.keys(firstItem).find(k => k !== effectiveGroupKey && typeof firstItem[k] === 'number') || Object.keys(firstItem)[1] || 'value');

  // Validate required keys
  const groupValidation = validateKeyExists(data, effectiveGroupKey, 'groupKey');
  const valueValidation = validateNumericKey(data, effectiveValueKey, 'valueKey');

  if (!groupValidation.exists || !valueValidation.isValid) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        color: 'var(--text-secondary-color)',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '10px', fontWeight: 600 }}>Invalid Box Plot Data</div>
        <div style={{ fontSize: '0.9em' }}>
          {groupValidation.error && <div>{groupValidation.error}</div>}
          {valueValidation.error && <div>{valueValidation.error}</div>}
        </div>
      </div>
    );
  }

  // Sanitize numeric values
  const sanitizedData = sanitizeNumericKeys(data, [effectiveValueKey]);

  // Nivo expects the raw data points. The transformation to add the 'group' key is critical.
  const nivoData = sanitizedData
    .filter(item => {
      const value = item[effectiveValueKey];
      return typeof value === 'number' && !isNaN(value) && isFinite(value);
    })
    .map(item => ({
      group: String(item[effectiveGroupKey] || 'Unknown'),
      value: item[effectiveValueKey]
    }));

  // Calculate value range for domain from all data points to ensure whiskers are visible
  const allValues = data
    .map(item => item[effectiveValueKey])
    .filter((v): v is number => typeof v === 'number' && !isNaN(v));

  const hasValues = allValues.length > 0;
  const dataMin = hasValues ? Math.min(...allValues) : 0;
  const dataMax = hasValues ? Math.max(...allValues) : 1;

  const range = dataMax - dataMin;
  const padding = range > 0 ? range * 0.05 : 1;

  const chartTheme = {
    background: 'transparent',
    text: {
      fill: 'var(--text-color)',
      fontFamily: 'var(--font-family)',
      fontSize: isFullScreen ? 12 : 11,
      fontWeight: 400
    },
    axis: {
      domain: { 
        line: { 
          stroke: 'transparent', 
          strokeWidth: 0 
        } 
      },
      ticks: { 
        line: { 
          stroke: 'transparent', 
          strokeWidth: 0 
        }, 
        text: { 
          fill: 'var(--text-secondary-color)',
          fontSize: isFullScreen ? 12 : 11,
          fontFamily: 'var(--font-family)'
        } 
      },
      legend: {
        text: {
          fill: 'var(--text-secondary-color)',
          fontSize: isFullScreen ? 13 : 12,
          fontFamily: 'var(--font-family)',
          fontWeight: 500
        }
      }
    },
    grid: {
      line: { 
        stroke: 'rgba(255, 255, 255, 0.07)', 
        strokeWidth: 1, 
        strokeDasharray: '2 4' 
      }
    },
    tooltip: {
      container: {
        background: 'rgba(22, 23, 27, 0.94)',
        color: '#E8EAED',
        fontSize: 12,
        borderRadius: '10px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)',
        padding: '12px 16px',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        fontFamily: 'var(--font-family)'
      }
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', minHeight: isFullScreen ? '600px' : '300px', position: 'relative' }}>
      <ResponsiveBoxPlot
        data={nivoData}
        groupBy="group"
        layout="vertical"
        valueScale={{ type: 'linear', min: dataMin - padding, max: dataMax + padding }}
        margin={{ 
          top: isFullScreen ? 35 : 25, 
          right: isFullScreen ? 40 : 30, 
          bottom: isFullScreen ? 70 : 60, 
          left: isFullScreen ? 70 : 60 
        }}
        padding={0.35}
        enableGridY={true}
        enableGridX={false}
        axisBottom={{
          tickSize: 0,
          tickPadding: 10,
          tickRotation: isFullScreen ? 0 : -15,
          legend: effectiveGroupKey,
          legendPosition: 'middle',
          legendOffset: isFullScreen ? 45 : 40
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 10,
          tickRotation: 0,
          legend: effectiveValueKey,
          legendPosition: 'middle',
          legendOffset: isFullScreen ? -50 : -45
        }}
        colors={CHART_COLORS}
        borderRadius={4}
        borderWidth={1.5}
        borderColor={{
          from: 'color',
          modifiers: [['darker', 0.2]]
        }}
        medianWidth={2.5}
        medianColor={isDark ? "#ffffff" : "#202124"}
        whiskerWidth={1.5}
        whiskerEndSize={0.4}
        whiskerColor={{
          from: 'color',
          modifiers: [['darker', 0.4]]
        }}
        motionConfig="gentle"
        theme={chartTheme as any}
      />
    </div>
  );
};
