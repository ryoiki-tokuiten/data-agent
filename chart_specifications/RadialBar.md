# RadialBar Specification

## Overview
RadialBar displays concentric multi-entity metrics rendered in circular ring coordinates via Nivo (`RadialBar.tsx`). Ideal for target fulfillment ratios, concentric category KPIs, or cyclic metric profiles.

## Frontend Rendering Contract
- **Component**: Nivo RadialBar (`RadialBar.tsx`)
- **`chartType`**: `"RadialBar"` (Exact PascalCase)
- **`data`**: Array of objects with `id` and `data`:
  ```json
  [
    {
      "id": "Sales Target",
      "data": [
        { "x": "Q1", "y": 85 },
        { "x": "Q2", "y": 92 }
      ]
    }
  ]
  ```
- **`dataKeys`**: MUST BE an empty object `{}`.
- **Numeric Rules**: Each `y` value inside `data` arrays MUST be a JSON number (`float` or `int`).

## Complete JSON Schema Example
```json
{
  "chartType": "RadialBar",
  "title": "Quarterly Target Attainment by Business Unit",
  "description": "Concentric radial rings comparing percentage of target achieved across quarters.",
  "data": [
    {
      "id": "Enterprise Sales",
      "data": [
        { "x": "Q1", "y": 92 },
        { "x": "Q2", "y": 104 },
        { "x": "Q3", "y": 112 },
        { "x": "Q4", "y": 118 }
      ]
    },
    {
      "id": "SMB Sales",
      "data": [
        { "x": "Q1", "y": 88 },
        { "x": "Q2", "y": 95 },
        { "x": "Q3", "y": 99 },
        { "x": "Q4", "y": 102 }
      ]
    },
    {
      "id": "Consumer Sales",
      "data": [
        { "x": "Q1", "y": 78 },
        { "x": "Q2", "y": 84 },
        { "x": "Q3", "y": 91 },
        { "x": "Q4", "y": 96 }
      ]
    }
  ],
  "dataKeys": {}
}
```

## Python Generation Pattern
```python
import os, pandas as pd

df = pd.read_csv('slices/master_clean.csv')

series_data = []
for unit, group in df.groupby('unit'):
    q_data = []
    for q, q_group in group.groupby('quarter'):
        q_data.append({
            "x": str(q),
            "y": round(float(q_group['attainment_pct'].mean()), 1)
        })
    series_data.append({
        "id": str(unit),
        "data": q_data
    })

radial_spec = {
    "chartType": "RadialBar",
    "title": "Unit Target Attainment Rings",
    "description": "Concentric ring representation of quarterly targets.",
    "data": series_data,
    "dataKeys": {}
}
```
