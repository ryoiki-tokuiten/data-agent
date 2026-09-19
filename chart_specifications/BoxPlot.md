# BoxPlot Specification

## Overview
BoxPlot shows distributions, medians, interquartile ranges (IQR), and outliers across categorical groups using Nivo BoxPlot (`NivoBoxPlot.tsx`).

## Frontend Rendering Contract
- **Component**: Nivo BoxPlot (`NivoBoxPlot.tsx`)
- **`chartType`**: `"BoxPlot"` (Exact PascalCase)
- **`data`**: Array of individual raw measurement objects (minimum 20+ points per group). DO NOT provide five-number summary statistics—Nivo computes quartiles and whiskers dynamically from raw individual points.
- **`dataKeys`**:
  - `groupKey`: String key identifying the category or group (e.g. `"group"`).
  - `valueKey`: String key identifying the continuous measurement value (e.g. `"value"`).
  - `subgroupKey`: (Optional) Subgroup split identifier.
  - `muKey`: (Optional) Pre-computed mean.
  - `sdKey`: (Optional) Pre-computed standard deviation.
  - `nKey`: (Optional) Sample size.
- **Numeric Rules**: Each row's `valueKey` must be a valid JSON number (`float` or `int`). Generate at least 20+ observations per group.

## Complete JSON Schema Example
```json
{
  "chartType": "BoxPlot",
  "title": "Response Latency Distribution Across Compute Regions",
  "description": "Box plot showing median, IQR, and dispersion of request latency measurements.",
  "data": [
    { "region": "US-East", "latencyMs": 42.1 },
    { "region": "US-East", "latencyMs": 44.5 },
    { "region": "US-East", "latencyMs": 48.2 },
    { "region": "US-East", "latencyMs": 52.0 },
    { "region": "US-West", "latencyMs": 61.2 },
    { "region": "US-West", "latencyMs": 65.8 },
    { "region": "US-West", "latencyMs": 68.4 }
  ],
  "dataKeys": {
    "groupKey": "region",
    "valueKey": "latencyMs"
  }
}
```

## Python Generation Pattern
```python
import os, pandas as pd

df = pd.read_csv('slices/master_clean.csv')

# Extract raw observations across top groups
top_groups = df['category'].value_counts().head(4).index
subset = df[df['category'].isin(top_groups)].dropna(subset=['measurement'])

# Sample up to 50 observations per group
sampled = subset.groupby('category').apply(lambda x: x.sample(n=min(len(x), 40), random_state=42)).reset_index(drop=True)

box_points = []
for _, r in sampled.iterrows():
    box_points.append({
        "group": str(r['category']),
        "value": float(r['measurement'])
    })

box_spec = {
    "chartType": "BoxPlot",
    "title": "Measurement Distribution by Category",
    "description": "Nivo BoxPlot rendered from raw individual observations.",
    "data": box_points,
    "dataKeys": {
        "groupKey": "group",
        "valueKey": "value"
    }
}
```
