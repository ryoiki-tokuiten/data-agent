import React from 'react';
import { ResponsiveTreeMap } from '@nivo/treemap';
import type { TreeMapData } from '../types';

// Google-inspired luminous dark-theme color palette for TreeMap
const TREEMAP_COLORS = [
  '#8AB4F8',    // Google blue
  '#81C995',    // Google green
  '#FDD663',    // Google yellow
  '#F28B82',    // Google coral/red
  '#C58AF9',    // Google purple
  '#78D9EC',    // Google cyan
  '#FF8BCB',    // Google pink
  '#FCAD70',    // Google orange
  '#5BB974',    // Google emerald
  '#A8C7FA',    // Google sky
];

interface TreeMapProps {
  data: TreeMapData;
  isFullScreen?: boolean;
}

export const TreeMap: React.FC<TreeMapProps> = ({ data, isFullScreen = false }) => {
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);

  return (
    <ResponsiveTreeMap
      data={data}
      identity="name"
      value="value"
      valueFormat=".02s"
      margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
      labelSkipSize={isFullScreen ? 10 : 12}
      labelTextColor={{ from: 'color', modifiers: [['darker', 3.5]] }}
      parentLabelPosition="left"
      parentLabelTextColor="var(--text-color)"
      borderColor="rgba(22, 23, 27, 0.95)"
      borderWidth={2}
      colors={TREEMAP_COLORS}
      colorBy="id"
      animate={true}
      motionConfig="gentle"
      onClick={(node) => {
        const nodeId = typeof node.id === 'string' ? node.id : String(node.id);
        setSelectedNode(nodeId === selectedNode ? null : nodeId);
      }}
      nodeOpacity={(node) => {
        if (!selectedNode) return 0.92;
        const nodeId = typeof node.id === 'string' ? node.id : String(node.id);
        return nodeId !== selectedNode ? 0.35 : 1;
      }}
      theme={{
        labels: {
          text: {
            fontSize: isFullScreen ? 13 : 12,
            fontFamily: 'Google Sans, Inter, Roboto, sans-serif',
            fontWeight: 600
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
