import React from 'react';
import { ResponsiveRadialBar } from '@nivo/radial-bar';
import type { RadialBarData } from '../types';
import { CHART_COLORS } from '../utils/constants';

interface RadialBarProps {
  data: RadialBarData[];
  isFullScreen?: boolean;
}

export const RadialBar: React.FC<RadialBarProps> = ({ data, isFullScreen = false }) => {
  const [selectedBar, setSelectedBar] = React.useState<string | null>(null);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: isFullScreen ? '600px' : '320px', position: 'relative' }}>
      <ResponsiveRadialBar
      data={data}
      valueFormat=">-.2f"
      padding={0.35}
      cornerRadius={4}
      margin={{ top: 40, right: isFullScreen ? 140 : 120, bottom: 40, left: 40 }}
      colors={CHART_COLORS}
      borderWidth={1}
      borderColor={{
        from: 'color',
        modifiers: [['brighter', 0.2]]
      }}
      radialAxisStart={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0
      }}
      circularAxisOuter={{
        tickSize: 5,
        tickPadding: 12,
        tickRotation: 0
      }}
      onClick={(bar) => {
        const barId = typeof bar.id === 'string' ? bar.id : String(bar.id);
        setSelectedBar(barId === selectedBar ? null : barId);
      }}
      enableRadialGrid={true}
      enableCircularGrid={true}
      legends={[
        {
          anchor: 'right',
          direction: 'column',
          translateX: isFullScreen ? 100 : 80,
          itemsSpacing: 8,
          itemWidth: 100,
          itemHeight: 18,
          itemTextColor: 'var(--text-secondary-color)',
          effects: [
            {
              on: 'hover',
              style: {
                itemTextColor: 'var(--text-color)'
              }
            }
          ]
        }
      ]}
      animate={true}
      motionConfig="gentle"
      theme={{
        grid: {
          line: {
            stroke: 'rgba(255, 255, 255, 0.07)',
            strokeWidth: 1,
            strokeDasharray: '2 4'
          }
        },
        axis: {
          ticks: {
            text: {
              fontSize: isFullScreen ? 12 : 11,
              fontFamily: 'Google Sans, Inter, Roboto, sans-serif',
              fill: 'var(--text-secondary-color)'
            }
          }
        },
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
  );
};
