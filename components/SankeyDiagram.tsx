import React from 'react';
import { ResponsiveSankey } from '@nivo/sankey';
import type { SankeyData } from '../types';
import { CHART_COLORS } from '../constants';

interface SankeyDiagramProps {
  data: SankeyData;
  isFullScreen?: boolean;
}

export const SankeyDiagram: React.FC<SankeyDiagramProps> = ({ 
  data,
  isFullScreen = false
}) => {
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);
  const [highlightedLinks, setHighlightedLinks] = React.useState<Set<string>>(new Set());

  // Transform data to match Nivo's expected format
  const transformedData = React.useMemo(() => {
    if (!data || !data.nodes || !data.links) {
      return { nodes: [], links: [] };
    }

    // Add unique IDs to nodes using their names or fallback to index
    const nodesWithIds = data.nodes.map((node, index) => {
      // Clean up node names - expand common abbreviations
      let cleanName = node.name || `Node ${index + 1}`;
      
      // Expand common abbreviations in node names
      cleanName = cleanName
        .replace(/^mfr_/i, 'Manufacturer: ')
        .replace(/^turer_/i, 'Manufacturer: ')
        .replace(/^manuf_/i, 'Manufacturer: ')
        .replace(/^cat_/i, 'Category: ')
        .replace(/^type_/i, 'Type: ')
        .replace(/^shelf_/i, 'Shelf: ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
      
      return {
        ...node,
        id: node.id || cleanName || `node_${index}`,
        name: cleanName
      };
    });

    // Transform links to use node IDs instead of indices
    const transformedLinks = data.links.map(link => {
      const sourceNode = nodesWithIds[link.source];
      const targetNode = nodesWithIds[link.target];
      
      if (!sourceNode || !targetNode) {
        console.warn('Invalid link:', link, 'Nodes:', nodesWithIds);
        return null;
      }
      
      return {
        source: sourceNode.id,
        target: targetNode.id,
        value: link.value
      };
    }).filter((link): link is { source: string; target: string; value: number } => link !== null);

    return {
      nodes: nodesWithIds,
      links: transformedLinks
    };
  }, [data]);

  const handleNodeClick = React.useCallback((node: any) => {
    const nodeId = typeof node.id === 'string' ? node.id : String(node.id);
    setSelectedNode(nodeId === selectedNode ? null : nodeId);
    
    // Highlight connected links
    if (nodeId !== selectedNode) {
      const connectedLinks = new Set<string>();
      transformedData.links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : String(link.source);
        const targetId = typeof link.target === 'string' ? link.target : String(link.target);
        if (sourceId === nodeId || targetId === nodeId) {
          connectedLinks.add(`${sourceId}-${targetId}`);
        }
      });
      setHighlightedLinks(connectedLinks);
    } else {
      setHighlightedLinks(new Set());
    }
  }, [selectedNode, transformedData.links]);

  return (
    <ResponsiveSankey
          data={transformedData}
          margin={{ top: 20, right: isFullScreen ? 80 : 50, bottom: 40, left: isFullScreen ? 150 : 120 }}
          align="justify"
          colors={CHART_COLORS}
          nodeOpacity={(node) => {
            if (!selectedNode) return 0.9;
            const nodeId = typeof node.id === 'string' ? node.id : String(node.id);
            return nodeId !== selectedNode ? 0.3 : 0.9;
          }}
          nodeHoverOpacity={1}
          nodeThickness={isFullScreen ? 24 : 20}
          nodeInnerPadding={3}
          nodeSpacing={isFullScreen ? 28 : 24}
          nodeBorderWidth={1}
          nodeBorderColor={{
            from: 'color',
            modifiers: [['darker', 0.8]]
          }}
          nodeBorderRadius={4}
          linkOpacity={(link) => {
            if (!selectedNode) return 0.45;
            const sourceId = typeof link.source === 'object' ? String(link.source.id) : String(link.source);
            const targetId = typeof link.target === 'object' ? String(link.target.id) : String(link.target);
            const linkId = `${sourceId}-${targetId}`;
            return highlightedLinks.has(linkId) ? 0.8 : 0.12;
          }}
          linkHoverOpacity={0.85}
          linkContract={2}
          linkBlendMode="normal"
          enableLinkGradient={true}
          labelPosition="outside"
          labelOrientation="horizontal"
          labelPadding={isFullScreen ? 20 : 16}
          labelTextColor={{
            from: 'color',
            modifiers: [['brighter', 0.8]]
          }}
          onClick={handleNodeClick}
          legends={[]}
          animate={true}
          motionConfig="gentle"
          tooltip={({ node }) => {
            if (!node) return null;
            const nodeId = typeof node.id === 'string' ? node.id : String(node.id);
            const nodeValue = typeof node.value === 'number' ? node.value : 0;
            const sourceCount = Array.isArray(node.sourceLinks) ? node.sourceLinks.length : 0;
            const targetCount = Array.isArray(node.targetLinks) ? node.targetLinks.length : 0;
            
            return (
              <div className="google-chart-tooltip" style={{ minWidth: '160px' }}>
                <div className="google-chart-tooltip-header">
                  <span className="google-chart-tooltip-dot" style={{ backgroundColor: node.color || '#8AB4F8' }} />
                  <span>{nodeId}</span>
                </div>
                <div className="google-chart-tooltip-row">
                  <span className="google-chart-tooltip-name">Total Flow</span>
                  <span className="google-chart-tooltip-val">{nodeValue.toFixed(2)}</span>
                </div>
                <div className="google-chart-tooltip-row">
                  <span className="google-chart-tooltip-name">Connections</span>
                  <span className="google-chart-tooltip-val">{sourceCount + targetCount}</span>
                </div>
                <div style={{ marginTop: '6px', fontSize: '10px', color: '#9AA0A6' }}>
                  Click to highlight connections
                </div>
              </div>
            );
          }}
          theme={{
            labels: {
              text: {
                fontSize: isFullScreen ? 13 : 12,
                fontFamily: 'Google Sans, Inter, Roboto, sans-serif',
                fill: 'var(--text-color)',
                fontWeight: 500
              }
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
        />
  );
};
