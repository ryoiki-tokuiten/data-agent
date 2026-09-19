# CorrelationHeatmap Specification

## Overview
CorrelationHeatmap displays a symmetric pairwise correlation matrix (Pearson, Spearman, or Kendall) across numerical variables, rendered with diverging color palettes (-1.0 to +1.0).

## Frontend Rendering Contract
- **Component**: Heatmap component with correlation color scale (-1 to +1) in `ChartDisplay.tsx`
- **`chartType`**: `"CorrelationHeatmap"` (Exact PascalCase)
- **`data`**: Symmetric 2D square matrix of correlation coefficients: `number[][]`.
- **`dataKeys`**:
  - `rowLabels`: Array of strings representing variable names.
  - `columnLabels`: Array of strings (identical order to `rowLabels`).
- **Numeric Rules**:
  - `data.length === rowLabels.length === columnLabels.length`.
  - Diagonal values `data[i][i]` should be `1.0`.
  - All values must be bounded between `-1.0` and `1.0`.

## Complete JSON Schema Example
```json
{
  "chartType": "CorrelationHeatmap",
  "title": "Pairwise Feature Correlation Matrix",
  "description": "Pearson correlation matrix across continuous financial indicators.",
  "data": [
    [1.0, 0.74, -0.42, 0.18],
    [0.74, 1.0, -0.61, 0.25],
    [-0.42, -0.61, 1.0, -0.12],
    [0.18, 0.25, -0.12, 1.0]
  ],
  "dataKeys": {
    "rowLabels": ["Revenue", "Profit", "Debt_Ratio", "Headcount"],
    "columnLabels": ["Revenue", "Profit", "Debt_Ratio", "Headcount"]
  }
}
```

## Python Generation Pattern
```python
import os, pandas as pd
import numpy as np

df = pd.read_csv('slices/master_clean.csv')

num_cols = df.select_dtypes(include=[np.number]).columns[:8].tolist()
corr_df = df[num_cols].corr().fillna(0)

features = [str(c) for c in corr_df.columns]
matrix = [[round(float(val), 3) for val in row] for row in corr_df.values]

corr_spec = {
    "chartType": "CorrelationHeatmap",
    "title": "Inter-Feature Pearson Correlation Coefficients",
    "description": "Pairwise correlation structure computed with pandas .corr().",
    "data": matrix,
    "dataKeys": {
        "rowLabels": features,
        "columnLabels": features
    }
}
```
