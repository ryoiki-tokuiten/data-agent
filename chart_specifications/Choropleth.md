# Choropleth Specification

## Overview
Choropleth maps global geographic data across countries or territories, color-coding regions by metric intensity using Nivo Choropleth (`Choropleth.tsx`).

## Frontend Rendering Contract
- **Component**: Nivo Choropleth (`Choropleth.tsx`). The world map GeoJSON features are automatically bundled and loaded by the frontend.
- **`chartType`**: `"Choropleth"` (Exact PascalCase)
- **`data`**: Array of objects with country identifier and numeric value.
- **`dataKeys`**:
  - `idKey`: Field name containing the country code (e.g. `"id"` or `"country"`). MUST be ISO 3166-1 alpha-3 code (3 letters: `"USA"`, `"IND"`, `"CHN"`, `"DEU"`, `"GBR"`, `"FRA"`, `"JPN"`).
  - `valueKey`: Field name containing the metric value.
- **Numeric & Code Rules**:
  - Country IDs MUST be valid 3-letter ISO-3 codes (NOT 2-letter).
  - Metric values MUST be valid JSON numbers.

## Complete JSON Schema Example
```json
{
  "chartType": "Choropleth",
  "title": "Global Active User Distribution",
  "description": "Geographical distribution of active accounts across major operating countries.",
  "data": [
    { "countryCode": "USA", "activeAccounts": 142000 },
    { "countryCode": "IND", "activeAccounts": 189000 },
    { "countryCode": "DEU", "activeAccounts": 54000 },
    { "countryCode": "GBR", "activeAccounts": 61000 },
    { "countryCode": "JPN", "activeAccounts": 47000 },
    { "countryCode": "BRA", "activeAccounts": 38000 },
    { "countryCode": "AUS", "activeAccounts": 29000 }
  ],
  "dataKeys": {
    "idKey": "countryCode",
    "valueKey": "activeAccounts"
  }
}
```

## Python Generation Pattern
```python
import os, pandas as pd

df = pd.read_csv('slices/master_clean.csv')

# Aggregate by ISO-3 country code
country_summary = df.groupby('country_iso3')['user_count'].sum().reset_index()

geo_data = []
for _, r in country_summary.iterrows():
    geo_data.append({
        "id": str(r['country_iso3']).upper(),
        "value": float(r['user_count'])
    })

choropleth_spec = {
    "chartType": "Choropleth",
    "title": "Worldwide User Concentration",
    "description": "Nivo Choropleth mapped to ISO-3 country boundaries.",
    "data": geo_data,
    "dataKeys": {
        "idKey": "id",
        "valueKey": "value"
    }
}
```
