# Streamgraph Specification

## Overview
Streamgraph is a stacked area graph displaced around a central baseline (`stackOffset="silhouette"`), creating an organic, fluid stream showing how multiple category flows wax and wane over time.

## Frontend Rendering Contract
- **Component**: Recharts `<AreaChart stackOffset="silhouette">` in `ChartDisplay.tsx`
- **`chartType`**: `"Streamgraph"` (Exact PascalCase)
- **`data`**: Array of objects.
- **`dataKeys`**:
  - `xAxis`: String key for the horizontal axis (e.g. date, month, epoch).
  - `streamKeys`: Array of strings representing each category stream to stack.
- **Numeric Rules**: Every key in `streamKeys` must resolve to a valid non-negative JSON number in every object.

## Complete JSON Schema Example
```json
{
  "chartType": "Streamgraph",
  "title": "Topic Evolution Across Research Publications",
  "description": "Streamgraph showing relative prominence of machine learning sub-fields over 6 months.",
  "data": [
    { "period": "2024-01", "NLP": 120, "Vision": 95, "RL": 45, "Audio": 20 },
    { "period": "2024-02", "NLP": 145, "Vision": 110, "RL": 40, "Audio": 25 },
    { "period": "2024-03", "NLP": 180, "Vision": 130, "RL": 55, "Audio": 30 },
    { "period": "2024-04", "NLP": 220, "Vision": 140, "RL": 50, "Audio": 35 }
  ],
  "dataKeys": {
    "xAxis": "period",
    "streamKeys": ["NLP", "Vision", "RL", "Audio"]
  }
}
```

## Python Generation Pattern
```python
import os, pandas as pd

df = pd.read_csv('slices/master_clean.csv')

# Pivot table for streams
pivot = df.pivot_table(index='timestamp', columns='category', values='volume', aggfunc='sum', fill_value=0).reset_index()
stream_keys = [c for c in pivot.columns if c != 'timestamp']

stream_data = []
for _, row in pivot.iterrows():
    entry = {"timestamp": str(row['timestamp'])}
    for k in stream_keys:
        entry[str(k)] = float(row[k])
    stream_data.append(entry)

streamgraph_spec = {
    "chartType": "Streamgraph",
    "title": "Category Volume Stream Dynamics",
    "description": "Fluid stream dynamics across categories over time.",
    "data": stream_data,
    "dataKeys": {
        "xAxis": "timestamp",
        "streamKeys": [str(k) for k in stream_keys]
    }
}
```
