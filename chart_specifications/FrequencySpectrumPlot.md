# FrequencySpectrumPlot Specification

## Overview
FrequencySpectrumPlot visualizes Fast Fourier Transform (FFT) amplitude or power spectral density distributions across discrete frequency bins, identifying dominant periodicities in signals or time series.

## Frontend Rendering Contract
- **Component**: Bar/Line spectral renderer in `ChartDisplay.tsx`
- **`chartType`**: `"FrequencySpectrumPlot"` (Exact PascalCase)
- **`data`**: Array of frequency bin objects.
- **`dataKeys`**:
  - `xAxis`: Field name for the frequency bin or cycle period (e.g. `"frequencyHz"`).
  - `yAxis`: Field name for spectral power or amplitude (e.g. `"power"`).
- **Numeric Rules**: Values for `yAxis` and numeric frequency bins must be valid JSON numbers.

## Complete JSON Schema Example
```json
{
  "chartType": "FrequencySpectrumPlot",
  "title": "FFT Power Spectral Density of Sensor Accelerometer Signal",
  "description": "Identifies prominent resonance peaks and periodic harmonics via Fast Fourier Transform.",
  "data": [
    { "frequencyHz": 1.0, "power": 4.2 },
    { "frequencyHz": 2.0, "power": 12.8 },
    { "frequencyHz": 3.0, "power": 85.4 },
    { "frequencyHz": 4.0, "power": 24.1 },
    { "frequencyHz": 5.0, "power": 6.5 }
  ],
  "dataKeys": {
    "xAxis": "frequencyHz",
    "yAxis": "power"
  }
}
```

## Python Generation Pattern
```python
import numpy as np
import scipy.fft as fft

# Compute FFT on cleaned time series signal
signal = df['signal_value'].values
n = len(signal)
yf = fft.rfft(signal)
xf = fft.rfftfreq(n, d=1.0)  # Assuming unit sampling interval
power = np.abs(yf) ** 2 / n

spectrum_data = []
for freq, pwr in zip(xf[:60], power[:60]):
    spectrum_data.append({
        "frequency": round(float(freq), 3),
        "powerDensity": round(float(pwr), 2)
    })

spectrum_spec = {
    "chartType": "FrequencySpectrumPlot",
    "title": "FFT Power Spectrum Analysis",
    "description": "Spectral density extracted via Fast Fourier Transform.",
    "data": spectrum_data,
    "dataKeys": {
        "xAxis": "frequency",
        "yAxis": "powerDensity"
    }
}
```
