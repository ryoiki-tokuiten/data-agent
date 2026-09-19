# Heatmap Specification

## Overview
Heatmap visualizes a 2D matrix of continuous numerical values across discrete rows and columns with interactive color gradients and cell inspection.

## Frontend Rendering Contract
- **Component**: Interactive matrix table / heatmap in `ChartDisplay.tsx`
- **`chartType`**: `"Heatmap"` (Exact PascalCase)
- **`data`**: 2D array of numbers: `number[][]`. E.g. `[[0.2, 0.8], [0.5, 0.9]]`.
- **`dataKeys`**:
  - `rowLabels`: Array of strings for row names.
  - `columnLabels`: Array of strings for column names.
- **Dimensionality & Numeric Rules**:
  - `data.length` MUST exactly equal `rowLabels.length`.
  - Every row `data[i].length` MUST exactly equal `columnLabels.length`.
  - Every element in `data[i][j]` MUST be a valid JSON number (`float` or `int`).

## Complete JSON Schema Example
```json
{
  "chartType": "Heatmap",
  "title": "Hourly Traffic Intensity Across Days of Week",
  "description": "2D intensity matrix showing user activity concentration by day and hour.",
  "data": [
    [12.4, 8.1, 5.2, 34.1],
    [14.2, 9.5, 6.0, 38.2],
    [18.9, 11.2, 7.8, 45.0],
    [22.1, 14.5, 9.1, 52.3]
  ],
  "dataKeys": {
    "rowLabels": ["Monday", "Tuesday", "Wednesday", "Thursday"],
    "columnLabels": ["00:00-06:00", "06:00-12:00", "12:00-18:00", "18:00-24:00"]
  }
}
```

## Python Generation Pattern
```python
import os, pandas as pd

df = pd.read_csv('slices/master_clean.csv')

pivot = df.pivot_table(index='day_of_week', columns='hour_bucket', values='activity', aggfunc='mean', fill_value=0)

row_labels = [str(idx) for idx in pivot.index]
col_labels = [str(col) for col in pivot.columns]
matrix = [[float(val) for val in row] for row in pivot.values]

heatmap_spec = {
    "chartType": "Heatmap",
    "title": "Mean Activity Grid Across Time Slots",
    "description": "Calculated 2D intensity grid.",
    "data": matrix,
    "dataKeys": {
        "rowLabels": row_labels,
        "columnLabels": col_labels
    }
}
```
