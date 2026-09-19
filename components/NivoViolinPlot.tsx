import React from 'react';
import Plot from 'react-plotly.js';
import type { ViolinPlotDataKeys } from '../types';
import { CHART_COLORS } from '../constants';

interface PlotlyViolinPlotProps {
  data: Array<Record<string, any>>;
  dataKeys: ViolinPlotDataKeys;
  chartIndex: number;
  isFullScreen: boolean;
}

export const NivoViolinPlot: React.FC<PlotlyViolinPlotProps> = ({ 
  data, 
  dataKeys, 
  chartIndex, 
  isFullScreen 
}) => {
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
        No data available for Violin Plot
      </div>
    );
  }

  const traces = data.map((categoryData, idx) => {
    const categoryName = categoryData[dataKeys.categoryKey];
    const yValues = categoryData[dataKeys.yKey];
    
    // Ensure yValues is an array with numbers
    if (!Array.isArray(yValues) || yValues.length === 0) {
      console.warn(`No valid y values for category: ${categoryName}`, categoryData);
      return null;
    }
    
    const color = CHART_COLORS[(chartIndex + idx) % CHART_COLORS.length];
    return {
      type: 'violin' as const,
      y: yValues,
      name: String(categoryName),
      points: 'outliers' as const,
      marker: {
        size: 4,
        color: color,
        opacity: 0.8,
        line: {
          color: '#ffffff',
          width: 0.5
        }
      },
      box: {
        visible: true,
        width: 0.2,
        fillcolor: 'rgba(255, 255, 255, 0.08)',
        line: {
          color: color,
          width: 1.5
        }
      },
      meanline: {
        visible: true,
        color: '#ffffff',
        width: 2
      },
      line: {
        color: color,
        width: 1.5
      },
      fillcolor: color,
      opacity: 0.65,
      x0: String(categoryName),
      hoveron: 'violins+points+kde' as const
    };
  }).filter(trace => trace !== null);

  return (
    <Plot
      data={traces}
      layout={{
        showlegend: data.length > 1,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: {
          color: 'var(--text-color)',
          family: 'Google Sans, Inter, Roboto, sans-serif'
        },
        hoverlabel: {
          bgcolor: 'rgba(22, 23, 27, 0.94)',
          bordercolor: 'rgba(255, 255, 255, 0.12)',
          font: {
            family: 'Google Sans, Inter, Roboto, sans-serif',
            color: '#F1F3F4',
            size: 12
          }
        },
        xaxis: {
          showgrid: false,
          zeroline: false,
          showline: false,
          color: 'var(--text-color)',
          tickfont: {
            size: isFullScreen ? 13 : 11,
            color: 'var(--text-secondary-color)',
            family: 'Google Sans, Inter, Roboto, sans-serif'
          },
          title: {
            text: '',
            font: {
              size: isFullScreen ? 14 : 12,
              color: 'var(--text-color)'
            }
          }
        },
        yaxis: {
          showgrid: true,
          gridcolor: 'rgba(255, 255, 255, 0.07)',
          gridwidth: 1,
          griddash: 'dot',
          showline: false,
          zeroline: false,
          color: 'var(--text-secondary-color)',
          tickfont: {
            size: isFullScreen ? 12 : 11,
            color: 'var(--text-secondary-color)',
            family: 'Google Sans, Inter, Roboto, sans-serif'
          }
        },
        margin: {
          l: isFullScreen ? 70 : 50,
          r: isFullScreen ? 30 : 20,
          t: isFullScreen ? 30 : 20,
          b: isFullScreen ? 50 : 35
        },
        autosize: true
      }}
      config={{
        responsive: true,
        displayModeBar: isFullScreen,
        displaylogo: false
      }}
      style={{ width: '100%', height: '100%' }}
      useResizeHandler={true}
    />
  );
};
