# ComposedChart Specification

## Overview
ComposedChart combines multiple visual representations on a single shared coordinate canvas (e.g. Bar series overlaid with Line series or Area fills), enabling side-by-side comparison of volumes and rates.

## Frontend Rendering Contract
- **Component**: Recharts `<ComposedChart>` in `ChartDisplay.tsx`
- **`chartType`**: `"ComposedChart"` (Exact PascalCase)
- **`data`**: Array of objects.
- **`dataKeys`**:
  - `xAxis`: String key for the horizontal axis.
  - Series keys starting with `bar`, `line`, or `area` (e.g. `"barRevenue"`, `"lineMargin"`).
- **Numeric Rules**: Values for all series keys must be valid JSON numbers.

## Complete JSON Schema Example
```json
{
  "chartType": "ComposedChart",
  "title": "Monthly Total Revenue (Bars) vs Profit Margin Percentage (Line)",
  "description": "Composed view linking gross monthly volume against percentage profitability.",
  "data": [
    { "month": "Jan", "barRevenue": 84000, "lineMargin": 21.4 },
    { "month": "Feb", "barRevenue": 91000, "lineMargin": 22.1 },
    { "month": "Mar", "barRevenue": 105000, "lineMargin": 24.8 },
    { "month": "Apr", "barRevenue": 98000, "lineMargin": 23.5 },
    { "month": "May", "barRevenue": 112000, "lineMargin": 25.2 }
  ],
  "dataKeys": {
    "xAxis": "month",
    "barRevenue": "barRevenue",
    "lineMargin": "lineMargin"
  }
}
```

## Python Generation Pattern
```python
import os, pandas as pd

df = pd.read_csv('slices/master_clean.csv')

monthly = df.groupby('month').agg(
    total_rev=('revenue', 'sum'),
    mean_margin=('margin_pct', 'mean')
).reset_index()

comp_data = []
for _, r in monthly.iterrows():
    comp_data.append({
        "month": str(r['month']),
        "barRevenue": float(r['total_rev']),
        "lineMargin": round(float(r['mean_margin']), 2)
    })

composed_spec = {
    "chartType": "ComposedChart",
    "title": "Revenue Volume and Operating Margin",
    "description": "Hybrid visualization overlaying bar volumes with line margins.",
    "data": comp_data,
    "dataKeys": {
        "xAxis": "month",
        "barRevenue": "barRevenue",
        "lineMargin": "lineMargin"
    }
}
```
