# TimeRange Specification

## Overview
TimeRange is an activity heatmap designed for shorter time spans (1 to 6 months) rendered via Nivo (`NivoTimeRange.tsx`). Highlights weekly cycles and day-of-week patterns better than the full year Calendar view.

## Frontend Rendering Contract
- **Component**: Nivo TimeRange (`NivoTimeRange.tsx`)
- **`chartType`**: `"TimeRange"` (Exact PascalCase)
- **`data`**: Array of objects. E.g. `[{ "day": "2024-04-01", "value": 32 }, ...]`
- **`dataKeys`**:
  - `dateKey`: Field name containing date in `YYYY-MM-DD` ISO format.
  - `valueKey`: Field name containing the metric value.
- **Rules**: Dates in `"YYYY-MM-DD"`. Metric values must be numbers. Best for 30 to 180 days.

## Complete JSON Schema Example
```json
{
  "chartType": "TimeRange",
  "title": "Q2 Daily Customer Onboarding Volume",
  "description": "Weekly cyclical pattern showing weekday vs weekend onboarding distribution.",
  "data": [
    { "day": "2024-04-01", "onboarded": 42 },
    { "day": "2024-04-02", "onboarded": 55 },
    { "day": "2024-04-03", "onboarded": 61 },
    { "day": "2024-04-04", "onboarded": 58 },
    { "day": "2024-04-05", "onboarded": 49 },
    { "day": "2024-04-06", "onboarded": 18 },
    { "day": "2024-04-07", "onboarded": 12 }
  ],
  "dataKeys": {
    "dateKey": "day",
    "valueKey": "onboarded"
  }
}
```

## Python Generation Pattern
```python
import os, pandas as pd

df = pd.read_csv('slices/master_clean.csv')

df['date'] = pd.to_datetime(df['date'])
# Select focused 2-3 month window
window = df.sort_values('date').tail(90)
daily = window.groupby(window['date'].dt.strftime('%Y-%m-%d'))['amount'].count().reset_index()

tr_data = []
for _, r in daily.iterrows():
    tr_data.append({
        "day": str(r['date']),
        "volume": int(r['amount'])
    })

timerange_spec = {
    "chartType": "TimeRange",
    "title": "Recent 90-Day Activity Flow",
    "description": "Focused time-range heatmap uncovering weekday variances.",
    "data": tr_data,
    "dataKeys": {
        "dateKey": "day",
        "valueKey": "volume"
    }
}
```
