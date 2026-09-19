# MultiLineRateOfChangePlot Specification

## Overview
MultiLineRateOfChangePlot tracks first differences, derivatives, percentage growth rates, or velocity across multiple competing entities or series over time.

## Frontend Rendering Contract
- **Component**: Recharts `<LineChart>` in `ChartDisplay.tsx`
- **`chartType`**: `"MultiLineRateOfChangePlot"` (Exact PascalCase)
- **`data`**: Array of objects containing calculated rates of change.
- **`dataKeys`**:
  - `xAxis`: String key for the chronological axis.
  - `yAxis`: Array of strings for each entity's rate of change (e.g. `["ProductA_pct_change", "ProductB_pct_change"]`).
- **Numeric Rules**: All fields in `yAxis` must be valid JSON numbers (`float`).

## Complete JSON Schema Example
```json
{
  "chartType": "MultiLineRateOfChangePlot",
  "title": "Weekly Percentage Rate of Change Across Revenue Streams",
  "description": "Compares first-order velocity of growth rates for subscription vs enterprise streams.",
  "data": [
    { "week": "W02", "subscriptionGrowthPct": 3.4, "enterpriseGrowthPct": 8.1 },
    { "week": "W03", "subscriptionGrowthPct": 4.1, "enterpriseGrowthPct": -2.3 },
    { "week": "W04", "subscriptionGrowthPct": 2.8, "enterpriseGrowthPct": 5.7 },
    { "week": "W05", "subscriptionGrowthPct": 5.2, "enterpriseGrowthPct": 11.4 }
  ],
  "dataKeys": {
    "xAxis": "week",
    "yAxis": ["subscriptionGrowthPct", "enterpriseGrowthPct"]
  }
}
```

## Python Generation Pattern
```python
import os, pandas as pd

df = pd.read_csv('slices/master_clean.csv')
pivoted = df.pivot_table(index='date', columns='product', values='revenue', aggfunc='sum')
pct_changes = pivoted.pct_change().dropna() * 100

data_list = []
for date, row in pct_changes.iterrows():
    item = {"date": str(date)}
    for col in pct_changes.columns:
        item[f"{col}_growth"] = round(float(row[col]), 2)
    data_list.append(item)

rate_spec = {
    "chartType": "MultiLineRateOfChangePlot",
    "title": "Period-over-Period Rate of Change (%)",
    "description": "Calculates derivative growth velocity across product lines.",
    "data": data_list,
    "dataKeys": {
        "xAxis": "date",
        "yAxis": [f"{col}_growth" for col in pct_changes.columns]
    }
}
```
