/**
 * Virtualized Chart Grid
 * Renders all charts but optimizes for large datasets
 */

import React from 'react';
import type { ChartSpec } from '../types';
import { ChartDisplay } from './ChartDisplay';
import PipelineStageErrorBoundary from './PipelineStageErrorBoundary';

interface VirtualizedChartGridProps {
  charts: ChartSpec[];
  onChartClick?: (chartId: string) => void;
  onRemoveChart?: (index: number) => void;
  onDataChange?: (index: number, newData: any[]) => void;
}

export const VirtualizedChartGrid: React.FC<VirtualizedChartGridProps> = ({
  charts,
  onChartClick,
  onRemoveChart,
  onDataChange
}) => {
  return (
    <div
      id="active-charts-container"
      className="grid-chart-container"
    >
      {charts.map((chart, index) => {
        const chartId = `chart-${index}`;
        // Create a unique key that includes data length to force re-render on data changes
        const dataKey = Array.isArray(chart.data) ? `-${chart.data.length}` : '';
        const uniqueKey = `${chartId}${dataKey}`;

        return (
          <PipelineStageErrorBoundary key={uniqueKey} stageName={`Chart: ${chart.title}`}>
            <ChartDisplay
              chartSpec={chart}
              chartIndex={index}
              isFullScreen={false}
              onToggleFullScreen={() => onChartClick?.(chartId)}
              onRemove={() => onRemoveChart?.(index)}
              onDataChange={(newData) => onDataChange?.(index, newData)}
            />
          </PipelineStageErrorBoundary>
        );
      })}
    </div>
  );
};
