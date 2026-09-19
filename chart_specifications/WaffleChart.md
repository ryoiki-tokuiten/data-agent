# WaffleChart Specification

## Overview
WaffleChart visualizes proportions, shares, or progress toward a goal using a structured grid of discrete unit cells (e.g. 10x14 = 140 cells or 10x10 = 100 cells) rendered via Nivo. Ideal for survey breakdowns, demographic shares, and quota completion.

## Frontend Rendering Contract
- **Component**: Nivo Waffle (`WaffleChart.tsx`)
- **`chartType`**: `"WaffleChart"` (Exact PascalCase)
- **`data`**: Array of objects representing each categorical share.
- **`dataKeys`**:
  - `idKey`: Field name containing unique identifier for category (e.g. `"id"`).
  - `labelKey`: Field name containing human-readable label (e.g. `"label"`).
  - `valueKey`: Field name containing positive numeric value (e.g. `"value"`).
- **Numeric Rules**: Values for `valueKey` must be positive JSON numbers.

## Complete JSON Schema Example
```json
{
  "chartType": "WaffleChart",
  "title": "Cloud Infrastructure Cost Breakdown by Service Type",
  "description": "Proportional unit grid visualizing compute, storage, and networking expenditures.",
  "data": [
    { "id": "compute", "label": "Compute (VMs / Containers)", "value": 52 },
    { "id": "storage", "label": "Storage (S3 / Persistent Disks)", "value": 28 },
    { "id": "network", "label": "Networking & Egress", "value": 14 },
    { "id": "management", "label": "Monitoring & Management", "value": 6 }
  ],
  "dataKeys": {
    "idKey": "id",
    "labelKey": "label",
    "valueKey": "value"
  }
}
```

## Python Generation Pattern
```python
import os, pandas as pd

df = pd.read_csv('slices/master_clean.csv')

totals = df.groupby('service_type')['cost'].sum().reset_index()
total_sum = totals['cost'].sum()
totals['pct'] = (totals['cost'] / total_sum * 100).round(1)

waffle_data = []
for _, r in totals.iterrows():
    waffle_data.append({
        "id": str(r['service_type']).lower().replace(' ', '_'),
        "label": str(r['service_type']),
        "value": float(r['pct'])
    })

waffle_spec = {
    "chartType": "WaffleChart",
    "title": "Percentage Cost Share by Service Type",
    "description": "Grid-based proportional unit allocation.",
    "data": waffle_data,
    "dataKeys": {
        "idKey": "id",
        "labelKey": "label",
        "valueKey": "value"
    }
}
```
