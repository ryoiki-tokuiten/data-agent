import React, { useState, useEffect } from 'react';
import { ResponsiveChoropleth } from '@nivo/geo';
import type { ChoroplethData, ChoroplethDataKeys } from '../types';
import { loadWorldMapFeatures } from '../utils/worldMapData';
import { useUIStore } from '../hooks/stores';

interface ChoroplethProps {
  data: ChoroplethData[];
  dataKeys: ChoroplethDataKeys;
  features?: any; // GeoJSON features (optional, will load default world map if not provided)
  isFullScreen?: boolean;
}

export const Choropleth: React.FC<ChoroplethProps> = ({
  data,
  dataKeys,
  features: providedFeatures,
  isFullScreen = false
}) => {
  const [features, setFeatures] = useState<any>(providedFeatures || null);
  const [loading, setLoading] = useState(!providedFeatures);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const theme = useUIStore(state => state.theme);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!providedFeatures) {
      loadWorldMapFeatures()
        .then(worldFeatures => {
          setFeatures(worldFeatures);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load world map features:', err);
          setLoading(false);
        });
    }
  }, [providedFeatures]);

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary-color)',
        fontSize: isFullScreen ? '1rem' : '0.9rem'
      }}>
        Loading world map...
      </div>
    );
  }

  if (!features || features.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary-color)',
        fontSize: isFullScreen ? '1rem' : '0.9rem'
      }}>
        Failed to load map data
      </div>
    );
  }

  // Determine domain from data
  const values = data.map(d => d[dataKeys.valueKey] as number).filter(v => typeof v === 'number');
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  const maxValue = values.length > 0 ? Math.max(...values) : 1000;

  // Transform data to ensure 'id' field matches feature IDs
  const transformedData = data.map(item => ({
    id: item[dataKeys.idKey],
    value: item[dataKeys.valueKey]
  }));

  // Debug logging
  console.log('Choropleth data:', transformedData.slice(0, 5));
  console.log('Choropleth features sample:', features.slice(0, 3).map((f: any) => ({ id: f.id, name: f.properties?.name })));

  // Calculate optimal projection scale based on container
  const calculateProjectionScale = () => {
    if (!isFullScreen) return 100;
    // In fullscreen, scale to use more horizontal space
    return containerSize.width > 0 ? Math.min(containerSize.width / 6, 200) : 150;
  };

  return (
    <div
      ref={(node) => {
        if (node && isFullScreen) {
          const rect = node.getBoundingClientRect();
          if (rect.width !== containerSize.width || rect.height !== containerSize.height) {
            setContainerSize({ width: rect.width, height: rect.height });
          }
        }
      }}
      style={{ width: '100%', height: '100%', minHeight: isFullScreen ? '600px' : '320px', position: 'relative' }}
    >
      <ResponsiveChoropleth
        data={transformedData}
        features={features}
        margin={{
          top: isFullScreen ? 20 : 10,
          right: isFullScreen ? 20 : 10,
          bottom: isFullScreen ? 20 : 10,
          left: isFullScreen ? 20 : 10
        }}
        colors={isDark
          ? ['rgba(138, 180, 248, 0.2)', 'rgba(138, 180, 248, 0.45)', '#8AB4F8', '#81C995', '#FDD663', '#FCAD70', '#F28B82']
          : ['#D2E3FC', '#AECBFA', '#8AB4F8', '#81C995', '#FDD663', '#FCAD70', '#EA4335']}
        domain={[minValue, maxValue]}
        unknownColor={isDark ? "rgba(255, 255, 255, 0.05)" : "#E4E7EB"}
        label="properties.name"
        valueFormat=".2s"
        projectionScale={calculateProjectionScale()}
        projectionTranslation={[0.5, 0.5]}
        projectionRotation={[0, 0, 0]}
        enableGraticule={true}
        graticuleLineColor={isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(60, 64, 67, 0.12)"}
        graticuleLineWidth={0.5}
        borderWidth={(feature) => selectedCountry && feature.id === selectedCountry ? 2 : (isFullScreen ? 0.8 : 0.5)}
        borderColor={(feature) => selectedCountry && feature.id === selectedCountry
          ? (isDark ? '#8AB4F8' : '#1A73E8')
          : (isDark ? 'rgba(255, 255, 255, 0.12)' : '#BDC1C6')}
        onClick={(feature) => {
          setSelectedCountry(feature.id === selectedCountry ? null : feature.id);
        }}
        tooltip={({ feature }) => {
          const dataPoint = transformedData.find(d => d.id === feature.id);
          return (
            <div className="google-chart-tooltip" style={{ minWidth: '150px' }}>
              <div className="google-chart-tooltip-header">
                <span className="google-chart-tooltip-dot" style={{ backgroundColor: feature.color || '#8AB4F8' }} />
                <span>{feature.label}</span>
              </div>
              <div className="google-chart-tooltip-row">
                <span className="google-chart-tooltip-name">Value</span>
                <span className="google-chart-tooltip-val">{feature.formattedValue}</span>
              </div>
              {dataPoint && Object.entries(dataPoint).map(([key, value]) => {
                if (key !== 'id' && key !== 'value') {
                  return (
                    <div key={key} className="google-chart-tooltip-row">
                      <span className="google-chart-tooltip-name">{key}</span>
                      <span className="google-chart-tooltip-val">{String(value)}</span>
                    </div>
                  );
                }
                return null;
              })}
              <div style={{ marginTop: '6px', fontSize: '10px', color: '#9AA0A6' }}>
                Click to highlight
              </div>
            </div>
          );
        }}
        theme={{
          background: 'transparent',
          text: {
            fill: 'var(--text-color)',
            fontSize: isFullScreen ? 12 : 11,
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
            anchor: 'bottom-left',
            direction: 'column',
            justify: true,
            translateX: isFullScreen ? 30 : 20,
            translateY: isFullScreen ? -120 : -80,
            itemsSpacing: 0,
            itemWidth: isFullScreen ? 100 : 94,
            itemHeight: isFullScreen ? 20 : 18,
            itemDirection: 'left-to-right',
            itemTextColor: 'var(--text-color)',
            itemOpacity: 0.85,
            symbolSize: isFullScreen ? 20 : 18,
            effects: [
              {
                on: 'hover',
                style: {
                  itemTextColor: 'var(--glow-color)',
                  itemOpacity: 1
                }
              }
            ]
          }
        ]}
      />
    </div>
  );
};
