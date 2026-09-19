import React from 'react';
import { ResponsiveWaffle } from '@nivo/waffle';
import { CHART_COLORS } from '../constants';

interface WaffleChartData {
  id: string;
  label: string;
  value: number;
  color?: string;
}

interface WaffleChartProps {
  data: WaffleChartData[];
  isFullScreen?: boolean;
  total?: number;
  rows?: number;
  columns?: number;
}

export const WaffleChart: React.FC<WaffleChartProps> = ({
  data,
  isFullScreen = false,
  total,
  rows = 10,
  columns = 14
}) => {
  const computedTotal = total || data.reduce((sum, item) => sum + item.value, 0);

  // Calculate percentages for each item
  const dataWithPercentages = React.useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      percentage: ((item.value / computedTotal) * 100).toFixed(1),
      color: item.color || CHART_COLORS[index % CHART_COLORS.length]
    }));
  }, [data, computedTotal]);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', minHeight: isFullScreen ? '600px' : '320px', gap: isFullScreen ? '2rem' : '0', position: 'relative' }}>
      {/* Waffle Chart */}
      <div style={{ flex: isFullScreen ? '0 0 70%' : '1', height: '100%', minHeight: isFullScreen ? '600px' : '320px', position: 'relative' }}>
        <ResponsiveWaffle
          data={data}
          total={computedTotal}
          rows={rows}
          columns={columns}
          margin={{ top: 10, right: 10, bottom: isFullScreen ? 20 : 70, left: 10 }}
          colors={CHART_COLORS}
          borderRadius={4}
          borderColor={{
            from: 'color',
            modifiers: [['brighter', 0.2]]
          }}
          borderWidth={1}
          animate={true}
          motionConfig="gentle"
          legends={isFullScreen ? [] : [
            {
              anchor: 'bottom',
              direction: 'row',
              justify: false,
              translateX: 0,
              translateY: 50,
              itemsSpacing: 8,
              itemWidth: 100,
              itemHeight: 20,
              itemDirection: 'left-to-right',
              itemOpacity: 0.9,
              itemTextColor: 'var(--text-secondary-color)',
              symbolSize: 14,
              symbolShape: 'circle',
              effects: [
                {
                  on: 'hover',
                  style: {
                    itemTextColor: 'var(--text-color)',
                    itemOpacity: 1
                  }
                }
              ]
            }
          ]}
          theme={{
            labels: {
              text: {
                fontSize: isFullScreen ? 13 : 12,
                fontFamily: 'Google Sans, Inter, Roboto, sans-serif',
                fill: 'var(--text-color)',
                fontWeight: 500
              }
            },
            legends: {
              text: {
                fontSize: isFullScreen ? 13 : 12,
                fontFamily: 'Google Sans, Inter, Roboto, sans-serif',
                fill: 'var(--text-secondary-color)'
              }
            },
            tooltip: {
              container: {
                background: 'rgba(22, 23, 27, 0.94)',
                color: '#F1F3F4',
                fontSize: '12px',
                borderRadius: '10px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
                padding: '10px 14px',
                backdropFilter: 'blur(14px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontFamily: 'Google Sans, Inter, Roboto, sans-serif'
              }
            }
          }}
        />
      </div>

      {/* Side Legend Panel - Only in fullscreen */}
      {isFullScreen && (
        <div style={{
          flex: '0 0 25%',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          padding: '1rem',
          overflowY: 'auto'
        }}>
          {dataWithPercentages.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'rgba(22, 23, 27, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: item.color,
                    flexShrink: 0,
                    boxShadow: `0 0 8px ${item.color}66`
                  }}
                />
                <span style={{
                  color: 'var(--text-color)',
                  fontSize: '0.85rem',
                  fontFamily: 'Google Sans, Inter, Roboto, sans-serif',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {item.label}
                </span>
              </div>
              <span style={{
                color: 'var(--text-secondary-color)',
                fontSize: '0.85rem',
                fontFamily: 'Google Sans, Inter, Roboto, sans-serif',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                marginLeft: '1rem',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}>
                {item.percentage}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
