# ComplexPlanePlot Specification

## Overview
ComplexPlanePlot displays complex-valued points (Real vs Imaginary axis), such as eigenvalues of dynamical systems, transfer function poles and zeros, or Fourier components, rendered using the ScatterPlot engine with zero axes crossing.

## Frontend Rendering Contract
- **Component**: ScatterPlot-based complex plane in `ChartDisplay.tsx`
- **`chartType`**: `"ComplexPlanePlot"` (Exact PascalCase)
- **`data`**: Array of objects.
- **`dataKeys`**:
  - `xAxis`: Field name for the Real component (number).
  - `yAxis`: Field name for the Imaginary component (number).
  - `clusterKey`: (Optional) Grouping or stability region indicator.
- **Numeric Rules**: `xAxis` and `yAxis` values MUST be valid JSON numbers (`float` or `int`).

## Complete JSON Schema Example
```json
{
  "chartType": "ComplexPlanePlot",
  "title": "State Transition Matrix Eigenvalue Distribution",
  "description": "Plots real vs imaginary eigenvalue components on the complex s-plane to assess dynamic stability.",
  "data": [
    { "real": -0.85, "imag": 1.42, "stability": "Stable" },
    { "real": -0.85, "imag": -1.42, "stability": "Stable" },
    { "real": -0.32, "imag": 0.88, "stability": "Stable" },
    { "real": -0.32, "imag": -0.88, "stability": "Stable" },
    { "real": 0.12, "imag": 2.10, "stability": "Unstable" }
  ],
  "dataKeys": {
    "xAxis": "real",
    "yAxis": "imag",
    "clusterKey": "stability"
  }
}
```

## Python Generation Pattern
```python
import numpy as np

# Example: calculate eigenvalues from feature covariance matrix
cov_matrix = np.cov(feature_matrix, rowvar=False)
eigenvalues = np.linalg.eigvals(cov_matrix)

complex_points = []
for ev in eigenvalues:
    real_part = float(np.real(ev))
    imag_part = float(np.imag(ev))
    complex_points.append({
        "real": round(real_part, 4),
        "imag": round(imag_part, 4),
        "stability": "Stable" if real_part < 0 else "Unstable"
    })

spec = {
    "chartType": "ComplexPlanePlot",
    "title": "Covariance Spectrum Eigenvalues in Complex Plane",
    "description": "Spectral decomposition plotted across Real and Imaginary axes.",
    "data": complex_points,
    "dataKeys": {
        "xAxis": "real",
        "yAxis": "imag",
        "clusterKey": "stability"
    }
}
```
