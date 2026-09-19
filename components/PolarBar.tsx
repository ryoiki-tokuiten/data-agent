import React from 'react';
import { ResponsivePolarBar } from '@nivo/polar-bar';
import type { PolarBarData, PolarBarDataKeys } from '../types';
import { CHART_COLORS } from '../utils/constants';

type RadialInput = {
  id: string | number;
  data: Array<{ x: string | number; y: number }>;
};

interface PolarBarProps {
  data: Array<PolarBarData | RadialInput>;
  dataKeys?: PolarBarDataKeys;
  isFullScreen?: boolean;
}

export const PolarBar: React.FC<PolarBarProps> = ({ data, dataKeys, isFullScreen = false }) => {
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);

  const { normalizedData, normalizedKeys, normalizedIndexBy } = React.useMemo(() => {
    const providedKeys = dataKeys?.keys ?? [];
    const providedIndex = dataKeys?.indexBy;

    if (providedKeys.length > 0 && providedIndex) {
      return {
        normalizedData: data as PolarBarData[],
        normalizedKeys: providedKeys,
        normalizedIndexBy: providedIndex,
      };
    }

    const isRadialFormat = Array.isArray(data) && data.every((item): item is RadialInput => {
      return item && typeof item === 'object' && 'data' in item && Array.isArray((item as RadialInput).data);
    });

    if (!isRadialFormat) {
      const firstRow = (data as PolarBarData[])[0] ?? {};
      const fallbackKeys = Object.keys(firstRow).filter(k => k !== 'id');
      const fallbackIndex = (dataKeys?.indexBy) || 'category';
      return {
        normalizedData: data as PolarBarData[],
        normalizedKeys: fallbackKeys.length ? fallbackKeys : ['value'],
        normalizedIndexBy: fallbackIndex,
      };
    }

    const records: PolarBarData[] = [];
    const keySet = new Set<string>();

    (data as RadialInput[]).forEach(group => {
      const record: PolarBarData = {};
      record.category = String(group.id ?? 'Category');

      group.data.forEach(point => {
        const key = typeof point.x === 'string' ? point.x : 'value';
        record[key] = point.y ?? 0;
        keySet.add(key);
      });

      records.push(record);
    });

    const computedKeys = keySet.size > 0 ? Array.from(keySet) : ['value'];

    return {
      normalizedData: records,
      normalizedKeys: computedKeys,
      normalizedIndexBy: 'category',
    };
  }, [data, dataKeys]);

  return (
    <ResponsivePolarBar
      data={normalizedData as PolarBarData[]}
      keys={normalizedKeys}
      indexBy={normalizedIndexBy}
      valueSteps={5}
      valueFormat=">-.2f"
      margin={{ top: 30, right: 20, bottom: isFullScreen ? 80 : 70, left: 20 }}
      innerRadius={0.25}
      cornerRadius={4}
      borderWidth={1}
      borderColor={{
        from: 'color',
        modifiers: [['brighter', 0.2]]
      }}
      colors={CHART_COLORS}
      arcLabelsSkipRadius={28}
      arcLabelsTextColor={{
        from: 'color',
        modifiers: [['darker', 2]]
      }}
      radialAxis={{
        angle: 180,
        ticksPosition: 'after',
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0
      }}
      circularAxisOuter={{
        tickSize: 5,
        tickPadding: 15,
        tickRotation: 0
      }}
      onClick={(bar) => {
        const barId = typeof bar.id === 'string' ? bar.id : String(bar.id);
        setSelectedKey(barId === selectedKey ? null : barId);
      }}
      legends={[
        {
          anchor: 'bottom',
          direction: 'row',
          translateY: isFullScreen ? 60 : 50,
          itemWidth: 90,
          itemHeight: 16,
          symbolShape: 'circle',
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
  );
};
