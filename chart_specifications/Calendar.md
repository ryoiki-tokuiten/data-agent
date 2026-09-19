# Calendar Specification

## Overview
Calendar is an annual or multi-month day-by-day heatmap rendered via Nivo (`NivoCalendar.tsx`), displaying daily metric intensity (e.g. commit activity, daily active users, daily sales, fault counts) mapped on a calendar grid.

## Frontend Rendering Contract
- **Component**: Nivo Calendar (`NivoCalendar.tsx`)
- **`chartType`**: `"Calendar"` (Exact PascalCase)
- **`data`**: Array of objects. E.g. `[{ "day": "2024-01-15", "value": 45 }, ...]`
- **`dataKeys`**:
  - `dateKey`: Field name containing date in `YYYY-MM-DD` ISO format (e.g. `"day"` or `"date"`).
  - `valueKey`: Field name containing the daily metric (e.g. `"value"` or `"count"`).
- **Date & Numeric Rules**: Dates MUST be formatted as `"YYYY-MM-DD"`. Metrics must be valid JSON numbers.

## Complete JSON Schema Example
```json
{
  "chartType": "Calendar",
  "title": "Daily System Incident Frequency Heatmap",
  "description": "Annual calendar heatmap tracking daily operational incidents throughout the fiscal year.",
  "data": [
    { "day": "2024-01-01", "incidents": 2 },
    { "day": "2024-01-02", "incidents": 5 },
    { "day": "2024-01-03", "incidents": 1 },
    { "day": "2024-01-04", "incidents": 8 },
    { "day": "2024-01-05", "incidents": 0 }
  ],
  "dataKeys": {
    "dateKey": "day",
    "valueKey": "incidents"
  }
}
```

## Python Generation Pattern
```python
import os, pandas as pd

df = pd.read_csv('slices/master_clean.csv')

df['date'] = pd.to_datetime(df['date'])
daily = df.groupby(df['date'].dt.strftime('%Y-%m-%d'))['metric'].sum().reset_index()

cal_data = []
for _, r in daily.iterrows():
    cal_data.append({
        "day": str(r['date']),
        "value": float(r['metric'])
    })

calendar_spec = {
    "chartType": "Calendar",
    "title": "Daily Incident Intensity Across Fiscal Year",
    "description": "Nivo calendar heatmap computed from daily date records.",
    "data": cal_data,
    "dataKeys": {
        "dateKey": "day",
        "valueKey": "value"
    }
}
```
