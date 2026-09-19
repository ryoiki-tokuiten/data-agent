import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection } from 'geojson';

let cachedWorldFeatures: any = null;

/**
 * Loads world country features with ISO A3 codes as IDs
 * Returns GeoJSON FeatureCollection suitable for Nivo Choropleth
 */
export async function loadWorldMapFeatures(): Promise<any> {
  if (cachedWorldFeatures) {
    return cachedWorldFeatures;
  }

  try {
    // Load Natural Earth data with ISO codes from a reliable CDN
    // This GeoJSON includes ISO_A3 codes which match our data format
    const response = await fetch(
      'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'
    );
    const geoJsonData = await response.json() as FeatureCollection;
    
    // Transform features to use ISO_A3 as the ID (required by Nivo)
    const transformedFeatures = geoJsonData.features.map(feature => {
      const isoA3 = feature.properties?.ISO_A3 || feature.properties?.ADM0_A3;
      return {
        ...feature,
        id: isoA3, // Set the ID to ISO A3 code for matching with data
        properties: {
          ...feature.properties,
          id: isoA3
        }
      };
    });

    cachedWorldFeatures = transformedFeatures;
    return cachedWorldFeatures;
  } catch (error) {
    console.error('Failed to load world map data:', error);
    // Fallback to alternative CDN
    try {
      const response = await fetch(
        'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
      );
      const worldData = await response.json() as Topology;
      const countries = feature(
        worldData,
        worldData.objects.countries as GeometryCollection
      ) as FeatureCollection;
      
      cachedWorldFeatures = countries.features;
      return cachedWorldFeatures;
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return [];
    }
  }
}
