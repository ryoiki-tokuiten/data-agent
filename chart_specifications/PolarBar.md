# PolarBar Specification

## Overview
PolarBar displays cyclical metrics or multi-attribute profiles rendered in a circular/polar bar coordinate system via Nivo. Ideal for periodic phenomena (months of the year, hours of day, day of week) or radial performance profiles.

## Frontend Rendering Contract
- **Component**: Nivo PolarBar component (`PolarBar.tsx`)
- **`chartType`**: `"PolarBar"` (Exact PascalCase)
- **`data`**: Array of objects. E.g. `[{ "period": "Jan", "Sales": 1200, "Profit": 340 }, ...]`
- **`dataKeys`**:
  - `indexBy`: String key identifying the radial category (e.g. `"period"`, `"month"`).
  - `keys`: Array of strings specifying the metric fields to measure along the radius.
- **Numeric Rules**: All fields specified in `keys` must be JSON numbers.

## Complete JSON Schema Example
```json
{
  "chartType": "PolarBar",
  "title": "Cyclical Monthly Operating Metrics",
  "description": "Radial bar comparison showing cyclical variation in sales, marketing, and logistics expenses.",
  "data": [
    { "month": "Jan", "Sales": 4500, "Logistics": 1200, "Marketing": 800 },
    { "month": "Feb", "Sales": 4800, "Logistics": 1150, "Marketing": 950 },
    { "month": "Mar", "Sales": 5600, "Logistics": 1400, "Marketing": 1100 },
    { "month": "Apr", "Sales": 5200, "Logistics": 1300, "Marketing": 900 },
    { "month": "May", "Sales": 6100, "Logistics": 1550, "Marketing": 1250 },
    { "month": "Jun", "Sales": 6800, "Logistics": 1700, "Marketing": 1400 }
  ],
  "dataKeys": {
    "indexBy": "month",
    "keys": ["Sales", "Logistics", "Marketing"]
  }
}
```

## Python Generation Pattern
```python
import os, glob, pandas as pd

df = pd.read_csv('slices/master_clean.csv')

monthly = df.groupby('month')[['sales', 'logistics', 'marketing']].sum().reset_index()

data_list = []
for _, row in monthly.iterrows():
    data_list.append({
        "month": str(row['month']),
        "Sales": float(row['sales']),
        "Logistics": float(row['logistics']),
        "Marketing": float(row['marketing'])
    })

polar_spec = {
    "chartType": "PolarBar",
    "title": "Monthly Expense & Sales Distribution",
    "description": "Cyclical polar breakdown across months.",
    "data": data_list,
    "dataKeys": {
        "indexBy": "month",
        "keys": ["Sales", "Logistics", "Marketing"]
    }
}
```
