# BarChart Specification

## Overview
BarChart is used for discrete categorical comparisons, aggregate quantities, group ranking, or metric distribution across categories.

## Frontend Rendering Contract
- **Component**: Recharts `<BarChart>`
- **`chartType`**: `"BarChart"` (Exact PascalCase)
- **`data`**: Array of objects. Each object represents one category item.
- **`dataKeys`**:
  - `xAxis`: String matching the category/label key in each object.
  - `yAxis`: String or array of strings matching the metric keys to plot as vertical bars.
  - `errorKey`: (Optional) String key representing error bar values.
- **Numeric Rules**: Every field specified in `yAxis` must contain JSON numbers (`float` or `int`), never strings or NaN.

## Complete JSON Schema Example
```json
{
  "chartType": "BarChart",
  "title": "Average Transaction Value by Merchant Category",
  "description": "Compares mean spending across top merchant segments derived from transaction slices.",
  "data": [
    { "category": "Electronics", "avgSpend": 184.50, "orderCount": 1240 },
    { "category": "Groceries", "avgSpend": 64.20, "orderCount": 5420 },
    { "category": "Apparel", "avgSpend": 92.10, "orderCount": 2180 },
    { "category": "Home Goods", "avgSpend": 115.80, "orderCount": 980 }
  ],
  "dataKeys": {
    "xAxis": "category",
    "yAxis": "avgSpend"
  }
}
```

## Python Generation Pattern
```python
import json, os, glob
import pandas as pd
import numpy as np

# Load real data from slices or uploads
df = pd.read_csv('slices/master_clean.csv') if os.path.exists('slices/master_clean.csv') else pd.read_csv(glob.glob('user_uploaded/*')[0])

# Compute aggregations programmatically
agg_df = df.groupby('merchant_category')['amount'].agg(mean_spend='mean', count='count').reset_index()
agg_df = agg_df.sort_values(by='mean_spend', ascending=False).head(15)

chart_data = []
for _, row in agg_df.iterrows():
    chart_data.append({
        "category": str(row['merchant_category']),
        "avgSpend": round(float(row['mean_spend']), 2),
        "count": int(row['count'])
    })

bar_spec = {
    "chartType": "BarChart",
    "title": "Top Merchant Categories by Mean Transaction Amount",
    "description": "Computed from master slice with pandas aggregation.",
    "data": chart_data,
    "dataKeys": {
        "xAxis": "category",
        "yAxis": "avgSpend"
    }
}
```
