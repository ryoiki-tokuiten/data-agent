import React from 'react';
import Plot from 'react-plotly.js';
import type { BubbleChartDataKeys } from '../types';
import { CHART_COLORS } from '../utils/constants';

interface PlotlyBubbleChartProps {
    data: any[];
    dataKeys: BubbleChartDataKeys;
    chartIndex: number;
    isFullScreen?: boolean;
    title?: string;
}

export const PlotlyBubbleChart: React.FC<PlotlyBubbleChartProps> = ({
    data,
    dataKeys,
    chartIndex,
    isFullScreen = false,
    title
}) => {
    // Sanitize and group data by category
    const sanitizedData = React.useMemo(() => {
        return data.map(point => ({
            ...point,
            [dataKeys.xAxis]: parseFloat(point[dataKeys.xAxis]),
            [dataKeys.yAxis]: parseFloat(point[dataKeys.yAxis]),
            [dataKeys.zAxis]: parseFloat(point[dataKeys.zAxis])
        })).filter(point => 
            !isNaN(point[dataKeys.xAxis]) &&
            !isNaN(point[dataKeys.yAxis]) &&
            !isNaN(point[dataKeys.zAxis]) &&
            point[dataKeys.zAxis] > 0
        );
    }, [data, dataKeys]);

    // Group by category if categoryKey exists
    const traces = React.useMemo(() => {
        // Calculate proper size scaling - use area scaling, not diameter
        const allSizes = sanitizedData.map(d => d[dataKeys.zAxis]);
        const maxSize = Math.max(...allSizes);
        const minSize = Math.min(...allSizes);
        
        // Normalize sizes to pixel range (6-40 for normal, 8-60 for fullscreen)
        const sizeRange = isFullScreen ? [8, 60] : [6, 40];
        const normalizeSizes = (sizes: number[]) => {
            if (maxSize === minSize) return sizes.map(() => (sizeRange[0] + sizeRange[1]) / 2);
            return sizes.map(s => sizeRange[0] + ((s - minSize) / (maxSize - minSize)) * (sizeRange[1] - sizeRange[0]));
        };
        
        if (!dataKeys.categoryKey) {
            // Single trace
            const normalizedSizes = normalizeSizes(sanitizedData.map(d => d[dataKeys.zAxis]));
            
            return [{
                x: sanitizedData.map(d => d[dataKeys.xAxis]),
                y: sanitizedData.map(d => d[dataKeys.yAxis]),
                mode: 'markers' as const,
                marker: {
                    size: normalizedSizes,
                    color: CHART_COLORS[chartIndex % CHART_COLORS.length],
                    opacity: 0.7,
                    line: {
                        color: CHART_COLORS[chartIndex % CHART_COLORS.length],
                        width: 2
                    }
                },
                text: sanitizedData.map(d => {
                    const label = dataKeys.labelKey ? d[dataKeys.labelKey] : '';
                    return `${dataKeys.xAxis}: ${d[dataKeys.xAxis]}<br>${dataKeys.yAxis}: ${d[dataKeys.yAxis]}<br>${dataKeys.zAxis}: ${d[dataKeys.zAxis]}${label ? `<br>${label}` : ''}`;
                }),
                hovertemplate: '%{text}<extra></extra>',
                name: title || 'Data',
                type: 'scatter' as const
            }];
        }

        // Multiple traces by category
        const categories = [...new Set(sanitizedData.map(d => d[dataKeys.categoryKey!]))];
        
        return categories.map((category, idx) => {
            const categoryData = sanitizedData.filter(d => d[dataKeys.categoryKey!] === category);
            const color = CHART_COLORS[(chartIndex + idx) % CHART_COLORS.length];
            const categorySizes = categoryData.map(d => d[dataKeys.zAxis]);
            const normalizedSizes = normalizeSizes(categorySizes);
            
            return {
                x: categoryData.map(d => d[dataKeys.xAxis]),
                y: categoryData.map(d => d[dataKeys.yAxis]),
                mode: 'markers' as const,
                marker: {
                    size: normalizedSizes,
                    color: color,
                    opacity: 0.72,
                    line: {
                        color: 'rgba(255, 255, 255, 0.85)',
                        width: 1.2
                    }
                },
                text: categoryData.map(d => {
                    const label = dataKeys.labelKey ? d[dataKeys.labelKey] : '';
                    return `${category}<br>${dataKeys.xAxis}: ${d[dataKeys.xAxis]}<br>${dataKeys.yAxis}: ${d[dataKeys.yAxis]}<br>${dataKeys.zAxis}: ${d[dataKeys.zAxis]}${label ? `<br>${label}` : ''}`;
                }),
                hovertemplate: '%{text}<extra></extra>',
                name: String(category),
                type: 'scatter' as const
            };
        });
    }, [sanitizedData, dataKeys, chartIndex, title, isFullScreen]);

    const layout: Partial<Plotly.Layout> = {
        font: {
            family: 'Google Sans, Inter, Roboto, sans-serif',
            color: 'var(--text-color)'
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
            title: {
                text: dataKeys.xAxis,
                font: {
                    size: isFullScreen ? 14 : 12,
                    color: 'var(--text-color)'
                }
            },
            gridcolor: 'rgba(255, 255, 255, 0.07)',
            gridwidth: 1,
            griddash: 'dot',
            showline: false,
            tickfont: {
                size: isFullScreen ? 12 : 11,
                color: 'var(--text-secondary-color)'
            },
            zeroline: false,
            showspikes: isFullScreen,
            spikemode: 'across',
            spikesnap: 'cursor',
            spikecolor: 'rgba(138, 180, 248, 0.4)',
            spikethickness: 1
        },
        yaxis: {
            title: {
                text: dataKeys.yAxis,
                font: {
                    size: isFullScreen ? 14 : 12,
                    color: 'var(--text-color)'
                }
            },
            gridcolor: 'rgba(255, 255, 255, 0.07)',
            gridwidth: 1,
            griddash: 'dot',
            showline: false,
            tickfont: {
                size: isFullScreen ? 12 : 11,
                color: 'var(--text-secondary-color)'
            },
            zeroline: false,
            showspikes: isFullScreen,
            spikemode: 'across',
            spikesnap: 'cursor',
            spikecolor: 'rgba(138, 180, 248, 0.4)',
            spikethickness: 1
        },
        hovermode: 'closest',
        dragmode: isFullScreen ? 'zoom' : 'pan',
        showlegend: dataKeys.categoryKey ? true : false,
        legend: {
            orientation: 'v' as const,
            x: 1.02,
            y: 1,
            font: {
                size: isFullScreen ? 13 : 12,
                color: 'var(--text-secondary-color)',
                family: 'Google Sans, Inter, Roboto, sans-serif'
            },
            bgcolor: 'rgba(22, 23, 27, 0.88)',
            bordercolor: 'rgba(255, 255, 255, 0.08)',
            borderwidth: 1
        },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        margin: {
            l: isFullScreen ? 70 : 60,
            r: isFullScreen ? 120 : 80,
            t: 20,
            b: isFullScreen ? 60 : 50
        },
        modebar: {
            bgcolor: 'rgba(var(--card-bg-color-rgb), 0.8)',
            color: 'var(--text-secondary-color)',
            activecolor: 'var(--glow-color)'
        }
    };

    const config: Partial<Plotly.Config> = {
        responsive: true,
        displayModeBar: isFullScreen,
        modeBarButtonsToRemove: ['lasso2d'],
        modeBarButtonsToAdd: ['select2d', 'lasso2d'] as any,
        displaylogo: false,
        toImageButtonOptions: {
            format: 'png',
            filename: title || 'bubble-chart',
            height: 1200,
            width: 1600,
            scale: 2
        }
    };

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Plot
                data={traces}
                layout={layout}
                config={config}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler={true}
            />
        </div>
    );
};
