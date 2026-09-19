# DataTable Specification

## Overview
DataTable is an interactive tabular view rendered via `EditableDataTable.tsx`, supporting sorting, pagination, and data inspection for high-cardinality multi-attribute slices.

## Frontend Rendering Contract
- **Component**: `EditableDataTable.tsx`
- **`chartType`**: `"DataTable"` (Exact PascalCase)
- **`data`**: Array of objects representing rows.
- **`dataKeys`**:
  - `columns`: Array of `{ "header": string, "accessor": string }` describing table headers and field names.
- **Numeric Rules**: Numeric columns should be JSON numbers; strings and ISO dates are also supported.

## Complete JSON Schema Example
```json
{
  "chartType": "DataTable",
  "title": "Top Customer Cohorts Summary",
  "description": "High-value cohort segment summary with engagement and monetary statistics.",
  "data": [
    { "cohort": "2024-Q1-Acquired", "users": 1540, "retentionRate": 68.5, "clv": 1240.50 },
    { "cohort": "2024-Q2-Acquired", "users": 2100, "retentionRate": 72.1, "clv": 1390.00 },
    { "cohort": "2024-Q3-Acquired", "users": 1890, "retentionRate": 65.4, "clv": 1180.20 }
  ],
  "dataKeys": {
    "columns": [
      { "header": "Cohort Group", "accessor": "cohort" },
      { "header": "Total Users", "accessor": "users" },
      { "header": "Retention Rate (%)", "accessor": "retentionRate" },
      { "header": "Mean CLV ($)", "accessor": "clv" }
    ]
  }
}
```

## Python Generation Pattern
```python
import os, pandas as pd

df = pd.read_csv('slices/master_clean.csv')
summary = df.groupby('segment').agg(
    count=('id', 'count'),
    mean_val=('score', 'mean'),
    median_val=('score', 'median')
).reset_index().head(20)

rows = []
for _, r in summary.iterrows():
    rows.append({
        "segment": str(r['segment']),
        "count": int(r['count']),
        "mean_score": round(float(r['mean_val']), 2),
        "median_score": round(float(r['median_val']), 2)
    })

data_table_spec = {
    "chartType": "DataTable",
    "title": "Segment Performance Summary Table",
    "description": "Tabular aggregation of key summary statistics per segment.",
    "data": rows,
    "dataKeys": {
        "columns": [
            { "header": "Segment", "accessor": "segment" },
            { "header": "Count", "accessor": "count" },
            { "header": "Mean Score", "accessor": "mean_score" },
            { "header": "Median Score", "accessor": "median_score" }
        ]
    }
}
```
