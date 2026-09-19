

import React, { forwardRef, useRef, useMemo, useState, useCallback, useEffect } from 'react';
import {
    ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    AreaChart, Area, ComposedChart,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList, ErrorBar, Brush
} from 'recharts';
import { SankeyDiagram } from './SankeyDiagram';
import { TreeMap } from './TreeMap';
import { PolarBar } from './PolarBar';
import { RadialBar } from './RadialBar';
import { WaffleChart } from './WaffleChart';
import { NivoViolinPlot } from './NivoViolinPlot';
import { NivoBoxPlot } from './NivoBoxPlot';
import { Choropleth } from './Choropleth';
import { NivoCalendar } from './NivoCalendar';
import { NivoTimeRange } from './NivoTimeRange';
import { NivoScatterPlot } from './NivoScatterPlot';
import { PlotlyBubbleChart } from './PlotlyBubbleChart';

import type { ChartSpec, BarLineAreaDataKeys, PieDataKeys, ScatterDataKeys, PolarBarData, PolarBarDataKeys, RadialBarData, DataTableDataKeys, DataTableColumn, ComposedChartDataKeys, HeatmapDataKeys, BoxPlotDataKeys, ViolinPlotDataKeys, StreamgraphDataKeys, BubbleChartDataKeys, SankeyData, TreeMapData, ChoroplethData, ChoroplethDataKeys, CalendarDataKeys, TimeRangeDataKeys, WaffleChartDataKeys, WaffleChartDataItem } from '../types';
import { CHART_COLORS, hexToRgba } from '../utils/constants';
import PipelineStageErrorBoundary from './PipelineStageErrorBoundary';
import { FiDownload, FiMaximize2, FiMinimize2, FiBarChart2, FiDatabase } from 'react-icons/fi';
import { MdOutlineDownloadForOffline } from 'react-icons/md';
import { EditableDataTable } from './EditableDataTable';
import { toPng } from 'html-to-image';
import './ChartInteractivity.css';
import { JSX } from 'react/jsx-runtime';

interface ChartDisplayProps {
    chartSpec: ChartSpec;
    chartIndex: number;
    isFullScreen: boolean;
    onToggleFullScreen: () => void;
    onRemove?: () => void;
    onDataChange?: (newData: any[]) => void;
}

type LegendType = 'line' | 'plainline' | 'square' | 'rect' | 'circle' | 'cross' | 'diamond' | 'star' | 'triangle' | 'wye' | 'none';

interface LegendPayloadItem {
    value: any;
    type?: LegendType;
    id?: any;
    color?: string;
    payload?: { dataKey?: string, name?: string, color?: string, stroke?: string, fill?: string, [key: string]: any };
}

type SortConfig = {
    key: string;
    direction: 'ascending' | 'descending';
} | null;


const parseRgb = (rgbString: string): [number, number, number] | null => {
    const match = rgbString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/) || rgbString.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),.*\)$/);
    if (match) {
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
    const directMatch = rgbString.match(/^(\d+),\s*(\d+),\s*(\d+)$/);
    if (directMatch) {
        return [parseInt(directMatch[1]), parseInt(directMatch[2]), parseInt(directMatch[3])];
    }
    return null;
};

const interpolateColor = (color1Rgb: [number, number, number], color2Rgb: [number, number, number], factor: number): string => {
    const r = Math.round(color1Rgb[0] + factor * (color2Rgb[0] - color1Rgb[0]));
    const g = Math.round(color1Rgb[1] + factor * (color2Rgb[1] - color1Rgb[1]));
    const b = Math.round(color1Rgb[2] + factor * (color2Rgb[2] - color1Rgb[2]));
    return `rgb(${r}, ${g}, ${b})`;
};

const tooltipStyleBase: React.CSSProperties = {
    backgroundColor: 'rgba(24, 25, 28, 0.95)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '10px',
    color: '#E8EAED',
    padding: '10px 14px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    fontFamily: 'var(--font-family)',
    fontSize: '0.8125rem',
    lineHeight: '1.5',
};

const chartNoDataStyle: React.CSSProperties = {
    color: 'var(--text-secondary-color)',
    textAlign: 'center',
    padding: '2rem 1rem',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    fontStyle: 'italic',
};

