# BubbleChart Specification

## Overview
BubbleChart displays multi-dimensional relationships using X position, Y position, and Z bubble magnitude (diameter/area), rendered using Plotly (`PlotlyBubbleChart.tsx`).

## Frontend Rendering Contract
- **Component**: Plotly Bubble Chart (`PlotlyBubbleChart.tsx`)
- **`chartType`**: `"BubbleChart"` (Exact PascalCase)
- **`data`**: Array of objects.
- **`dataKeys`**:
  - `xAxis`: Field name for horizontal axis (number).
  - `yAxis`: Field name for vertical axis (number).
  - `zAxis`: Field name for bubble volume/size (strictly positive number).
  - `categoryKey`: (Optional) Field name for categorical grouping/coloring (Note: Use `categoryKey` in BubbleChart).
  - `labelKey`: (Optional) Text label for tooltips.
- **Numeric Rules**: `xAxis`, `yAxis`, and `zAxis` MUST be valid JSON numbers. `zAxis` MUST be strictly positive (> 0).

## Complete JSON Schema Example
```json
{
  "chartType": "BubbleChart",
  "title": "Regional Market Performance (Bubble Size = Annual Volume)",
  "description": "Examines cost vs return on investment with market transaction volume as bubble size.",
  "data": [
    { "marketingCost": 45000, "roi": 210.5, "volume": 12500, "region": "North America" },
    { "marketingCost": 62000, "roi": 185.2, "volume": 18400, "region": "Europe" },
    { "marketingCost": 38000, "roi": 265.0, "volume": 9800, "region": "Asia Pacific" },
    { "marketingCost": 22000, "roi": 140.0, "volume": 4500, "region": "Latin America" }
  ],
  "dataKeys": {
    "xAxis": "marketingCost",
    "yAxis": "roi",
    "zAxis": "volume",
    "categoryKey": "region"
  }
}
```

## Python Generation Pattern
```python
import os, pandas as pd

df = pd.read_csv('slices/master_clean.csv')

clean_df = df.dropna(subset=['cost', 'roi', 'volume'])
clean_df = clean_df[clean_df['volume'] > 0].head(250)

data_points = []
for _, r in clean_df.iterrows():
    data_points.append({
        "cost": float(r['cost']),
        "roi": float(r['roi']),
        "volume": float(r['volume']),
        "region": str(r.get('region', 'All'))
    })

bubble_spec = {
    "chartType": "BubbleChart",
    "title": "Cost vs ROI Scaled by Transaction Volume",
    "description": "Three-variable relationship rendered with Plotly bubble engine.",
    "data": data_points,
    "dataKeys": {
        "xAxis": "cost",
        "yAxis": "roi",
        "zAxis": "volume",
        "categoryKey": "region"
    }
}
```
