# ScatterPlot Specification

## Overview
ScatterPlot displays pairwise relationships, bivariate correlations, and cluster groupings across two or more continuous variables. Supports cluster coloring, variable sizing, and regression trendlines.

## Frontend Rendering Contract
- **Component**: Nivo ScatterPlot / Recharts in `NivoScatterPlot.tsx` and `ChartDisplay.tsx`
- **`chartType`**: `"ScatterPlot"` (Exact PascalCase)
- **`data`**: Array of objects where each object is one data point.
- **`dataKeys`**:
  - `xAxis`: Field name for horizontal axis (number).
  - `yAxis`: Field name for vertical axis (number).
  - `zAxis`: (Optional) Field name for dot/bubble size (positive number).
  - `clusterKey`: (Optional) Field name for categorical grouping/color coding (string or category).
- **Optional `trendline`**: See [RegressionAnalysis.md](./RegressionAnalysis.md).
- **Numeric Rules**: Values for `xAxis` and `yAxis` MUST be valid JSON numbers (`float` or `int`).

## Complete JSON Schema Example
```json
{
  "chartType": "ScatterPlot",
  "title": "Latency vs Accuracy Trade-off by Model Architecture",
  "description": "Bivariate scatter evaluating model throughput and performance across transformer and convolutional architectures.",
  "data": [
    { "latencyMs": 18.2, "top1Accuracy": 78.4, "paramsM": 25, "archFamily": "CNN" },
    { "latencyMs": 24.1, "top1Accuracy": 81.2, "paramsM": 50, "archFamily": "CNN" },
    { "latencyMs": 42.5, "top1Accuracy": 88.9, "paramsM": 120, "archFamily": "Transformer" },
    { "latencyMs": 56.0, "top1Accuracy": 91.4, "paramsM": 350, "archFamily": "Transformer" }
  ],
  "dataKeys": {
    "xAxis": "latencyMs",
    "yAxis": "top1Accuracy",
    "zAxis": "paramsM",
    "clusterKey": "archFamily"
  },
  "trendline": {
    "type": "logarithmic",
    "name": "Logarithmic Efficiency Curve",
    "data": [
      { "latencyMs": 15.0, "top1Accuracy": 76.5 },
      { "latencyMs": 30.0, "top1Accuracy": 84.2 },
      { "latencyMs": 60.0, "top1Accuracy": 92.0 }
    ],
    "dataKeys": { "xAxis": "latencyMs", "yAxis": "top1Accuracy" },
    "equation": "y = 62.1 + 7.3 * ln(x)",
    "rSquared": 0.942
  }
}
```

## Python Generation Pattern
```python
import os, pandas as pd

df = pd.read_csv('slices/master_clean.csv')

# Subsample or filter for performance (up to 300-500 points)
sample_df = df.dropna(subset=['latency', 'accuracy']).head(300)

points = []
for _, r in sample_df.iterrows():
    points.append({
        "latency": float(r['latency']),
        "accuracy": float(r['accuracy']),
        "cluster": str(r.get('cluster_label', 'Standard'))
    })

scatter_spec = {
    "chartType": "ScatterPlot",
    "title": "Latency vs Accuracy Distribution",
    "description": "Pairwise distribution computed directly from clean slice.",
    "data": points,
    "dataKeys": {
        "xAxis": "latency",
        "yAxis": "accuracy",
        "clusterKey": "cluster"
    }
}
```