export const ChartDisplay = forwardRef<HTMLDivElement, ChartDisplayProps>(({ chartSpec, chartIndex, isFullScreen, onToggleFullScreen, onRemove, onDataChange }, ref) => {
    const { chartType, title, dataKeys, description, trendline, confidenceInterval } = chartSpec;
    const chartRenderAreaRef = useRef<HTMLDivElement>(null);
    
    // Use local state for data to enable real-time editing
    const [localData, setLocalData] = useState(chartSpec.data);
    
    // Sync local data when chartSpec.data changes from external source
    useEffect(() => {
        console.log('[ChartDisplay] Syncing data from chartSpec for:', title, 'Data length:', Array.isArray(chartSpec.data) ? chartSpec.data.length : 'N/A');
        setLocalData(chartSpec.data);
    }, [chartSpec.data, title]);
    
    // Use localData instead of chartSpec.data
    const data = localData;
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [hiddenLegendKeys, setHiddenLegendKeys] = useState<string[]>([]);
    const [hoveredSeriesKey, setHoveredSeriesKey] = useState<string | null>(null);
    const heatmapTableRef = useRef<HTMLTableElement>(null);

    // Enhanced interactivity states
    const [showStatistics, setShowStatistics] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [showDataTable, setShowDataTable] = useState(false);
    const exportDropdownRef = useRef<HTMLDivElement>(null);

    // Compute quick statistics for the Google-style metric chips
    const quickStats = useMemo(() => {
        if (!Array.isArray(data) || data.length === 0) return null;
        const keys = dataKeys as any;
        if (!keys || !keys.yAxis) return null;
        const yKeys = Array.isArray(keys.yAxis) ? keys.yAxis : [keys.yAxis];
        if (yKeys.length === 0) return null;

        const validStats = yKeys.slice(0, 3).map((key: string, idx: number) => {
            const values = data
                .map(d => parseFloat(d[key]))
                .filter(v => !isNaN(v) && isFinite(v));
            if (values.length === 0) return null;

            const min = Math.min(...values);
            const max = Math.max(...values);
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            const latest = values[values.length - 1];
            const color = CHART_COLORS[(chartIndex + idx) % CHART_COLORS.length];

            const formatVal = (v: number) => (Math.abs(v) >= 1000 ? v.toLocaleString() : (v % 1 === 0 ? v.toString() : v.toFixed(1)));

            return {
                key,
                min: formatVal(min),
                max: formatVal(max),
                avg: formatVal(avg),
                latest: formatVal(latest),
                color
            };
        }).filter(Boolean);

        return validStats.length > 0 ? validStats : null;
    }, [data, dataKeys, chartIndex]);

    const shouldRenderTrendline = useMemo(() => {
        if (chartType !== 'ScatterPlot' && chartType !== 'BubbleChart' && chartType !== 'ComplexPlanePlot') {
            return false;
        }
        if (!trendline) return false;
        if ((trendline as any).forceHide) return false;
        if ((trendline as any).forceDisplay) return true;
        const significantPValue = typeof trendline.pValue === 'number' && trendline.pValue <= 0.05;
        const strongRSquared = typeof trendline.rSquared === 'number' && trendline.rSquared >= 0.4;
        return significantPValue || strongRSquared;
    }, [chartType, trendline]);


    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
                setShowExportDropdown(false);
            }
        };

        if (showExportDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showExportDropdown]);

    // Export chart data to CSV
    const exportToCSV = useCallback(() => {
        if (!Array.isArray(data) || data.length === 0) return;

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title || 'chart-data'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setShowExportDropdown(false);
    }, [data, title]);

    // Export chart as SVG with theme styling using html-to-image
    const exportAsSVG = useCallback(async (theme: 'dark' | 'light') => {
        const chartElement = chartRenderAreaRef.current;
        if (!chartElement) return;

        try {
            // Define theme colors
            const themeColors = theme === 'dark' ? {
                bgColor: '#0f0f23',
                cardBgColor: '#1a1a2e',
                textColor: '#e0e0e0',
                textSecondaryColor: '#a0a0a0',
                borderColor: '#2a2a3e'
            } : {
                bgColor: '#ffffff',
                cardBgColor: '#f8f9fa',
                textColor: '#1a1a1a',
                textSecondaryColor: '#4a4a4a',
                borderColor: '#e0e0e0'
            };

            // Temporarily apply theme styles to the chart element
            const originalBg = chartElement.style.backgroundColor;
            const originalColor = chartElement.style.color;
            chartElement.style.backgroundColor = themeColors.bgColor;
            chartElement.style.color = themeColors.textColor;

            // Generate high-quality PNG (SVG export has issues with complex charts)
            const dataUrl = await toPng(chartElement, {
                quality: 1.0,
                pixelRatio: 3, // 3x resolution for high quality
                backgroundColor: themeColors.bgColor,
                cacheBust: true,
                style: {
                    backgroundColor: themeColors.bgColor,
                    color: themeColors.textColor
                }
            });

            // Restore original styles
            chartElement.style.backgroundColor = originalBg;
            chartElement.style.color = originalColor;

            // Download the image
            const link = document.createElement('a');
            link.download = `${title || 'chart'}-${theme}.png`;
            link.href = dataUrl;
            link.click();

            setShowExportDropdown(false);
        } catch (error) {
            console.error('Error exporting chart:', error);
            setShowExportDropdown(false);
        }
    }, [title]);

    // Calculate comprehensive statistics for numeric data
    const calculateStatistics = useCallback((dataArray: any[], key: string) => {
        const values = dataArray
            .map(d => parseFloat(d[key]))
            .filter(v => !isNaN(v) && isFinite(v));

        if (values.length === 0) return null;

        const sorted = [...values].sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        const n = values.length;

        // Median
        const median = n % 2 === 0
            ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
            : sorted[Math.floor(n / 2)];

        // Quartiles
        const q1Index = Math.floor(n * 0.25);
        const q3Index = Math.floor(n * 0.75);
        const q1 = sorted[q1Index];
        const q3 = sorted[q3Index];
        const iqr = q3 - q1;

        // Variance and Standard Deviation
        const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        // Coefficient of Variation (CV)
        const cv = mean !== 0 ? (stdDev / Math.abs(mean)) * 100 : 0;

        // Skewness (measure of asymmetry)
        const skewness = values.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0) / n;

        // Kurtosis (measure of tailedness)
        const kurtosis = values.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 4), 0) / n - 3;

        // Range
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const range = max - min;

        // Outliers (using IQR method)
        const lowerFence = q1 - 1.5 * iqr;
        const upperFence = q3 + 1.5 * iqr;
        const outliers = values.filter(v => v < lowerFence || v > upperFence);

        // Mode (most frequent value, rounded to 2 decimals for grouping)
        const frequency: Record<string, number> = {};
        values.forEach(v => {
            const rounded = v.toFixed(2);
            frequency[rounded] = (frequency[rounded] || 0) + 1;
        });
        const maxFreq = Math.max(...Object.values(frequency));
        const modes = Object.keys(frequency).filter(k => frequency[k] === maxFreq).map(parseFloat);
        const mode = modes.length < values.length / 2 ? modes[0] : null; // Only if meaningful

        return {
            mean,
            median,
            mode,
            stdDev,
            variance,
            cv,
            skewness,
            kurtosis,
            min,
            max,
            range,
            q1,
            q3,
            iqr,
            count: values.length,
            outlierCount: outliers.length,
            outlierPercentage: (outliers.length / values.length) * 100
        };
    }, []);

    // Handle data changes from editable table
    const handleDataChange = useCallback((newData: any[]) => {
        console.log('[ChartDisplay] handleDataChange called for:', title, 'New data length:', newData.length);
        // Update local state immediately for instant UI feedback
        setLocalData(newData);
        // Persist to store for permanent storage
        if (onDataChange) {
            console.log('[ChartDisplay] Calling onDataChange callback');
            onDataChange(newData);
        } else {
            console.warn('[ChartDisplay] No onDataChange callback provided!');
        }
    }, [onDataChange, title]);


    const handleLegendClick = useCallback((item: LegendPayloadItem) => {
        const keyToToggle = item.payload?.dataKey || item.value;
        if (keyToToggle) {
            setHiddenLegendKeys(prev =>
                prev.includes(keyToToggle)
                    ? prev.filter(k => k !== keyToToggle)
                    : [...prev, keyToToggle]
            );
        }
    }, []);

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // Compute filtered data based on active filters
    const filteredData = data;

    // Check if chart type supports statistics
    const supportsStatistics = useMemo(() => {
        const supportedTypes = [
            'BarChart', 'LineChart', 'AreaChart', 'ScatterPlot', 'BubbleChart',
            'StackedBarChart', 'ComposedChart', 'Streamgraph', 'BoxPlot',
            'FrequencySpectrumPlot', 'MultiLineRateOfChangePlot', 'ComplexPlanePlot'
        ];
        return supportedTypes.includes(chartType);
    }, [chartType]);

    // Compute statistics for current view
    const currentStatistics = useMemo(() => {
        if (!supportsStatistics || !Array.isArray(filteredData) || filteredData.length === 0) return null;

        const stats: Record<string, any> = {};
        const keys = dataKeys as any;

        if (keys.yAxis) {
            const yKeys = Array.isArray(keys.yAxis) ? keys.yAxis : [keys.yAxis];
            yKeys.forEach((key: string) => {
                stats[key] = calculateStatistics(filteredData, key);
            });
        }

        return stats;
    }, [supportsStatistics, filteredData, dataKeys, calculateStatistics]);

    const sortedTableData = useMemo(() => {
        if (chartType !== 'DataTable' || !sortConfig || !Array.isArray(data)) {
            return data;
        }
        const dataToSort = [...data];
        dataToSort.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
        return dataToSort;
    }, [data, sortConfig, chartType]);

    useEffect(() => {
        if (chartType === 'Heatmap' || chartType === 'CorrelationHeatmap') {
            const table = heatmapTableRef.current;
            if (!table) return;

            const handleMouseOver = (event: MouseEvent) => {
                const target = event.target as HTMLElement;
                if (target.tagName === 'TD' && target.classList.contains('heatmap-cell')) {
                    target.style.backgroundColor = 'var(--accent-purple-dark)';
                    target.style.color = 'var(--text-color)';
                    target.style.boxShadow = 'inset 0 0 8px rgba(var(--accent-purple-rgb), 0.5)';
                }
            };
            const handleMouseOut = (event: MouseEvent) => {
                const target = event.target as HTMLElement;
                if (target.tagName === 'TD' && target.classList.contains('heatmap-cell')) {
                    target.style.backgroundColor = target.dataset.originalBgcolor || '';
                    target.style.color = target.dataset.originalColor || '';
                    target.style.boxShadow = 'none';
                }
            };
            table.addEventListener('mouseover', handleMouseOver);
            table.addEventListener('mouseout', handleMouseOut);
            return () => {
                table.removeEventListener('mouseover', handleMouseOver);
                table.removeEventListener('mouseout', handleMouseOut);
            };
        }
    }, [chartType, data, dataKeys]);


    const renderChartContent = () => {
        const displayData = filteredData || data;

        if (!displayData || (Array.isArray(displayData) && displayData.length === 0)) {
            return <p style={chartNoDataStyle}>No data available for {title || chartType}.</p>;
        }

        const axisStrokeColor = 'transparent';
        const axisTickStyleProps = {
            fontSize: isFullScreen ? '12px' : '11px',
            fill: 'var(--text-secondary-color)',
            fontFamily: 'var(--font-family)',
            fontWeight: 400
        };
        const axisLabelStyleProps = {
            fontSize: isFullScreen ? '13px' : '12px',
            fill: 'var(--text-secondary-color)',
            fontFamily: 'var(--font-family)',
            fontWeight: 500
        };
        const legendStyle: React.CSSProperties = { fontSize: isFullScreen ? '13px' : '12px', color: 'var(--text-secondary-color)', fontFamily: 'var(--font-family)', paddingTop: '15px', cursor: 'pointer' };
        const gridStrokeColor = 'var(--grid-line-color, rgba(128, 128, 128, 0.12))';
        const gridStrokeDasharray = "2 4";

        const baseColor = CHART_COLORS[chartIndex % CHART_COLORS.length];
        const ciBandColor = CHART_COLORS[(chartIndex + 4) % CHART_COLORS.length];
        const showDots = Array.isArray(displayData) && displayData.length <= 25;

        const renderActiveDot = (color: string) => (props: any) => {
            const { cx, cy } = props;
            if (cx === undefined || cy === undefined) return null;
            return (
                <g key={`activedot-${cx}-${cy}`}>
                    <circle cx={cx} cy={cy} r={9} fill={color} fillOpacity={0.25} />
                    <circle cx={cx} cy={cy} r={4.5} fill={color} stroke="var(--card-bg-color, #121316)" strokeWidth={2} />
                </g>
            );
        };

        const renderDefs = (keys: string[], ciKey?: string) => (
            <defs>
                {keys.map((key, idx) => {
                    const color = CHART_COLORS[(chartIndex + idx) % CHART_COLORS.length];
                    return (
                        <linearGradient key={`grad-${chartIndex}-${key}`} id={`grad-${chartIndex}-${key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={color} stopOpacity={0.01} />
                        </linearGradient>
                    );
                })}
                {ciKey && (
                    <linearGradient id={`ci-grad-${chartIndex}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ciBandColor} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={ciBandColor} stopOpacity={0.03} />
                    </linearGradient>
                )}
            </defs>
        );

        const GoogleChartTooltip = ({ active, payload, label }: any) => {
            if (!active || !payload || !payload.length) return null;
            return (
                <div className="google-chart-tooltip">
                    {label !== undefined && label !== null && label !== '' && (
                        <div className="google-chart-tooltip-header">
                            <span className="google-chart-tooltip-label">{String(label)}</span>
                        </div>
                    )}
                    <div className="google-chart-tooltip-body">
                        {payload.map((entry: any, index: number) => {
                            if (entry.value === undefined || entry.value === null) return null;
                            const color = entry.color || entry.stroke || entry.fill || '#8AB4F8';
                            const name = entry.name || entry.dataKey || `Series ${index + 1}`;
                            const rawVal = entry.value;
                            const formattedVal = typeof rawVal === 'number'
                                ? (Number.isInteger(rawVal) ? rawVal.toLocaleString() : rawVal.toFixed(2))
                                : String(rawVal);
                            return (
                                <div key={`tooltip-${index}`} className="google-chart-tooltip-item">
                                    <span className="google-chart-tooltip-dot" style={{ backgroundColor: color }} />
                                    <span className="google-chart-tooltip-name">{name}</span>
                                    <span className="google-chart-tooltip-value">{formattedVal}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        };

        const legendComponent = <Legend
            wrapperStyle={legendStyle}
            onClick={handleLegendClick as any}
            onMouseEnter={(e: any) => {
                const key = e?.dataKey || e?.value;
                if (key) setHoveredSeriesKey(String(key));
            }}
            onMouseLeave={() => setHoveredSeriesKey(null)}
            formatter={((label: React.ReactNode, entry: any) => {
                const key = entry?.payload?.dataKey ?? entry?.value ?? label;
                const keyString = typeof key === 'string' ? key : key != null ? String(key) : '';
                const isHidden = hiddenLegendKeys.includes(keyString);
                const isHovered = hoveredSeriesKey === keyString;
                const displayLabel = typeof label === 'string' || typeof label === 'number'
                    ? String(label)
                    : keyString;
                return (
                    <span
                        className={`google-legend-item ${isHidden ? 'inactive' : ''} ${isHovered ? 'active' : ''}`}
                        style={{ cursor: 'pointer', fontWeight: isHovered ? 600 : 400, opacity: isHidden ? 0.35 : 1 }}
                    >
                        {displayLabel}
                    </span>
                );
            }) as any}
        />;

        const CustomBrushHandle = (props: any) => {
            const { x, y, width, height, stroke } = props;
            const handleWidth = 8;
            const handleHeight = height * 0.8;
            const handleY = y + (height - handleHeight) / 2;

            return (
                <g transform={`translate(${x + width / 2 - handleWidth / 2}, ${handleY})`}>
                    <path
                        d={`M 0 0 V ${handleHeight} M ${handleWidth} 0 V ${handleHeight}`}
                        stroke={stroke}
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                    />
                    <rect
                        x={-handleWidth / 2}
                        y={-2}
                        width={handleWidth * 2}
                        height={handleHeight + 4}
                        fill="rgba(255,255,255,0.01)"
                    />
                </g>
            );
        };

        const brushComponent = (xAxisKey: string | undefined) => xAxisKey ?
            <Brush
                dataKey={xAxisKey}
                height={30}
                stroke={baseColor}
                fill="rgba(var(--card-bg-base-rgb), 0.3)"
                travellerWidth={12}
                gap={5}
                traveller={<CustomBrushHandle />}
            /> : null;


        switch (chartType) {
            case 'BarChart':
            case 'StackedBarChart':
            case 'FrequencySpectrumPlot': {
                const keys = dataKeys as BarLineAreaDataKeys;
                const yAxisKeys = Array.isArray(keys.yAxis) ? keys.yAxis : [keys.yAxis as string];
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={displayData as any[]}
                            margin={{ top: 12, right: isFullScreen ? 35 : 15, left: isFullScreen ? 5 : -15, bottom: isFullScreen ? 25 : 10 }}
                            barGap={chartType === 'FrequencySpectrumPlot' ? 0 : 4}
                            barCategoryGap={chartType === 'FrequencySpectrumPlot' ? '10%' : '24%'}
                            onMouseLeave={() => setHoveredSeriesKey(null)}
                        >
                            {renderDefs(yAxisKeys, confidenceInterval?.dataKey)}
                            <CartesianGrid strokeDasharray={gridStrokeDasharray} stroke={gridStrokeColor} vertical={false} />
                            <XAxis
                                dataKey={keys.xAxis}
                                axisLine={{ stroke: 'var(--border-color, rgba(128, 128, 128, 0.15))' }}
                                tickLine={false}
                                tick={axisTickStyleProps}
                                dy={8}
                                label={{ ...axisLabelStyleProps, value: keys.xAxis, position: 'insideBottom', offset: isFullScreen ? -20 : -10 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={axisTickStyleProps}
                                dx={-6}
                                label={{ ...axisLabelStyleProps, value: Array.isArray(keys.yAxis) ? 'Value' : keys.yAxis as string, angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip content={<GoogleChartTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }} />
                            {legendComponent}
                            {isFullScreen && brushComponent(keys.xAxis)}
                            {confidenceInterval && confidenceInterval.dataKey && Array.isArray(data) && data.length > 0 && typeof (data as any[])[0]?.[confidenceInterval.dataKey]?.[0] === 'number' && !hiddenLegendKeys.includes(confidenceInterval.dataKey) && (
                                <Area
                                    type="monotone"
                                    dataKey={confidenceInterval.dataKey}
                                    stroke={ciBandColor}
                                    fill={`url(#ci-grad-${chartIndex})`}
                                    strokeDasharray="3 3"
                                    strokeWidth={1}
                                    strokeOpacity={0.4}
                                    name="Confidence Band"
                                    isAnimationActive={true}
                                />
                            )}
                            {yAxisKeys.map((yKey, index) => {
                                if (hiddenLegendKeys.includes(yKey)) return null;
                                const color = CHART_COLORS[(chartIndex + index) % CHART_COLORS.length];
                                const isHovered = hoveredSeriesKey === yKey;
                                const isMuted = hoveredSeriesKey !== null && !isHovered;
                                return (
                                    <Bar
                                        key={yKey}
                                        dataKey={yKey}
                                        name={yKey}
                                        fill={color}
                                        fillOpacity={isMuted ? 0.25 : 0.9}
                                        radius={[6, 6, 0, 0]}
                                        stackId={chartType === 'StackedBarChart' ? "a" : undefined}
                                        barSize={chartType === 'FrequencySpectrumPlot' ? undefined : (isFullScreen ? 28 : 22)}
                                        onMouseEnter={() => setHoveredSeriesKey(yKey)}
                                        onMouseLeave={() => setHoveredSeriesKey(null)}
                                        style={{ cursor: 'pointer', transition: 'fill-opacity 0.2s ease' }}
                                    >
                                        {keys.errorKey && <ErrorBar dataKey={keys.errorKey} width={6} strokeWidth={2} stroke={CHART_COLORS[(chartIndex + index + 5) % CHART_COLORS.length]} direction="y" />}
                                    </Bar>
                                );
                            })}
                        </BarChart>
                    </ResponsiveContainer>
                );
            }
            case 'LineChart':
            case 'MultiLineRateOfChangePlot': {
                const keys = dataKeys as BarLineAreaDataKeys;
                const yAxisKeys = Array.isArray(keys.yAxis) ? keys.yAxis : [keys.yAxis as string];
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={displayData as any[]}
                            margin={{ top: 12, right: isFullScreen ? 35 : 15, left: isFullScreen ? 5 : -15, bottom: isFullScreen ? 25 : 10 }}
                            onMouseLeave={() => setHoveredSeriesKey(null)}
                        >
                            {renderDefs(yAxisKeys, confidenceInterval?.dataKey)}
                            <CartesianGrid strokeDasharray={gridStrokeDasharray} stroke={gridStrokeColor} vertical={false} />
                            <XAxis
                                dataKey={keys.xAxis}
                                axisLine={{ stroke: 'var(--border-color, rgba(128, 128, 128, 0.15))' }}
                                tickLine={false}
                                tick={axisTickStyleProps}
                                dy={8}
                                label={{ ...axisLabelStyleProps, value: keys.xAxis, position: 'insideBottom', offset: isFullScreen ? -20 : -10 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={axisTickStyleProps}
                                dx={-6}
                                label={{ ...axisLabelStyleProps, value: Array.isArray(keys.yAxis) ? 'Value' : keys.yAxis as string, angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip
                                content={<GoogleChartTooltip />}
                                cursor={{ stroke: 'rgba(255, 255, 255, 0.3)', strokeWidth: 1.2, strokeDasharray: '3 3' }}
                            />
                            {legendComponent}
                            {isFullScreen && brushComponent(keys.xAxis)}
                            {confidenceInterval && confidenceInterval.dataKey && Array.isArray(data) && data.length > 0 && typeof (data as any[])[0]?.[confidenceInterval.dataKey]?.[0] === 'number' && !hiddenLegendKeys.includes(confidenceInterval.dataKey) && (
                                <Area
                                    type="monotone"
                                    dataKey={confidenceInterval.dataKey}
                                    stroke={ciBandColor}
                                    strokeDasharray="3 3"
                                    strokeWidth={1}
                                    strokeOpacity={0.5}
                                    fill={`url(#ci-grad-${chartIndex})`}
                                    name="Confidence Band"
                                    isAnimationActive={true}
                                />
                            )}
                            {yAxisKeys.map((yKey, index) => {
                                if (hiddenLegendKeys.includes(yKey)) return null;
                                const color = CHART_COLORS[(chartIndex + index) % CHART_COLORS.length];
                                const isHovered = hoveredSeriesKey === yKey;
                                const isMuted = hoveredSeriesKey !== null && !isHovered;
                                return (
                                    <Line
                                        key={yKey}
                                        type="monotone"
                                        dataKey={yKey}
                                        name={yKey}
                                        stroke={color}
                                        strokeWidth={isHovered ? 3.5 : 2.4}
                                        strokeOpacity={isMuted ? 0.2 : 1}
                                        dot={showDots ? { r: 3, fill: color, strokeWidth: 0 } : false}
                                        activeDot={renderActiveDot(color)}
                                        onMouseEnter={() => setHoveredSeriesKey(yKey)}
                                        onMouseLeave={() => setHoveredSeriesKey(null)}
                                        style={{ cursor: 'pointer', transition: 'stroke-opacity 0.2s ease, stroke-width 0.2s ease' }}
                                    >
                                        {keys.errorKey && <ErrorBar dataKey={keys.errorKey} width={6} strokeWidth={2} stroke={CHART_COLORS[(chartIndex + index + 5) % CHART_COLORS.length]} direction="y" />}
                                    </Line>
                                );
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                );
            }
            case 'PieChart': {
                const keys = dataKeys as PieDataKeys;
                const pieData = (displayData as any[]).filter(entry => !hiddenLegendKeys.includes(entry[keys.nameKey]));
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
                            <Pie
                                data={pieData}
                                dataKey={keys.dataKey}
                                nameKey={keys.nameKey}
                                cx="50%"
                                cy="50%"
                                innerRadius={isFullScreen ? "52%" : "48%"}
                                outerRadius={isFullScreen ? "78%" : "72%"}
                                paddingAngle={3}
                                cornerRadius={5}
                                labelLine={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                                style={{ cursor: 'pointer' }}
                            >
                                {pieData.map((_entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={CHART_COLORS[(chartIndex + index) % CHART_COLORS.length]}
                                        stroke="rgba(18, 19, 22, 0.85)"
                                        strokeWidth={2.5}
                                    />
                                ))}
                                <LabelList
                                    dataKey={keys.nameKey}
                                    position="outside"
                                    fill="var(--text-secondary-color)"
                                    stroke="none"
                                    fontSize={isFullScreen ? "12px" : "11px"}
                                    fontFamily="var(--font-family)"
                                    formatter={(label: React.ReactNode) => {
                                        const text = typeof label === 'string' ? label : String(label ?? '');
                                        return text.length > 18 ? `${text.substring(0, 15)}...` : text;
                                    }}
                                />
                            </Pie>
                            <Tooltip content={<GoogleChartTooltip />} />
                            {legendComponent}
                        </PieChart>
                    </ResponsiveContainer>
                );
            }
            case 'BubbleChart': {
                const keys = dataKeys as BubbleChartDataKeys;
                const rawChartData = data as any[];

                if (!Array.isArray(rawChartData) || rawChartData.length === 0) {
                    return <p style={chartNoDataStyle}>No data available for BubbleChart '{title}'.</p>;
                }

                return (
                    <PlotlyBubbleChart
                        data={rawChartData}
                        dataKeys={keys}
                        chartIndex={chartIndex}
                        isFullScreen={isFullScreen}
                        title={title}
                    />
                );
            }
            case 'ScatterPlot':
            case 'ComplexPlanePlot': {
                const keys = dataKeys as ScatterDataKeys;
                const rawChartData = data as any[];

                const sanitizedChartData = rawChartData.map(point => {
                    const newPoint = { ...point };
                    newPoint[keys.xAxis] = parseFloat(point[keys.xAxis]);
                    newPoint[keys.yAxis] = parseFloat(point[keys.yAxis]);
                    if (keys.zAxis) {
                        newPoint[keys.zAxis] = parseFloat(point[keys.zAxis]);
                    }
                    return newPoint;
                }).filter(point => {
                    const xIsValid = !isNaN(point[keys.xAxis]);
                    const yIsValid = !isNaN(point[keys.yAxis]);
                    const zIsValidIfPresent = !keys.zAxis || (keys.zAxis && !isNaN(point[keys.zAxis]));
                    return xIsValid && yIsValid && zIsValidIfPresent;
                });

                if (sanitizedChartData.length === 0 && rawChartData.length > 0) {
                    return <p style={chartNoDataStyle}>Data for ScatterPlot-like ('${chartType}') '${title}' was unsuitable after filtering for numeric axis values. Original data might have non-numeric coordinates.</p>;
                }

                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <NivoScatterPlot
                            data={sanitizedChartData}
                            dataKeys={keys}
                            chartIndex={chartIndex}
                            isFullScreen={isFullScreen}
                            trendline={shouldRenderTrendline ? trendline : undefined}
                            title={title}
                        />
                    </ResponsiveContainer>
                );
            }
            case 'AreaChart': {
                const keys = dataKeys as BarLineAreaDataKeys;
                const yAxisKeys = Array.isArray(keys.yAxis) ? keys.yAxis : [keys.yAxis as string];
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={displayData as any[]}
                            margin={{ top: 12, right: isFullScreen ? 35 : 15, left: isFullScreen ? 5 : -15, bottom: isFullScreen ? 25 : 10 }}
                            onMouseLeave={() => setHoveredSeriesKey(null)}
                        >
                            {renderDefs(yAxisKeys, confidenceInterval?.dataKey)}
                            <CartesianGrid strokeDasharray={gridStrokeDasharray} stroke={gridStrokeColor} vertical={false} />
                            <XAxis
                                dataKey={keys.xAxis}
                                axisLine={{ stroke: 'var(--border-color, rgba(128, 128, 128, 0.15))' }}
                                tickLine={false}
                                tick={axisTickStyleProps}
                                dy={8}
                                label={{ ...axisLabelStyleProps, value: keys.xAxis, position: 'insideBottom', offset: isFullScreen ? -20 : -10 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={axisTickStyleProps}
                                dx={-6}
                                label={{ ...axisLabelStyleProps, value: Array.isArray(keys.yAxis) ? 'Value' : keys.yAxis as string, angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip
                                content={<GoogleChartTooltip />}
                                cursor={{ stroke: 'rgba(255, 255, 255, 0.3)', strokeWidth: 1.2, strokeDasharray: '3 3' }}
                            />
                            {legendComponent}
                            {isFullScreen && brushComponent(keys.xAxis)}
                            {confidenceInterval && confidenceInterval.dataKey && Array.isArray(data) && data.length > 0 && typeof (data as any[])[0]?.[confidenceInterval.dataKey]?.[0] === 'number' && !hiddenLegendKeys.includes(confidenceInterval.dataKey) && (
                                <Area
                                    type="monotone"
                                    dataKey={confidenceInterval.dataKey}
                                    stroke={ciBandColor}
                                    strokeDasharray="3 3"
                                    strokeWidth={1}
                                    strokeOpacity={0.5}
                                    fill={`url(#ci-grad-${chartIndex})`}
                                    name="Confidence Band"
                                    isAnimationActive={true}
                                />
                            )}
                            {yAxisKeys.map((yKey, index) => {
                                if (hiddenLegendKeys.includes(yKey)) return null;
                                const color = CHART_COLORS[(chartIndex + index) % CHART_COLORS.length];
                                const isHovered = hoveredSeriesKey === yKey;
                                const isMuted = hoveredSeriesKey !== null && !isHovered;
                                return (
                                    <Area
                                        key={yKey}
                                        type="monotone"
                                        dataKey={yKey}
                                        name={yKey}
                                        stroke={color}
                                        strokeWidth={isHovered ? 3 : 2.2}
                                        strokeOpacity={isMuted ? 0.25 : 1}
                                        fillOpacity={isMuted ? 0.08 : 1}
                                        fill={`url(#grad-${chartIndex}-${yKey})`}
                                        dot={false}
                                        activeDot={renderActiveDot(color)}
                                        onMouseEnter={() => setHoveredSeriesKey(yKey)}
                                        onMouseLeave={() => setHoveredSeriesKey(null)}
                                        style={{ cursor: 'pointer', transition: 'opacity 0.2s ease, stroke-width 0.2s ease' }}
                                    />
                                );
                            })}
                        </AreaChart>
                    </ResponsiveContainer>
                );
            }
            case 'PolarBar': {
                const keys = dataKeys as PolarBarDataKeys;

                if (!displayData || !Array.isArray(displayData) || displayData.length === 0) {
                    return <p style={chartNoDataStyle}>No data available for {title || chartType}.</p>;
                }

                return (
                    <div style={{ width: '100%', height: '100%', minHeight: isFullScreen ? '600px' : '320px', position: 'relative' }}>
                        <PolarBar
                            data={displayData as PolarBarData[]}
                            dataKeys={keys as PolarBarDataKeys | undefined}
                            isFullScreen={isFullScreen}
                        />
                    </div>
                );
            }
            case 'ComposedChart': {
                const keys = dataKeys as ComposedChartDataKeys;
                const series: JSX.Element[] = [];
                let internalColorIndex = 0;
                const activeKeys = Object.entries(keys)
                    .filter(([typeAndName]) => typeAndName !== 'xAxis' && typeAndName !== 'errorKey')
                    .map(([, dataKeyVal]) => dataKeyVal as string);

                Object.entries(keys).forEach(([typeAndName, dataKeyVal]) => {
                    if (typeAndName === 'xAxis' || typeAndName === 'errorKey') return;
                    const currentDataKey = dataKeyVal as string;
                    if (hiddenLegendKeys.includes(currentDataKey) || hiddenLegendKeys.includes(typeAndName)) return;

                    const color = CHART_COLORS[(chartIndex + internalColorIndex) % CHART_COLORS.length];
                    const isHovered = hoveredSeriesKey === currentDataKey || hoveredSeriesKey === typeAndName;
                    const isMuted = hoveredSeriesKey !== null && !isHovered;
                    internalColorIndex++;

                    if (typeAndName.toLowerCase().includes('bar')) {
                        series.push(
                            <Bar
                                key={currentDataKey}
                                dataKey={currentDataKey}
                                name={typeAndName}
                                fill={color}
                                fillOpacity={isMuted ? 0.25 : 0.9}
                                radius={[6, 6, 0, 0]}
                                barSize={isFullScreen ? 26 : 20}
                                onMouseEnter={() => setHoveredSeriesKey(currentDataKey)}
                                onMouseLeave={() => setHoveredSeriesKey(null)}
                                style={{ cursor: 'pointer', transition: 'fill-opacity 0.2s ease' }}
                            >
                                {keys.errorKey && <ErrorBar dataKey={keys.errorKey} width={6} strokeWidth={2} stroke={CHART_COLORS[(chartIndex + internalColorIndex + 5) % CHART_COLORS.length]} direction="y" />}
                            </Bar>
                        );
                    } else if (typeAndName.toLowerCase().includes('line')) {
                        series.push(
                            <Line
                                key={currentDataKey}
                                type="monotone"
                                dataKey={currentDataKey}
                                name={typeAndName}
                                stroke={color}
                                strokeWidth={isHovered ? 3.5 : 2.4}
                                strokeOpacity={isMuted ? 0.2 : 1}
                                dot={showDots ? { r: 3, fill: color, strokeWidth: 0 } : false}
                                activeDot={renderActiveDot(color)}
                                onMouseEnter={() => setHoveredSeriesKey(currentDataKey)}
                                onMouseLeave={() => setHoveredSeriesKey(null)}
                                style={{ cursor: 'pointer', transition: 'stroke-opacity 0.2s ease' }}
                            />
                        );
                    } else if (typeAndName.toLowerCase().includes('area')) {
                        series.push(
                            <Area
                                key={currentDataKey}
                                type="monotone"
                                dataKey={currentDataKey}
                                name={typeAndName}
                                fill={`url(#grad-${chartIndex}-${currentDataKey})`}
                                stroke={color}
                                fillOpacity={isMuted ? 0.08 : 1}
                                strokeWidth={isHovered ? 3 : 2.2}
                                strokeOpacity={isMuted ? 0.25 : 1}
                                dot={false}
                                activeDot={renderActiveDot(color)}
                                onMouseEnter={() => setHoveredSeriesKey(currentDataKey)}
                                onMouseLeave={() => setHoveredSeriesKey(null)}
                                style={{ cursor: 'pointer', transition: 'opacity 0.2s ease' }}
                            />
                        );
                    }
                });

                if (confidenceInterval && confidenceInterval.dataKey && Array.isArray(displayData) && displayData.length > 0 && typeof (displayData as any[])[0]?.[confidenceInterval.dataKey]?.[0] === 'number' && !hiddenLegendKeys.includes(confidenceInterval.dataKey)) {
                    series.unshift(
                        <Area
                            key="ci-band-composed"
                            type="monotone"
                            dataKey={confidenceInterval.dataKey}
                            stroke={ciBandColor}
                            fill={`url(#ci-grad-${chartIndex})`}
                            strokeDasharray="3 3"
                            strokeWidth={1}
                            strokeOpacity={0.4}
                            name="Confidence Band"
                            isAnimationActive={true}
                        />
                    );
                }

                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={displayData as any[]}
                            margin={{ top: 12, right: isFullScreen ? 35 : 15, left: isFullScreen ? 5 : -15, bottom: isFullScreen ? 25 : 10 }}
                            onMouseLeave={() => setHoveredSeriesKey(null)}
                        >
                            {renderDefs(activeKeys, confidenceInterval?.dataKey)}
                            <CartesianGrid strokeDasharray={gridStrokeDasharray} stroke={gridStrokeColor} vertical={false} />
                            <XAxis
                                dataKey={keys.xAxis}
                                axisLine={{ stroke: 'var(--border-color, rgba(128, 128, 128, 0.15))' }}
                                tickLine={false}
                                tick={axisTickStyleProps}
                                dy={8}
                                label={{ ...axisLabelStyleProps, value: keys.xAxis, position: 'insideBottom', offset: isFullScreen ? -20 : -10 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={axisTickStyleProps}
                                dx={-6}
                                label={{ ...axisLabelStyleProps, value: "Value", angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip content={<GoogleChartTooltip />} />
                            {legendComponent}
                            {isFullScreen && brushComponent(keys.xAxis)}
                            {series}
                        </ComposedChart>
                    </ResponsiveContainer>
                );
            }
            case 'DataTable': {
                const { columns } = dataKeys as DataTableDataKeys;
                const currentData = sortedTableData as any[];
                return (
                    <div className="custom-scrollbar" style={{ height: '100%', overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}>
                        <table style={{ minWidth: '100%', borderCollapse: 'collapse', width: '100%' }}>
                            <thead style={{ backgroundColor: 'rgba(var(--card-bg-color-rgb), 0.95)', position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr>
                                    {columns.map((col: DataTableColumn) => (
                                        <th
                                            key={col.accessor}
                                            scope="col"
                                            className="data-table-header sortable"
                                            onClick={() => requestSort(col.accessor)}
                                            style={{ padding: '0.95rem 1.2rem', textAlign: 'left', fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--text-color)', textTransform: 'uppercase', borderBottom: '2px solid var(--border-hover-color)', letterSpacing: '0.04em', cursor: 'pointer' }}
                                            title={`Sort by ${col.header}`}
                                            role="columnheader"
                                            aria-sort={sortConfig && sortConfig.key === col.accessor ? sortConfig.direction : 'none'}
                                        >
                                            {col.header}
                                            {sortConfig && sortConfig.key === col.accessor && (
                                                <span className="sort-icon">
                                                    {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody style={{ backgroundColor: 'transparent' }}>
                                {currentData.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="data-table-row" style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s', cursor: 'pointer' }}>
                                        {columns.map((col: DataTableColumn, colIndex) => (
                                            <td key={`${rowIndex}-${col.accessor}`} style={{ padding: '0.95rem 1.2rem', whiteSpace: 'nowrap', fontSize: '0.925rem', color: 'var(--text-color)', fontFamily: 'var(--font-family)', borderRight: colIndex < columns.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                                {String(row[col.accessor])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            }
            case 'Heatmap':
            case 'CorrelationHeatmap': {
                const keys = dataKeys as HeatmapDataKeys;
                const matrixData = data as number[][];
                if (!keys.rowLabels || !keys.columnLabels || !matrixData || matrixData.length === 0 || matrixData[0].length === 0) {
                    return <p style={chartNoDataStyle}>Heatmap data is incomplete (missing labels or matrix data) for {title || chartType}.</p>;
                }

                let minVal = Infinity;
                let maxVal = -Infinity;
                matrixData.forEach(row => row.forEach(val => {
                    if (typeof val === 'number') {
                        minVal = Math.min(minVal, val);
                        maxVal = Math.max(maxVal, val);
                    }
                }));

                const colorStartStr = getComputedStyle(document.documentElement).getPropertyValue('--bg-color-rgb').trim() || '10, 12, 16';
                const negColorRgb = parseRgb(getComputedStyle(document.documentElement).getPropertyValue('--accent-blue-rgb').trim()) || [41, 121, 255];
                const zeroColorRgb = parseRgb(colorStartStr) || [10, 12, 16];
                const posColorRgb = parseRgb(getComputedStyle(document.documentElement).getPropertyValue('--accent-pink-rgb').trim()) || [255, 64, 129];
                const generalHeatmapColorRgb = parseRgb(getComputedStyle(document.documentElement).getPropertyValue('--accent-purple-rgb').trim()) || [174, 82, 245];


                return (
                    <div className="custom-scrollbar" style={{ height: '100%', overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}>
                        <table ref={heatmapTableRef} style={{ minWidth: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontFamily: 'var(--font-family-monospace)' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: isFullScreen ? '150px' : '130px', padding: '0.85rem 1rem', borderBottom: '2px solid var(--border-hover-color)', borderRight: '2px solid var(--border-hover-color)', color: 'var(--text-color)', fontSize: isFullScreen ? '0.9rem' : '0.85rem', fontWeight: 700, textAlign: 'left' }}></th>
                                    {keys.columnLabels.map(colLabel => (
                                        <th key={colLabel} scope="col" title={colLabel} style={{ padding: '0.85rem 1rem', textAlign: 'center', borderBottom: '2px solid var(--border-hover-color)', color: 'var(--text-color)', fontSize: isFullScreen ? '0.9rem' : '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {colLabel}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {keys.rowLabels.map((rowLabel, rowIndex) => (
                                    <tr key={rowLabel}>
                                        <th scope="row" title={rowLabel} style={{ padding: '0.85rem 1rem', textAlign: 'left', borderRight: '2px solid var(--border-hover-color)', color: 'var(--text-color)', fontSize: isFullScreen ? '0.9rem' : '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {rowLabel}
                                        </th>
                                        {keys.columnLabels.map((_colLabel, colIndex) => {
                                            const cellValue = matrixData[rowIndex]?.[colIndex];
                                            let cellColor = 'rgba(var(--bg-color-rgb), 0.2)';
                                            let textColor = 'var(--text-tertiary-color)';
                                            if (typeof cellValue === 'number' && isFinite(cellValue)) {
                                                if (chartType === 'CorrelationHeatmap') {
                                                    if (cellValue < 0) {
                                                        const factor = Math.min(1, Math.abs(cellValue / (minVal !== 0 ? minVal : -1)));
                                                        cellColor = interpolateColor(zeroColorRgb, negColorRgb, factor);
                                                        textColor = factor > 0.6 ? 'var(--text-color)' : 'var(--text-secondary-color)';
                                                    } else {
                                                        const factor = Math.min(1, cellValue / (maxVal !== 0 ? maxVal : 1));
                                                        cellColor = interpolateColor(zeroColorRgb, posColorRgb, factor);
                                                        textColor = factor > 0.6 ? 'var(--text-color)' : 'var(--text-secondary-color)';
                                                    }
                                                } else {
                                                    const factor = (maxVal === minVal) ? 0.5 : (cellValue - minVal) / (maxVal - minVal);
                                                    cellColor = interpolateColor(zeroColorRgb, generalHeatmapColorRgb, factor);
                                                    textColor = factor > 0.6 ? 'var(--text-color)' : 'var(--text-secondary-color)';
                                                }
                                            }

                                            return (
                                                <td
                                                    key={`${rowLabel}-${_colLabel}`}
                                                    className="heatmap-cell"
                                                    data-original-bgcolor={cellColor}
                                                    data-original-color={textColor}
                                                    data-row-label={rowLabel}
                                                    data-col-label={_colLabel}
                                                    style={{
                                                        backgroundColor: cellColor,
                                                        color: textColor,
                                                        padding: isFullScreen ? '0.95rem' : '0.85rem',
                                                        textAlign: 'center',
                                                        fontSize: isFullScreen ? '1rem' : '0.9rem',
                                                        fontWeight: 600,
                                                        borderRight: colIndex < keys.columnLabels.length - 1 ? '1px solid rgba(var(--border-color-rgb), 0.3)' : 'none',
                                                        borderBottom: rowIndex < keys.rowLabels.length - 1 ? '1px solid rgba(var(--border-color-rgb), 0.3)' : 'none',
                                                        cursor: 'pointer',
                                                        transition: 'background-color 0.15s ease-in-out, color 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
                                                    }}
                                                    title={`${rowLabel} / ${_colLabel}: ${typeof cellValue === 'number' && isFinite(cellValue) ? cellValue.toFixed(3) : 'N/A'}`}
                                                >
                                                    {typeof cellValue === 'number' && isFinite(cellValue) ? cellValue.toFixed(2) : 'N/A'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            }
            case 'BoxPlot': {
                const boxKeys = dataKeys as BoxPlotDataKeys;
                const boxData = data as Array<Record<string, any>>;

                if (!boxData || boxData.length === 0) {
                    return <p style={chartNoDataStyle}>No data available for Box Plot: {title}.</p>;
                }

                return (
                    <div style={{ width: '100%', height: '100%' }}>
                        <NivoBoxPlot
                            data={boxData}
                            dataKeys={boxKeys}
                            isFullScreen={isFullScreen}
                        />
                    </div>
                );
            }
            case 'ViolinPlot': {
                const keys = dataKeys as ViolinPlotDataKeys;
                const violinPlotData = data as Array<Record<string, any>>;
                if (!violinPlotData || violinPlotData.length === 0) return <p style={chartNoDataStyle}>No data for Violin Plot: {title}.</p>;

                return (
                    <div style={{ width: '100%', height: '100%' }}>
                        <NivoViolinPlot
                            data={violinPlotData}
                            dataKeys={keys}
                            chartIndex={chartIndex}
                            isFullScreen={isFullScreen}
                        />
                    </div>
                );
            }
            case 'Streamgraph': {
                const keys = dataKeys as StreamgraphDataKeys;
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={displayData as any[]}
                            stackOffset="silhouette"
                            margin={{ top: 15, right: isFullScreen ? 35 : 20, left: isFullScreen ? 5 : -10, bottom: isFullScreen ? 25 : 10 }}
                            onMouseLeave={() => setHoveredSeriesKey(null)}
                        >
                            {renderDefs(keys.streamKeys)}
                            <CartesianGrid strokeDasharray={gridStrokeDasharray} stroke={gridStrokeColor} vertical={false} />
                            <XAxis
                                dataKey={keys.xAxis}
                                axisLine={{ stroke: 'var(--border-color, rgba(128, 128, 128, 0.15))' }}
                                tickLine={false}
                                tick={axisTickStyleProps}
                                dy={8}
                                label={{ ...axisLabelStyleProps, value: keys.xAxis, position: 'insideBottom', offset: isFullScreen ? -20 : -10 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={axisTickStyleProps}
                                dx={-6}
                                label={{ ...axisLabelStyleProps, value: "Value", angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip content={<GoogleChartTooltip />} />
                            {legendComponent}
                            {isFullScreen && brushComponent(keys.xAxis)}
                            {keys.streamKeys.map((streamKey, index) => {
                                if (hiddenLegendKeys.includes(streamKey)) return null;
                                const color = CHART_COLORS[(chartIndex + index) % CHART_COLORS.length];
                                const isHovered = hoveredSeriesKey === streamKey;
                                const isMuted = hoveredSeriesKey !== null && !isHovered;
                                return (
                                    <Area
                                        key={streamKey}
                                        type="monotone"
                                        dataKey={streamKey}
                                        name={streamKey}
                                        stackId="1"
                                        stroke={color}
                                        fill={color}
                                        fillOpacity={isMuted ? 0.2 : 0.75}
                                        strokeWidth={isHovered ? 2.5 : 1.5}
                                        strokeOpacity={isMuted ? 0.3 : 1}
                                        onMouseEnter={() => setHoveredSeriesKey(streamKey)}
                                        onMouseLeave={() => setHoveredSeriesKey(null)}
                                        style={{ cursor: 'pointer', transition: 'fill-opacity 0.2s ease' }}
                                    />
                                );
                            })}
                        </AreaChart>
                    </ResponsiveContainer>
                );
            }
            case 'RadialBar': {
                const radialBarData = displayData as unknown as RadialBarData[];

                if (!radialBarData || !Array.isArray(radialBarData) || radialBarData.length === 0) {
                    return <p style={chartNoDataStyle}>No data available for {title || chartType}.</p>;
                }

                return (
                    <div style={{ width: '100%', height: '100%', minHeight: isFullScreen ? '600px' : '320px', position: 'relative' }}>
                        <RadialBar
                            data={radialBarData}
                            isFullScreen={isFullScreen}
                        />
                    </div>
                );
            }
            case 'SankeyDiagram': {
                const sankeyData = displayData as SankeyData; // Type assertion
                if (!sankeyData || !sankeyData.nodes || !sankeyData.links || sankeyData.nodes.length === 0) {
                    return <p style={chartNoDataStyle}>Sankey Diagram data is incomplete or empty for {title || chartType}.</p>;
                }

                return (
                    <div style={{ width: '100%', height: '100%', minHeight: isFullScreen ? '600px' : '320px', position: 'relative' }}>
                        <SankeyDiagram
                            data={sankeyData}
                            isFullScreen={isFullScreen}
                        />
                    </div>
                );
            }
            case 'TreeMap': {
                const treeMapData = displayData as unknown as TreeMapData; // Type assertion
                if (!treeMapData || !treeMapData.children || treeMapData.children.length === 0) {
                    return <p style={chartNoDataStyle}>TreeMap data is incomplete or empty for {title || chartType}.</p>;
                }

                return (
                    <div style={{ width: '100%', height: '100%', minHeight: isFullScreen ? '600px' : '320px', position: 'relative' }}>
                        <TreeMap
                            data={treeMapData}
                            isFullScreen={isFullScreen}
                        />
                    </div>
                );
            }
            case 'Choropleth': {
                const keys = dataKeys as ChoroplethDataKeys;
                const choroplethData = data as ChoroplethData[];

                if (!choroplethData || !Array.isArray(choroplethData) || choroplethData.length === 0) {
                    return <p style={chartNoDataStyle}>No data available for Choropleth: {title}.</p>;
                }

                // Features are optional - will load world map automatically if not provided
                const features = (chartSpec as any).features;

                return (
                    <div style={{ width: '100%', height: '100%', minHeight: isFullScreen ? '600px' : '320px', position: 'relative' }}>
                        <Choropleth
                            data={choroplethData}
                            dataKeys={keys}
                            features={features}
                            isFullScreen={isFullScreen}
                        />
                    </div>
                );
            }
            case 'Calendar': {
                const keys = dataKeys as CalendarDataKeys;
                const calendarData = data as any[];

                if (!calendarData || !Array.isArray(calendarData) || calendarData.length === 0) {
                    return <p style={chartNoDataStyle}>No data available for Calendar: {title}.</p>;
                }

                return (
                    <div style={{ width: '100%', height: '100%', minHeight: isFullScreen ? '600px' : '320px', position: 'relative' }}>
                        <NivoCalendar
                            data={calendarData}
                            dataKeys={keys}
                            isFullScreen={isFullScreen}
                        />
                    </div>
                );
            }
            case 'TimeRange': {
                const keys = dataKeys as TimeRangeDataKeys;
                const timeRangeData = data as any[];

                if (!timeRangeData || !Array.isArray(timeRangeData) || timeRangeData.length === 0) {
                    return <p style={chartNoDataStyle}>No data available for TimeRange: {title}.</p>;
                }

                return (
                    <div style={{ width: '100%', height: '100%', minHeight: isFullScreen ? '600px' : '320px', position: 'relative' }}>
                        <NivoTimeRange
                            data={timeRangeData}
                            dataKeys={keys}
                            isFullScreen={isFullScreen}
                        />
                    </div>
                );
            }
            case 'WaffleChart': {
                const keys = dataKeys as WaffleChartDataKeys;
                const waffleData = data as any[];

                if (!waffleData || !Array.isArray(waffleData) || waffleData.length === 0) {
                    return <p style={chartNoDataStyle}>No data available for WaffleChart: {title}.</p>;
                }

                const normalizedData: WaffleChartDataItem[] = waffleData.map(item => ({
                    id: String(item[keys.idKey] || item.id),
                    label: String(item[keys.labelKey] || item.label),
                    value: Number(item[keys.valueKey] || item.value),
                    color: item.color
                }));

                return (
                    <div style={{ width: '100%', height: '100%', minHeight: isFullScreen ? '600px' : '320px', position: 'relative' }}>
                        <WaffleChart
                            data={normalizedData}
                            isFullScreen={isFullScreen}
                        />
                    </div>
                );
            }
            default:
                // console.warn(`Attempted to render unsupported chart type: ${chartType} for chart "${title}"`);
                return <p style={chartNoDataStyle}>Unsupported chart type: {chartType} for {title}.</p>;
        }
    };


    const renderTrendlineStats = () => {
        if (chartType === 'ScatterPlot' && shouldRenderTrendline && trendline && (trendline.rSquared !== undefined || trendline.pValue !== undefined)) {
            return (
                <div style={{ fontSize: isFullScreen ? '0.9rem' : '0.85rem', color: 'var(--text-tertiary-color)', marginTop: '1rem', textAlign: 'right', paddingRight: '1.25rem', lineHeight: '1.6' }}>
                    {trendline.name && <span style={{ fontWeight: 500 }}>{trendline.name}: </span>}
                    {trendline.rSquared !== null && trendline.rSquared !== undefined && <span style={{ marginLeft: '0.6rem' }}>R²: {trendline.rSquared.toFixed(3)}</span>}
                    {trendline.pValue !== null && trendline.pValue !== undefined && <span style={{ marginLeft: '0.6rem' }}>p-value: {trendline.pValue.toExponential(2)}</span>}
                </div>
            );
        }
        return null;
    };

    const renderQuickStatsStrip = () => {
        if (!quickStats || quickStats.length === 0) return null;
        return (
            <div className="google-quick-stats-strip custom-scrollbar">
                {quickStats.map((stat: any) => (
                    <div key={stat.key} className="google-quick-stat-group">
                        <span className="google-quick-stat-pill" style={{ borderColor: hexToRgba(stat.color, 0.4), color: stat.color, backgroundColor: hexToRgba(stat.color, 0.12) }}>
                            <span className="google-quick-stat-dot" style={{ backgroundColor: stat.color }} />
                            <span className="google-quick-stat-name">{stat.key}</span>
                        </span>
                        <span className="google-quick-stat-chip">Avg <strong>{stat.avg}</strong></span>
                        <span className="google-quick-stat-chip">Min <strong>{stat.min}</strong></span>
                        <span className="google-quick-stat-chip">Max <strong>{stat.max}</strong></span>
                        <span className="google-quick-stat-chip">Latest <strong>{stat.latest}</strong></span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className={`chart-card ${isFullScreen ? 'fullscreen' : ''}`} ref={ref}>
            <PipelineStageErrorBoundary stageName={`Chart: ${title}`}>
                <div className="chart-card-header">
                    <h3 className="chart-title-text">{title || 'Untitled Chart'}</h3>
                    <div className="chart-card-actions">
                        {/* Delete button - leftmost */}
                        {onRemove && (
                            <button
                                onClick={onRemove}
                                className="button remove-button"
                                title="Remove this visualization"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3,6 5,6 21,6"></polyline>
                                    <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                                </svg>
                            </button>
                        )}

                        {/* Statistics button - only in fullscreen */}
                        {isFullScreen && supportsStatistics && currentStatistics && (
                            <button
                                onClick={() => {
                                    setShowStatistics(!showStatistics);
                                    if (showDataTable) setShowDataTable(false);
                                }}
                                className="button"
                                title="Toggle Statistics"
                                style={{ opacity: showStatistics ? 1 : 0.7 }}
                            >
                                <FiBarChart2 size={11} />
                            </button>
                        )}

                        {/* Data button - only in fullscreen when data is array */}
                        {isFullScreen && Array.isArray(data) && data.length > 0 && (
                            <button
                                onClick={() => {
                                    setShowDataTable(!showDataTable);
                                    if (showStatistics) setShowStatistics(false);
                                }}
                                className="button"
                                title="View & Edit Data"
                                style={{ opacity: showDataTable ? 1 : 0.7 }}
                            >
                                <FiDatabase size={11} />
                            </button>
                        )}

                        {/* Download button - always visible when there's data */}
                        {Array.isArray(data) && data.length > 0 && (
                            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }} ref={exportDropdownRef}>
                                <button
                                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                                    className="button"
                                    title="Export Chart"
                                    style={{ opacity: showExportDropdown ? 1 : undefined }}
                                >
                                    <FiDownload size={11} />
                                </button>
                                {showExportDropdown && (
                                    <div className="export-dropdown">
                                        <button
                                            type="button"
                                            onClick={() => exportAsSVG('dark')}
                                            className="export-dropdown-item"
                                        >
                                            <MdOutlineDownloadForOffline size={15} />
                                            <span>Download as Image (Dark)</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => exportAsSVG('light')}
                                            className="export-dropdown-item"
                                        >
                                            <MdOutlineDownloadForOffline size={15} />
                                            <span>Download as Image (Light)</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={exportToCSV}
                                            className="export-dropdown-item"
                                        >
                                            <FiDownload size={15} />
                                            <span>Download as CSV</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Fullscreen button - rightmost, always visible */}
                        <button
                            onClick={onToggleFullScreen}
                            className="button"
                            title={isFullScreen ? "Exit Fullscreen" : "View Fullscreen"}
                            aria-pressed={isFullScreen}
                        >
                            {isFullScreen ? <FiMinimize2 size={11} /> : <FiMaximize2 size={11} />}
                        </button>
                    </div>
                </div>
                {/* Side-by-side layout when statistics are shown */}
                {isFullScreen && showStatistics && currentStatistics ? (
                    <div style={{
                        display: 'flex',
                        gap: '0',
                        height: 'calc(100vh - 180px)',
                        overflow: 'hidden'
                    }}>
                        {/* Chart Area - 70% */}
                        <div style={{
                            flex: '0 0 70%',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRight: '1px solid var(--border-color)'
                        }}>
                            {description && description.trim() && (
                                <p className="chart-description-text" style={{
                                    margin: 0,
                                    padding: '12px 20px',
                                    borderBottom: '1px solid var(--border-color)',
                                    background: 'rgba(var(--card-bg-color-rgb), 0.3)'
                                }}>
                                    {description}
                                </p>
                            )}
                            {renderQuickStatsStrip()}
                            <div style={{ flex: 1, overflow: 'hidden', padding: '16px' }}>
                                {renderChartContent()}
                            </div>
                            {renderTrendlineStats()}
                        </div>

                        {/* Statistics Panel - 30% */}
                        <div style={{
                            flex: '0 0 30%',
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            background: 'linear-gradient(135deg, rgba(var(--card-bg-color-rgb), 0.6) 0%, rgba(var(--card-bg-color-rgb), 0.4) 100%)'
                        }} className="custom-scrollbar">
                            <div style={{
                                padding: '20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '24px'
                            }}>
                                {Object.entries(currentStatistics).map(([key, stats]: [string, any]) => {
                                    if (!stats) return null;

                                    // Determine distribution shape
                                    let distributionShape = 'Normal';
                                    if (Math.abs(stats.skewness) > 1) {
                                        distributionShape = stats.skewness > 0 ? 'Right-skewed' : 'Left-skewed';
                                    } else if (Math.abs(stats.skewness) > 0.5) {
                                        distributionShape = stats.skewness > 0 ? 'Slightly right-skewed' : 'Slightly left-skewed';
                                    }

                                    // Determine variability
                                    let variability = 'Moderate';
                                    if (stats.cv < 15) variability = 'Low';
                                    else if (stats.cv > 30) variability = 'High';

                                    // Determine outlier severity
                                    return (
                                        <div key={key} style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0',
                                            background: 'rgba(var(--card-bg-color-rgb), 0.4)',
                                            borderRadius: 'var(--border-radius-md)',
                                            border: '1px solid var(--border-color)',
                                            overflow: 'hidden'
                                        }}>
                                            {/* Header with badges */}
                                            <div style={{
                                                padding: '16px 20px',
                                                background: 'rgba(var(--accent-purple-rgb), 0.08)',
                                                borderBottom: '1px solid var(--border-color)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '12px',
                                                flexWrap: 'wrap'
                                            }}>
                                                <div style={{
                                                    fontWeight: 600,
                                                    color: 'var(--text-color)',
                                                    fontSize: '0.95rem',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.08em'
                                                }}>{key}</div>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        padding: '6px 12px',
                                                        borderRadius: 'var(--border-radius-sm)',
                                                        background: variability === 'Low' ? 'rgba(16, 185, 129, 0.15)' : variability === 'High' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                                                        color: variability === 'Low' ? '#10b981' : variability === 'High' ? '#ef4444' : '#fbbf24',
                                                        fontWeight: 600,
                                                        fontSize: '0.75rem',
                                                        border: `1px solid ${variability === 'Low' ? 'rgba(16, 185, 129, 0.3)' : variability === 'High' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                                                        whiteSpace: 'nowrap'
                                                    }}>{variability} Variability</span>
                                                    {stats.outlierCount > 0 && (
                                                        <span style={{
                                                            padding: '6px 12px',
                                                            borderRadius: 'var(--border-radius-sm)',
                                                            background: 'rgba(var(--accent-pink-rgb), 0.15)',
                                                            color: 'var(--accent-pink)',
                                                            fontWeight: 600,
                                                            fontSize: '0.75rem',
                                                            border: '1px solid rgba(var(--accent-pink-rgb), 0.3)',
                                                            whiteSpace: 'nowrap'
                                                        }}>{stats.outlierCount} Outliers</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Card-based layout */}
                                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

                                                {/* Central Tendency & Spread side by side */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                                    {/* Central Tendency */}
                                                    <div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary-color)', fontWeight: 600, marginBottom: '10px', letterSpacing: '0.05em' }}>CENTRAL TENDENCY</div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                                            <div style={{
                                                                padding: '12px',
                                                                background: 'rgba(var(--bg-color-rgb), 0.3)',
                                                                borderRadius: 'var(--border-radius-sm)',
                                                                border: '1px solid var(--border-color)'
                                                            }}>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary-color)', marginBottom: '6px' }}>Mean</div>
                                                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-color)', fontVariantNumeric: 'tabular-nums' }}>{stats.mean?.toFixed(2)}</div>
                                                            </div>
                                                            <div style={{
                                                                padding: '12px',
                                                                background: 'rgba(var(--bg-color-rgb), 0.3)',
                                                                borderRadius: 'var(--border-radius-sm)',
                                                                border: '1px solid var(--border-color)'
                                                            }}>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary-color)', marginBottom: '6px' }}>Median</div>
                                                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-color)', fontVariantNumeric: 'tabular-nums' }}>{stats.median?.toFixed(2)}</div>
                                                            </div>
                                                            {stats.mode !== null && (
                                                                <div style={{
                                                                    padding: '12px',
                                                                    background: 'rgba(var(--bg-color-rgb), 0.3)',
                                                                    borderRadius: 'var(--border-radius-sm)',
                                                                    border: '1px solid var(--border-color)'
                                                                }}>
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary-color)', marginBottom: '6px' }}>Mode</div>
                                                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-color)', fontVariantNumeric: 'tabular-nums' }}>{stats.mode?.toFixed(2)}</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Spread & Range */}
                                                    <div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary-color)', fontWeight: 600, marginBottom: '10px', letterSpacing: '0.05em' }}>SPREAD & RANGE</div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                                            <div style={{
                                                                padding: '12px',
                                                                background: 'rgba(var(--bg-color-rgb), 0.3)',
                                                                borderRadius: 'var(--border-radius-sm)',
                                                                border: '1px solid var(--border-color)'
                                                            }}>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary-color)', marginBottom: '6px' }}>Std Dev</div>
                                                                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-color)', fontVariantNumeric: 'tabular-nums' }}>{stats.stdDev?.toFixed(2)}</div>
                                                            </div>
                                                            <div style={{
                                                                padding: '12px',
                                                                background: 'rgba(var(--bg-color-rgb), 0.3)',
                                                                borderRadius: 'var(--border-radius-sm)',
                                                                border: '1px solid var(--border-color)'
                                                            }}>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary-color)', marginBottom: '6px' }}>CV</div>
                                                                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-color)', fontVariantNumeric: 'tabular-nums' }}>{stats.cv?.toFixed(1)}%</div>
                                                            </div>
                                                            <div style={{
                                                                padding: '12px',
                                                                background: 'rgba(var(--bg-color-rgb), 0.3)',
                                                                borderRadius: 'var(--border-radius-sm)',
                                                                border: '1px solid var(--border-color)'
                                                            }}>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary-color)', marginBottom: '6px' }}>Range</div>
                                                                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-color)', fontVariantNumeric: 'tabular-nums' }}>{stats.range?.toFixed(2)}</div>
                                                            </div>
                                                            <div style={{
                                                                padding: '12px',
                                                                background: 'rgba(var(--bg-color-rgb), 0.3)',
                                                                borderRadius: 'var(--border-radius-sm)',
                                                                border: '1px solid var(--border-color)'
                                                            }}>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary-color)', marginBottom: '6px' }}>IQR</div>
                                                                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-color)', fontVariantNumeric: 'tabular-nums' }}>{stats.iqr?.toFixed(2)}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Distribution Shape & Extremes */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary-color)', fontWeight: 600, marginBottom: '10px', letterSpacing: '0.05em' }}>DISTRIBUTION SHAPE</div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <div style={{
                                                                padding: '12px 14px',
                                                                background: 'rgba(var(--bg-color-rgb), 0.3)',
                                                                borderRadius: 'var(--border-radius-sm)',
                                                                border: '1px solid var(--border-color)',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                gap: '12px'
                                                            }}>
                                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary-color)' }}>Shape</span>
                                                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-color)', textAlign: 'right' }}>{distributionShape}</span>
                                                            </div>
                                                            <div style={{
                                                                padding: '12px 14px',
                                                                background: 'rgba(var(--bg-color-rgb), 0.3)',
                                                                borderRadius: 'var(--border-radius-sm)',
                                                                border: '1px solid var(--border-color)',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                gap: '12px'
                                                            }}>
                                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary-color)' }}>Skewness</span>
                                                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-color)', fontVariantNumeric: 'tabular-nums' }}>{stats.skewness?.toFixed(3)}</span>
                                                            </div>
                                                            <div style={{
                                                                padding: '12px 14px',
                                                                background: 'rgba(var(--bg-color-rgb), 0.3)',
                                                                borderRadius: 'var(--border-radius-sm)',
                                                                border: '1px solid var(--border-color)',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                gap: '12px'
                                                            }}>
                                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary-color)' }}>Kurtosis</span>
                                                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-color)', fontVariantNumeric: 'tabular-nums' }}>{stats.kurtosis?.toFixed(3)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary-color)', fontWeight: 600, marginBottom: '10px', letterSpacing: '0.05em' }}>EXTREMES</div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <div style={{
                                                                padding: '12px 14px',
                                                                background: 'rgba(var(--bg-color-rgb), 0.3)',
                                                                borderRadius: 'var(--border-radius-sm)',
                                                                border: '1px solid var(--border-color)',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                gap: '12px'
                                                            }}>
                                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary-color)' }}>Minimum</span>
                                                                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-color)', fontVariantNumeric: 'tabular-nums' }}>{stats.min?.toFixed(2)}</span>
                                                            </div>
                                                            <div style={{
                                                                padding: '12px 14px',
                                                                background: 'rgba(var(--bg-color-rgb), 0.3)',
                                                                borderRadius: 'var(--border-radius-sm)',
                                                                border: '1px solid var(--border-color)',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                gap: '12px'
                                                            }}>
                                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary-color)' }}>Maximum</span>
                                                                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-color)', fontVariantNumeric: 'tabular-nums' }}>{stats.max?.toFixed(2)}</span>
                                                            </div>
                                                            {stats.outlierCount > 0 && (
                                                                <div style={{
                                                                    padding: '12px 14px',
                                                                    background: 'rgba(var(--accent-pink-rgb), 0.08)',
                                                                    borderRadius: 'var(--border-radius-sm)',
                                                                    border: '1px solid rgba(var(--accent-pink-rgb), 0.3)',
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    gap: '12px'
                                                                }}>
                                                                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-pink)' }}>Outliers</span>
                                                                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-pink)', fontVariantNumeric: 'tabular-nums' }}>{stats.outlierPercentage?.toFixed(1)}%</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Interpretation */}
                                                <div style={{
                                                    padding: '14px 16px',
                                                    background: 'rgba(var(--accent-purple-rgb), 0.05)',
                                                    borderRadius: 'var(--border-radius-sm)',
                                                    border: '1px solid rgba(var(--accent-purple-rgb), 0.2)',
                                                    fontSize: '0.8rem',
                                                    color: 'var(--text-secondary-color)',
                                                    lineHeight: '1.6'
                                                }}>
                                                    {Math.abs(stats.mean - stats.median) / stats.stdDev < 0.1
                                                        ? 'Data is symmetrically distributed around the center with balanced tails.'
                                                        : stats.mean > stats.median
                                                            ? 'Right-skewed distribution with positive outliers pulling the mean higher than median.'
                                                            : 'Left-skewed distribution with negative outliers pulling the mean lower than median.'}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : isFullScreen && showDataTable && Array.isArray(data) && data.length > 0 ? (
                    /* Side-by-side layout when data table is shown */
                    <div style={{
                        display: 'flex',
                        gap: '0',
                        height: 'calc(100vh - 180px)',
                        overflow: 'hidden'
                    }}>
                        {/* Chart Area - 50% */}
                        <div style={{
                            flex: '0 0 50%',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRight: '1px solid var(--border-color)'
                        }}>
                            {description && description.trim() && (
                                <p className="chart-description-text" style={{
                                    margin: 0,
                                    padding: '12px 20px',
                                    borderBottom: '1px solid var(--border-color)',
                                    background: 'rgba(var(--card-bg-color-rgb), 0.3)'
                                }}>
                                    {description}
                                </p>
                            )}
                            {renderQuickStatsStrip()}
                            <div style={{ flex: 1, overflow: 'hidden', padding: '16px' }}>
                                {renderChartContent()}
                            </div>
                            {renderTrendlineStats()}
                        </div>

                        {/* Data Table - 50% */}
                        <div style={{
                            flex: '0 0 50%',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}>
                            <EditableDataTable
                                data={data}
                                onDataChange={handleDataChange}
                                title={`Data for ${title}`}
                            />
                        </div>
                    </div>
                ) : (
                    /* Normal layout when statistics and data table are not shown */
                    <>
                        {description && description.trim() && (
                            <p className="chart-description-text custom-scrollbar">
                                {description}
                            </p>
                        )}
                        {renderQuickStatsStrip()}
                        <div className="chart-render-area custom-scrollbar" ref={chartRenderAreaRef}>
                            {renderChartContent()}
                        </div>
                        {renderTrendlineStats()}
                    </>
                )}
            </PipelineStageErrorBoundary>
        </div>
    );
});

ChartDisplay.displayName = 'ChartDisplay';
