# StackedBarChart Specification

## Overview
StackedBarChart compares multiple sub-metrics or segment breakdowns across categories, showing both the total magnitude and composition within each bar.

## Frontend Rendering Contract
- **Component**: Recharts `<BarChart>` with stacked `<Bar>` elements
- **`chartType`**: `"StackedBarChart"` (Exact PascalCase)
- **`data`**: Array of objects.
- **`dataKeys`**:
  - `xAxis`: String matching the primary category key.
  - `yAxis`: Array of strings, where each string is a series/segment key that will be stacked.
- **Numeric Rules**: Every key in the `yAxis` array must resolve to a valid JSON number in every object in `data`.

## Complete JSON Schema Example
```json
{
  "chartType": "StackedBarChart",
  "title": "Quarterly Revenue Composition by Product Tier",
  "description": "Demonstrates product tier revenue contributions across four fiscal quarters.",
  "data": [
    { "quarter": "Q1", "Tier_Enterprise": 42000, "Tier_Pro": 28000, "Tier_Basic": 14000 },
    { "quarter": "Q2", "Tier_Enterprise": 49000, "Tier_Pro": 31000, "Tier_Basic": 13500 },
    { "quarter": "Q3", "Tier_Enterprise": 58000, "Tier_Pro": 36000, "Tier_Basic": 12000 },
    { "quarter": "Q4", "Tier_Enterprise": 71000, "Tier_Pro": 42000, "Tier_Basic": 11000 }
  ],
  "dataKeys": {
    "xAxis": "quarter",
    "yAxis": ["Tier_Enterprise", "Tier_Pro", "Tier_Basic"]
  }
}
```

## Python Generation Pattern
```python
import json, os, glob
import pandas as pd

df = pd.read_csv('slices/master_clean.csv')

# Pivot table to construct stacked series
pivot = df.pivot_table(index='quarter', columns='product_tier', values='revenue', aggfunc='sum', fill_value=0).reset_index()
tier_columns = [col for col in pivot.columns if col != 'quarter']

chart_data = []
for _, row in pivot.iterrows():
    entry = {"quarter": str(row['quarter'])}
    for col in tier_columns:
        entry[str(col)] = float(row[col])
    chart_data.append(entry)

stacked_bar_spec = {
    "chartType": "StackedBarChart",
    "title": "Revenue Breakdown by Product Tier",
    "description": "Stacked representation of tier contributions over quarters.",
    "data": chart_data,
    "dataKeys": {
        "xAxis": "quarter",
        "yAxis": [str(c) for c in tier_columns]
    }
}
```
