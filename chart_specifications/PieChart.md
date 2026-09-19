# PieChart Specification

## Overview
PieChart visualizes part-to-whole proportions and percentage distributions. Best suited for 3 to 7 distinct categories. For higher cardinality or nested data, prefer [TreeMap.md](./TreeMap.md) or [BarChart.md](./BarChart.md).

## Frontend Rendering Contract
- **Component**: Recharts `<PieChart>` in `ChartDisplay.tsx`
- **`chartType`**: `"PieChart"` (Exact PascalCase)
- **`data`**: Array of objects. E.g. `[{ "category": "Direct", "value": 340 }, ...]`
- **`dataKeys`**:
  - `nameKey`: String key representing the slice label/name in each object.
  - `dataKey`: String key representing the numeric slice magnitude in each object.
- **Numeric Rules**: The field specified by `dataKey` must contain positive JSON numbers.

## Complete JSON Schema Example
```json
{
  "chartType": "PieChart",
  "title": "Customer Acquisition Channel Share",
  "description": "Proportional distribution of incoming customer leads by primary acquisition channel.",
  "data": [
    { "channel": "Organic Search", "leads": 4200 },
    { "channel": "Paid Search", "leads": 2800 },
    { "channel": "Referral", "leads": 1950 },
    { "channel": "Direct", "leads": 1400 },
    { "channel": "Social Media", "leads": 980 }
  ],
  "dataKeys": {
    "nameKey": "channel",
    "dataKey": "leads"
  }
}
```

## Python Generation Pattern
```python
import os, pandas as pd

df = pd.read_csv('slices/master_clean.csv')

top_channels = df['channel'].value_counts().head(6).reset_index()
top_channels.columns = ['channel_name', 'count']

data_list = []
for _, row in top_channels.iterrows():
    data_list.append({
        "channel_name": str(row['channel_name']),
        "count": int(row['count'])
    })

pie_spec = {
    "chartType": "PieChart",
    "title": "Lead Share Across Top Channels",
    "description": "Part-to-whole share computed directly from customer slice records.",
    "data": data_list,
    "dataKeys": {
        "nameKey": "channel_name",
        "dataKey": "count"
    }
}
```
