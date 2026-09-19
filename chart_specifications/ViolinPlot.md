# ViolinPlot Specification

## Overview
ViolinPlot displays kernel density distributions and probability spreads across categories using Plotly (`NivoViolinPlot.tsx`). Shows multimodal distributions and density skewness that box plots conceal.

## Frontend Rendering Contract
- **Component**: Violin plot wrapper (`NivoViolinPlot.tsx`)
- **`chartType`**: `"ViolinPlot"` (Exact PascalCase)
- **`data`**: Array of objects, where each object represents one category with an array of raw numerical observations:
  ```json
  [
    { "categoryName": "Group A", "measurements": [12.1, 14.5, 15.2, 19.8] },
    { "categoryName": "Group B", "measurements": [22.4, 25.1, 26.8, 31.0] }
  ]
  ```
- **`dataKeys`**:
  - `categoryKey`: Field name containing category label string (e.g. `"categoryName"`).
  - `yKey`: Field name containing the array of numbers (e.g. `"measurements"`).
- **Numeric Rules**: The field specified in `yKey` MUST be an array containing ONLY JSON numbers (no strings, no nulls).

## Complete JSON Schema Example
```json
{
  "chartType": "ViolinPlot",
  "title": "Kernel Density Distribution of User Engagement by Subscription Tier",
  "description": "Compares shape and multimodal probability density of session times across Free, Pro, and Enterprise tiers.",
  "data": [
    {
      "tier": "Free",
      "sessionLengths": [4.2, 5.1, 5.8, 6.2, 6.9, 7.5, 8.1, 8.4, 9.2, 11.5, 14.2]
    },
    {
      "tier": "Pro",
      "sessionLengths": [12.1, 14.5, 15.0, 16.2, 18.1, 19.4, 21.0, 22.5, 24.8, 28.1]
    },
    {
      "tier": "Enterprise",
      "sessionLengths": [25.0, 28.4, 31.2, 34.0, 36.5, 41.2, 45.0, 48.2, 52.1, 64.0]
    }
  ],
  "dataKeys": {
    "categoryKey": "tier",
    "yKey": "sessionLengths"
  }
}
```

## Python Generation Pattern
```python
import os, pandas as pd

df = pd.read_csv('slices/master_clean.csv')

violin_records = []
for group_name, group_df in df.groupby('tier'):
    vals = group_df['session_time'].dropna().tolist()
    if len(vals) >= 5:
        violin_records.append({
            "tier": str(group_name),
            "session_time_values": [float(v) for v in vals[:60]]
        })

violin_spec = {
    "chartType": "ViolinPlot",
    "title": "Session Length Probability Densities",
    "description": "Violin curves showcasing probability distributions.",
    "data": violin_records,
    "dataKeys": {
        "categoryKey": "tier",
        "yKey": "session_time_values"
    }
}
```
