# Regression Analysis & Trendline Specification

## Overview
A `trendline` object can be added to any `ScatterPlot`, `LineChart`, `AreaChart`, or `ComposedChart` to display statistical fits, equations, R² scores, and optional confidence bands.

## Supported Regression Types
- `"linear"`: Constant rate of change ($y = mx + b$).
- `"polynomial"`: Non-linear curves with turning points (degree 2 to 8, prefer degree 3-5).
- `"exponential"`: Accelerating growth or decay ($y = a \cdot e^{bx}$).
- `"logarithmic"`: Diminishing returns saturation ($y = a + b \cdot \ln(x)$, requires $x > 0$).
- `"power"`: Scaling relationships ($y = a \cdot x^b$, requires $x > 0, y > 0$).
- `"logistic"`: S-curves with carrying capacity saturation ($y = \frac{L}{1 + e^{-k(x - x_0)}}$).

## Trendline Schema
```json
{
  "trendline": {
    "type": "linear",
    "name": "Fitted Trend",
    "data": [
      { "x": 10.0, "y": 25.4 },
      { "x": 20.0, "y": 48.2 },
      { "x": 30.0, "y": 71.0 }
    ],
    "dataKeys": {
      "xAxis": "x",
      "yAxis": "y"
    },
    "equation": "y = 2.280x + 2.600",
    "rSquared": 0.965,
    "pValue": 0.0001,
    "adjustedRSquared": 0.963,
    "rmse": 1.45,
    "confidenceBands": {
      "upper": [{ "x": 10.0, "y": 27.2 }, { "x": 30.0, "y": 74.1 }],
      "lower": [{ "x": 10.0, "y": 23.6 }, { "x": 30.0, "y": 67.9 }],
      "level": 0.95
    }
  }
}
```

## Python Implementation Patterns

### 1. Linear Regression
```python
import numpy as np
from scipy import stats

x_data = df['x'].values
y_data = df['y'].values
slope, intercept, r_value, p_value, _ = stats.linregress(x_data, y_data)
x_trend = np.linspace(x_data.min(), x_data.max(), 100)
y_trend = slope * x_trend + intercept

trendline = {
    "type": "linear",
    "name": "Linear Regression",
    "data": [{"x": float(x_trend[i]), "y": float(y_trend[i])} for i in range(len(x_trend))],
    "dataKeys": {"xAxis": "x", "yAxis": "y"},
    "equation": f"y = {slope:.3f}x + {intercept:.3f}",
    "rSquared": float(r_value ** 2),
    "pValue": float(p_value)
}
```

### 2. Polynomial Regression (Degree 3-5)
```python
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

degree = 3
poly = PolynomialFeatures(degree=degree)
X_poly = poly.fit_transform(x_data.reshape(-1, 1))
model = LinearRegression().fit(X_poly, y_data)
x_trend = np.linspace(x_data.min(), x_data.max(), 100)
y_trend = model.predict(poly.transform(x_trend.reshape(-1, 1)))

coeffs = [model.intercept_] + list(model.coef_[1:])
terms = [f"{coeffs[0]:.3f}"]
for i in range(1, len(coeffs)):
    terms.append(f"{coeffs[i]:+.3f}x^{i}" if i > 1 else f"{coeffs[i]:+.3f}x")

trendline = {
    "type": "polynomial",
    "degree": degree,
    "name": f"Polynomial Fit (deg {degree})",
    "data": [{"x": float(x_trend[i]), "y": float(y_trend[i])} for i in range(len(x_trend))],
    "dataKeys": {"xAxis": "x", "yAxis": "y"},
    "equation": "y = " + "".join(terms),
    "rSquared": float(r2_score(y_data, model.predict(X_poly)))
}
```

### 3. Logarithmic Regression
```python
x_log = np.log(x_data[x_data > 0]).reshape(-1, 1)
y_filtered = y_data[x_data > 0]
model = LinearRegression().fit(x_log, y_filtered)
a, b = model.intercept_, model.coef_[0]
x_trend = np.linspace(x_data.min(), x_data.max(), 100)
y_trend = a + b * np.log(x_trend)

trendline = {
    "type": "logarithmic",
    "name": "Logarithmic Fit",
    "data": [{"x": float(x_trend[i]), "y": float(y_trend[i])} for i in range(len(x_trend))],
    "dataKeys": {"xAxis": "x", "yAxis": "y"},
    "equation": f"y = {a:.3f} + {b:.3f} * ln(x)",
    "rSquared": float(r2_score(y_filtered, a + b * np.log(x_data[x_data > 0])))
}
```
