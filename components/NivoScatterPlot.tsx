import React from 'react';
import {
    ComposedChart, Scatter, Line, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ZAxis, Brush
} from 'recharts';
import type { ScatterDataKeys, TrendlineSpec } from '../types';
import { CHART_COLORS } from '../utils/constants';

interface NivoScatterPlotProps {
    data: any[];
    dataKeys: ScatterDataKeys;
    chartIndex: number;
    isFullScreen?: boolean;
    trendline?: TrendlineSpec;
    title?: string;
}

export const NivoScatterPlot: React.FC<NivoScatterPlotProps> = ({ 
    data, 
    dataKeys, 
    chartIndex, 
    isFullScreen = false,
    trendline,
    title
}) => {
    const trendlineColor = CHART_COLORS[(chartIndex + 5) % CHART_COLORS.length];

    // Sanitize data
    const sanitizedData = React.useMemo(() => {
        return data.map(point => {
            const newPoint = { ...point };
            newPoint[dataKeys.xAxis] = parseFloat(point[dataKeys.xAxis]);
            newPoint[dataKeys.yAxis] = parseFloat(point[dataKeys.yAxis]);
            if (dataKeys.zAxis) {
                newPoint[dataKeys.zAxis] = parseFloat(point[dataKeys.zAxis]);
            }
            return newPoint;
        }).filter(point => {
            const xIsValid = !isNaN(point[dataKeys.xAxis]);
            const yIsValid = !isNaN(point[dataKeys.yAxis]);
            const zIsValidIfPresent = !dataKeys.zAxis || !isNaN(point[dataKeys.zAxis]);
            return xIsValid && yIsValid && zIsValidIfPresent;
        });
    }, [data, dataKeys]);

    // Sanitize trendline data and normalize keys to match main scatter plot axes
    const sanitizedTrendline = React.useMemo(() => {
        if (!trendline || !trendline.data || !trendline.dataKeys) return null;
        
        // Map trendline data to use the same keys as the main scatter plot
        const trendlineData = trendline.data.map(point => {
            const xValue = parseFloat(point[trendline.dataKeys!.xAxis]);
            const yValue = parseFloat(point[trendline.dataKeys!.yAxis]);
            
            // Create new point with keys matching main dataKeys
            return {
                [dataKeys.xAxis]: xValue,
                [dataKeys.yAxis]: yValue
            };
        }).filter(point =>
            !isNaN(point[dataKeys.xAxis]) &&
            !isNaN(point[dataKeys.yAxis])
        );

        return {
            ...trendline,
            data: trendlineData,
            // Update dataKeys to match main scatter plot
            dataKeys: {
                xAxis: dataKeys.xAxis,
                yAxis: dataKeys.yAxis
            }
        };
    }, [trendline, dataKeys]);

    // Premium styling constants
    const axisStrokeColor = 'transparent';
    const gridStrokeColor = 'var(--grid-line-color, rgba(128, 128, 128, 0.12))';
    const gridStrokeDasharray = '2 4';
    
    const axisTickStyleProps = {
        fill: 'var(--text-secondary-color)',
        fontSize: isFullScreen ? 12 : 11,
        fontFamily: 'var(--font-family)',
        fontWeight: 400,
        letterSpacing: '0.01em'
    };
    
    const axisLabelStyleProps = {
        fill: 'var(--text-secondary-color)',
        fontSize: isFullScreen ? 13 : 12,
        fontFamily: 'var(--font-family)',
        fontWeight: 500,
        letterSpacing: '0.02em',
        textTransform: 'uppercase' as const
    };

    // Google-grade floating tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload || !payload.length) return null;
        
        const data = payload[0].payload;
        const cluster = dataKeys.clusterKey && data[dataKeys.clusterKey];
        
        return (
            <div style={{
                background: 'rgba(22, 23, 27, 0.94)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                color: '#E8EAED',
                padding: '12px 16px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)',
                fontFamily: 'var(--font-family)',
                fontSize: '12px',
                minWidth: '170px',
                transition: 'all 0.15s ease'
            }}>
                {dataKeys.labelKey && data[dataKeys.labelKey] && (
                    <div style={{ 
                        fontWeight: 600, 
                        fontSize: '13px',
                        marginBottom: '8px',
                        color: '#FFFFFF',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        paddingBottom: '6px'
                    }}>
                        {data[dataKeys.labelKey]}
                    </div>
                )}
                {cluster && (
                    <div style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: `${payload[0].fill}25`,
                        border: `1px solid ${payload[0].fill}50`,
                        marginBottom: '10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: payload[0].fill
                    }}>
                        <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: payload[0].fill,
                            marginRight: '6px'
                        }} />
                        {cluster}
                    </div>
                )}
                <div style={{ 
                    display: 'grid',
                    gap: '8px',
                    marginTop: cluster || (dataKeys.labelKey && data[dataKeys.labelKey]) ? '12px' : '0'
                }}>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <span style={{ 
                            fontSize: '12px', 
                            color: 'var(--text-tertiary-color)',
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            {dataKeys.xAxis}
                        </span>
                        <span style={{ 
                            fontWeight: 600, 
                            fontSize: '13px',
                            fontVariantNumeric: 'tabular-nums'
                        }}>
                            {data[dataKeys.xAxis]?.toFixed(2)}
                        </span>
                    </div>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <span style={{ 
                            fontSize: '12px', 
                            color: 'var(--text-tertiary-color)',
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            {dataKeys.yAxis}
                        </span>
                        <span style={{ 
                            fontWeight: 600, 
                            fontSize: '13px',
                            fontVariantNumeric: 'tabular-nums'
                        }}>
                            {data[dataKeys.yAxis]?.toFixed(2)}
                        </span>
                    </div>
                    {dataKeys.zAxis && data[dataKeys.zAxis] !== undefined && (
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '16px'
                        }}>
                            <span style={{ 
                                fontSize: '12px', 
                                color: 'var(--text-tertiary-color)',
                                fontWeight: 500,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                {dataKeys.zAxis}
                            </span>
                            <span style={{ 
                                fontWeight: 600, 
                                fontSize: '13px',
                                fontVariantNumeric: 'tabular-nums'
                            }}>
                                {data[dataKeys.zAxis]?.toFixed(2)}
                            </span>
                        </div>
                    )}
                </div>
                {sanitizedTrendline && (
                    <div style={{ 
                        marginTop: '14px', 
                        paddingTop: '14px', 
                        borderTop: '1px solid rgba(var(--border-color-rgb), 0.3)',
                        display: 'grid',
                        gap: '6px'
                    }}>
                        {sanitizedTrendline.type && sanitizedTrendline.type !== 'linear' && (
                            <div style={{ 
                                fontSize: '11.5px',
                                fontWeight: 600,
                                color: 'var(--text-color)',
                                marginBottom: '4px',
                                textTransform: 'capitalize'
                            }}>
                                {sanitizedTrendline.type} Regression
                                {sanitizedTrendline.degree && ` (degree ${sanitizedTrendline.degree})`}
                            </div>
                        )}
                        {sanitizedTrendline.equation && (
                            <div style={{ 
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                color: 'var(--text-secondary-color)',
                                marginBottom: '6px',
                                padding: '4px 6px',
                                background: 'rgba(var(--border-color-rgb), 0.15)',
                                borderRadius: '10px'
                            }}>
                                {sanitizedTrendline.equation}
                            </div>
                        )}
                        {sanitizedTrendline.rSquared !== undefined && (
                            <div style={{ 
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '12px'
                            }}>
                                <span style={{ 
                                    color: 'var(--text-tertiary-color)',
                                    fontWeight: 500,
                                    letterSpacing: '0.03em'
                                }}>
                                    R²
                                </span>
                                <span style={{ 
                                    fontWeight: 700,
                                    fontVariantNumeric: 'tabular-nums',
                                    color: sanitizedTrendline.rSquared > 0.7 ? '#10b981' : 'var(--text-color)'
                                }}>
                                    {sanitizedTrendline.rSquared.toFixed(3)}
                                </span>
                            </div>
                        )}
                        {sanitizedTrendline.adjustedRSquared !== undefined && (
                            <div style={{ 
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '12px'
                            }}>
                                <span style={{ 
                                    color: 'var(--text-tertiary-color)',
                                    fontWeight: 500,
                                    letterSpacing: '0.03em'
                                }}>
                                    Adj. R²
                                </span>
                                <span style={{ 
                                    fontWeight: 700,
                                    fontVariantNumeric: 'tabular-nums'
                                }}>
                                    {sanitizedTrendline.adjustedRSquared.toFixed(3)}
                                </span>
                            </div>
                        )}
                        {sanitizedTrendline.pValue !== undefined && (
                            <div style={{ 
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '12px'
                            }}>
                                <span style={{ 
                                    color: 'var(--text-tertiary-color)',
                                    fontWeight: 500,
                                    letterSpacing: '0.03em'
                                }}>
                                    p-value
                                </span>
                                <span style={{ 
                                    fontWeight: 700,
                                    fontVariantNumeric: 'tabular-nums',
                                    color: sanitizedTrendline.pValue < 0.05 ? '#10b981' : 'var(--text-color)'
                                }}>
                                    {sanitizedTrendline.pValue < 0.001 ? '<0.001' : sanitizedTrendline.pValue.toFixed(4)}
                                </span>
                            </div>
                        )}
                        {sanitizedTrendline.rmse !== undefined && (
                            <div style={{ 
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '12px'
                            }}>
                                <span style={{ 
                                    color: 'var(--text-tertiary-color)',
                                    fontWeight: 500,
                                    letterSpacing: '0.03em'
                                }}>
                                    RMSE
                                </span>
                                <span style={{ 
                                    fontWeight: 700,
                                    fontVariantNumeric: 'tabular-nums'
                                }}>
                                    {sanitizedTrendline.rmse.toFixed(3)}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Generate scatter elements for clusters
    const scatterName = title || 'Data Points';
    
    // Group by cluster if clusterKey exists
    const clusterGroups = React.useMemo(() => {
        if (!dataKeys.clusterKey) return { [scatterName]: sanitizedData };
        
        const groups: Record<string, any[]> = {};
        sanitizedData.forEach(item => {
            const cluster = item[dataKeys.clusterKey!] || 'Other';
            if (!groups[cluster]) groups[cluster] = [];
            groups[cluster].push(item);
        });
        return groups;
    }, [sanitizedData, dataKeys.clusterKey, scatterName]);

    const showBrush = isFullScreen && sanitizedData.length > 10;

    // Sort data by x-axis for Brush component (Brush requires sorted data)
    const sortedData = React.useMemo(() => {
        return [...sanitizedData].sort((a, b) => {
            const xA = Number(a[dataKeys.xAxis]);
            const xB = Number(b[dataKeys.xAxis]);
            return xA - xB;
        });
    }, [sanitizedData, dataKeys.xAxis]);

    const [xDomain, setXDomain] = React.useState<[number | 'auto', number | 'auto']>(['auto', 'auto']);
    const [containerHeight, setContainerHeight] = React.useState<number>(0);

    React.useEffect(() => {
        // Reset domain whenever fullscreen/brush visibility toggles
        setXDomain(['auto', 'auto']);
    }, [showBrush, sortedData.length]);

    const handleBrushChange = React.useCallback((range: { startIndex?: number; endIndex?: number } | undefined) => {
        if (!range || range.startIndex === undefined || range.endIndex === undefined) {
            setXDomain(['auto', 'auto']);
            return;
        }

        const startIndex = Math.max(0, range.startIndex);
        const endIndex = Math.min(sortedData.length - 1, range.endIndex);

        // Get x-values from the selected range
        const slice = sortedData.slice(startIndex, endIndex + 1);
        const xValues = slice.map(item => Number(item[dataKeys.xAxis]));
        if (xValues.length > 0) {
            setXDomain([xValues[0], xValues[xValues.length - 1]]); // Already sorted
        }
    }, [sortedData, dataKeys.xAxis]);

    const legendHeight = 36;
    const brushHeight = 40;
    const bottomPadding = showBrush ? 18 : 12;
    const effectiveHeight = containerHeight || (isFullScreen ? 360 : 260);
    const brushY = Math.max(0, effectiveHeight - brushHeight - (showBrush ? legendHeight + 6 : 4));

    return (
        <ResponsiveContainer
            width="100%"
            height="100%"
            onResize={(_, height) => setContainerHeight(height)}
        >
            <ComposedChart
                data={sortedData}
                margin={{
                    top: isFullScreen ? 20 : 10,
                    right: isFullScreen ? 35 : 15,
                    bottom: showBrush ? brushHeight + bottomPadding + legendHeight + 10 : (isFullScreen ? 70 : 50),
                    left: isFullScreen ? 60 : 40
                }}
            >
                <CartesianGrid strokeDasharray={gridStrokeDasharray} strokeOpacity={0.5} stroke={gridStrokeColor} />
                <XAxis
                    xAxisId="x"
                    type="number"
                    dataKey={dataKeys.xAxis}
                    name={dataKeys.xAxis}
                    stroke={axisStrokeColor}
                    tick={axisTickStyleProps}
                    domain={xDomain}
                    allowDataOverflow
                    label={{
                        ...axisLabelStyleProps,
                        value: dataKeys.xAxis,
                        position: 'insideBottom',
                        offset: isFullScreen ? -45 : -30
                    }}
                />
                <YAxis
                    yAxisId="y"
                    type="number"
                    dataKey={dataKeys.yAxis}
                    name={dataKeys.yAxis}
                    stroke={axisStrokeColor}
                    tick={axisTickStyleProps}
                    domain={['auto', 'auto']}
                    label={{
                        ...axisLabelStyleProps,
                        value: dataKeys.yAxis,
                        angle: -90,
                        position: 'insideLeft',
                        offset: isFullScreen ? -45 : -30
                    }}
                />
                {dataKeys.zAxis && (
                    <ZAxis
                        type="number"
                        dataKey={dataKeys.zAxis}
                        range={[60, 400]}
                        name={dataKeys.zAxis}
                    />
                )}
                <Tooltip 
                    cursor={{ 
                        strokeDasharray: '3 3', 
                        stroke: 'rgba(255, 255, 255, 0.3)',
                        strokeWidth: 1.2
                    }} 
                    content={<CustomTooltip />}
                    animationDuration={150}
                    animationEasing="ease-out"
                />
                <Legend
                    wrapperStyle={{
                        fontFamily: 'var(--font-family)',
                        fontSize: isFullScreen ? '13px' : '12px',
                        color: 'var(--text-secondary-color)',
                        fontWeight: 400,
                        letterSpacing: '0.01em',
                        paddingTop: '12px',
                        paddingBottom: '4px'
                    }}
                    iconType="circle"
                    iconSize={isFullScreen ? 9 : 8}
                    verticalAlign="bottom"
                    height={legendHeight}
                    formatter={(value: any) => (
                        <span style={{
                            color: 'var(--text-secondary-color)',
                            fontSize: isFullScreen ? '12.5px' : '11.5px',
                            fontWeight: 500,
                            marginLeft: '4px',
                            marginRight: '14px',
                            letterSpacing: '0.01em'
                        }}>
                            {value}
                        </span>
                    )}
                />

                {showBrush && (
                    <Brush
                        dataKey={dataKeys.xAxis}
                        height={32}
                        stroke="rgba(138, 180, 248, 0.6)"
                        fill="rgba(var(--card-bg-base-rgb), 0.3)"
                        travellerWidth={12}
                        y={brushY}
                        onChange={handleBrushChange}
                        tickFormatter={(value) => {
                            if (typeof value === 'number') {
                                return value < 100 ? value.toFixed(1) : value.toFixed(0);
                            }
                            return String(value).slice(0, 12);
                        }}
                    />
                )}

                {/* Render scatter plots for each cluster */}
                {Object.entries(clusterGroups).map(([clusterName, clusterData], idx) => {
                    const color = CHART_COLORS[(chartIndex + idx) % CHART_COLORS.length];
                    return (
                        <Scatter
                            xAxisId="x"
                            yAxisId="y"
                            key={clusterName}
                            name={clusterName}
                            data={clusterData}
                            dataKey={dataKeys.yAxis}
                            fill={color}
                            shape="circle"
                            fillOpacity={0.8}
                            stroke="rgba(18, 19, 22, 0.85)"
                            strokeWidth={1}
                        />
                    );
                })}
                
                {/* Render trendline/regression curve */}
                {sanitizedTrendline && sanitizedTrendline.data && sanitizedTrendline.data.length > 0 && (
                    <>
                        <Line
                            type={sanitizedTrendline.type === 'polynomial' || sanitizedTrendline.type === 'exponential' || sanitizedTrendline.type === 'logarithmic' || sanitizedTrendline.type === 'power' || sanitizedTrendline.type === 'logistic' ? 'monotone' : 'linear'}
                            data={sanitizedTrendline.data}
                            dataKey={sanitizedTrendline.dataKeys!.yAxis}
                            stroke={trendlineColor}
                            strokeWidth={isFullScreen ? 3 : 2.5}
                            dot={false}
                            activeDot={false}
                            name={sanitizedTrendline.name || `${sanitizedTrendline.type || 'Linear'} Fit`}
                            isAnimationActive={false}
                            strokeDasharray={sanitizedTrendline.type === 'linear' || !sanitizedTrendline.type ? '6 4' : '0'}
                            strokeOpacity={0.85}
                        />
                        {/* Render confidence bands if provided */}
                        {sanitizedTrendline.confidenceBands && (
                            <>
                                <Area
                                    type="monotone"
                                    data={sanitizedTrendline.confidenceBands.upper}
                                    dataKey={sanitizedTrendline.dataKeys!.yAxis}
                                    stroke="none"
                                    fill={trendlineColor}
                                    fillOpacity={0.15}
                                    isAnimationActive={false}
                                    name={`${sanitizedTrendline.confidenceBands.level || 95}% Confidence`}
                                />
                                <Area
                                    type="monotone"
                                    data={sanitizedTrendline.confidenceBands.lower}
                                    dataKey={sanitizedTrendline.dataKeys!.yAxis}
                                    stroke="none"
                                    fill={trendlineColor}
                                    fillOpacity={0.15}
                                    isAnimationActive={false}
                                    connectNulls={false}
                                />
                            </>
                        )}
                    </>
                )}
                
                {/* Brush rendered above ensures correct spacing; nothing else needed here */}
            </ComposedChart>
        </ResponsiveContainer>
    );
};
