import React from 'react';
import { ResponsiveTimeRange } from '@nivo/calendar';
import type { TimeRangeDataKeys, TimeRangeDataItem } from '../types';
import { useUIStore } from '../stores';

interface NivoTimeRangeProps {
    data: any[];
    dataKeys: TimeRangeDataKeys;
    isFullScreen?: boolean;
}

export const NivoTimeRange: React.FC<NivoTimeRangeProps> = ({ data, dataKeys, isFullScreen = false }) => {
    const theme = useUIStore(state => state.theme);
    const isDark = theme === 'dark';

    // Resolve keys with fallbacks
    const firstItem = (data && data[0]) || {};
    const dateKey = dataKeys?.dateKey || (dataKeys as any)?.dayKey || (dataKeys as any)?.xAxis || ('date' in firstItem ? 'date' : ('day' in firstItem ? 'day' : Object.keys(firstItem)[0] || 'date'));
    const valueKey = dataKeys?.valueKey || (dataKeys as any)?.yAxis || ('value' in firstItem ? 'value' : Object.keys(firstItem).find(k => k !== dateKey) || 'value');

    // Transform data to Nivo's expected format
    const transformedData: TimeRangeDataItem[] = (data || []).map(item => ({
        day: String(item[dateKey] || item.date || item.day || ''),
        value: Number(item[valueKey] ?? item.value ?? 0)
    })).filter(d => Boolean(d.day));

    // Calculate valid date range from data
    const validDates = transformedData
        .map(d => new Date(d.day))
        .filter(d => !isNaN(d.getTime()));

    let fromDate = '2023-01-01';
    let toDate = '2023-12-31';

    if (validDates.length > 0) {
        const minDate = new Date(Math.min(...validDates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...validDates.map(d => d.getTime())));
        fromDate = minDate.toISOString().split('T')[0];
        toDate = maxDate.toISOString().split('T')[0];
    }

    return (
        <div style={{ width: '100%', height: '100%', minHeight: isFullScreen ? '600px' : '320px', position: 'relative' }}>
            <ResponsiveTimeRange
            data={transformedData}
            from={fromDate}
            to={toDate}
            emptyColor={isDark ? "rgba(255, 255, 255, 0.04)" : "#F1F3F4"}
            colors={isDark 
              ? ['rgba(138, 180, 248, 0.15)', 'rgba(138, 180, 248, 0.3)', 'rgba(138, 180, 248, 0.5)', '#8AB4F8', '#669DF6', '#4285F4', '#1A73E8']
              : ['#E8F0FE', '#D2E3FC', '#AECBFA', '#8AB4F8', '#669DF6', '#4285F4', '#1A73E8']}
            margin={{ 
                top: isFullScreen ? 50 : 30, 
                right: isFullScreen ? 50 : 30, 
                bottom: isFullScreen ? 100 : 80, 
                left: isFullScreen ? 100 : 80 
            }}
            weekdayLegendOffset={isFullScreen ? 90 : 75}
            weekdayTicks={[0, 1, 2, 3, 4, 5, 6]}
            daySpacing={isFullScreen ? 4 : 3}
            dayBorderWidth={isDark ? 0 : 1}
            dayBorderColor={isDark ? "transparent" : "#E8EAED"}
            square={false}
            theme={{
                background: 'transparent',
                text: {
                    fill: 'var(--text-color)',
                    fontSize: isFullScreen ? 13 : 11,
                    fontFamily: 'Google Sans, Inter, Roboto, sans-serif',
                    fontWeight: 500
                },
                tooltip: {
                    container: {
                        background: 'transparent',
                        padding: 0,
                        boxShadow: 'none',
                        border: 'none'
                    }
                }
            }}
            legends={[
                {
                    anchor: 'bottom',
                    direction: 'row',
                    itemCount: 7,
                    itemWidth: isFullScreen ? 50 : 45,
                    itemHeight: isFullScreen ? 40 : 36,
                    itemsSpacing: isFullScreen ? 8 : 6,
                    itemDirection: 'right-to-left',
                    translateX: 0,
                    translateY: isFullScreen ? -30 : -25,
                    symbolSize: isFullScreen ? 14 : 12,
                    symbolShape: 'square'
                }
            ]}
            tooltip={({ day, value, color }) => (
                <div className="google-chart-tooltip" style={{ minWidth: '130px' }}>
                    <div className="google-chart-tooltip-header">
                        <span className="google-chart-tooltip-dot" style={{ backgroundColor: color }} />
                        <span>{day}</span>
                    </div>
                    <div className="google-chart-tooltip-row">
                        <span className="google-chart-tooltip-name">Value</span>
                        <span className="google-chart-tooltip-val">{value !== undefined ? value : '—'}</span>
                    </div>
                </div>
            )}
        />
        </div>
    );
};
