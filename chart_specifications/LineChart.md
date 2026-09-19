# LineChart Specification

## Overview
LineChart is used for continuous trends, time series sequences, or sequential progress over time or ordered steps. Supports multiple series, trendlines, and confidence bands.

## Frontend Rendering Contract
- **Component**: Recharts `<LineChart>`
- **`chartType`**: `"LineChart"` (Exact PascalCase)
- **`data`**: Array of objects.
- **`dataKeys`**:
  - `xAxis`: String key for the horizontal axis (e.g. date, timestamp, or step index).
  - `yAxis`: String or array of strings for one or multiple continuous series.
  - `errorKey`: (Optional) String key for error ranges.
- **Optional `trendline`**: See [RegressionAnalysis.md](./RegressionAnalysis.md).
- **Numeric Rules**: Every field specified in `yAxis` must be a valid JSON number (`float` or `int`).

## Complete JSON Schema Example
```json
{
  "chartType": "LineChart",
  "title": "Daily Active Users and Session Duration Trend",
  "description": "Chronological evolution of active users across a 30-day monitoring window.",
  "data": [
    { "date": "2024-01-01", "activeUsers": 12400, "avgDurationMin": 14.2 },
    { "date": "2024-01-02", "activeUsers": 12900, "avgDurationMin": 14.8 },
    { "date": "2024-01-03", "activeUsers": 13400, "avgDurationMin": 15.1 },
    { "date": "2024-01-04", "activeUsers": 14100, "avgDurationMin": 15.5 }
  ],
  "dataKeys": {
    "xAxis": "date",
    "yAxis": ["activeUsers", "avgDurationMin"]
  }
}
```

## Python Generation Pattern
```python
import os, pandas as pd

df = pd.read_csv('slices/master_clean.csv')

# Ensure date sorting
df['date'] = pd.to_datetime(df['date'])
daily = df.groupby(df['date'].dt.strftime('%Y-%m-%d'))['metric'].mean().reset_index()

chart_data = []
for _, row in daily.iterrows():
    chart_data.append({
        "date": str(row['date']),
        "metricValue": round(float(row['metric']), 3)
    })

line_spec = {
    "chartType": "LineChart",
    "title": "Mean Metric Value Over Time",
    "description": "Continuous temporal progression extracted from clean time series slices.",
    "data": chart_data,
    "dataKeys": {
        "xAxis": "date",
        "yAxis": "metricValue"
    }
}
```
