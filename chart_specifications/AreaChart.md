# AreaChart Specification

## Overview
AreaChart represents cumulative totals, volume changes, or quantities filling the space below a trendline. Supports gradient fills and multi-series stacking.

## Frontend Rendering Contract
- **Component**: Recharts `<AreaChart>`
- **`chartType`**: `"AreaChart"` (Exact PascalCase)
- **`data`**: Array of objects.
- **`dataKeys`**:
  - `xAxis`: String key for the horizontal axis.
  - `yAxis`: String or array of strings for the continuous metric fields.
- **Numeric Rules**: All fields specified in `yAxis` must be valid JSON numbers.

## Complete JSON Schema Example
```json
{
  "chartType": "AreaChart",
  "title": "Cumulative Inflow and Outflow Over Time",
  "description": "Area visualization displaying cumulative capital inflows and outflows.",
  "data": [
    { "date": "2024-03-01", "inflow": 45000, "outflow": 28000 },
    { "date": "2024-03-02", "inflow": 52000, "outflow": 31000 },
    { "date": "2024-03-03", "inflow": 61000, "outflow": 34000 }
  ],
  "dataKeys": {
    "xAxis": "date",
    "yAxis": ["inflow", "outflow"]
  }
}
```

## Python Generation Pattern
```python
import os, pandas as pd

df = pd.read_csv('slices/master_clean.csv')
agg = df.groupby('date')[['inflow', 'outflow']].sum().reset_index()

area_data = []
for _, r in agg.iterrows():
    area_data.append({
        "date": str(r['date']),
        "inflow": float(r['inflow']),
        "outflow": float(r['outflow'])
    })

area_spec = {
    "chartType": "AreaChart",
    "title": "Daily Capital Volume Inflow & Outflow",
    "description": "Visualizes volumetric changes across temporal records.",
    "data": area_data,
    "dataKeys": {
        "xAxis": "date",
        "yAxis": ["inflow", "outflow"]
    }
}
```
