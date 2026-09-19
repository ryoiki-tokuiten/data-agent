import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import path from 'path';

export default defineConfig(() => {
    return {
      plugins: [wasm(), topLevelAwait()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      optimizeDeps: {
        include: ['@nivo/sankey', '@nivo/treemap', '@nivo/polar-bar', '@nivo/radial-bar', '@nivo/waffle']
      },
      worker: {
        format: 'es' as const,
        plugins: () => []
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-charts': ['recharts', 'react-plotly.js'],
              'vendor-nivo': ['@nivo/sankey', '@nivo/boxplot', '@nivo/treemap', '@nivo/polar-bar', '@nivo/radial-bar', '@nivo/waffle'],
              'vendor-react': ['react', 'react-dom', 'zustand']
            }
          }
        },
        chunkSizeWarningLimit: 1000
      }
    };
});
