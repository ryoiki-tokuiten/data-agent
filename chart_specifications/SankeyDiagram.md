# SankeyDiagram Specification

## Overview
SankeyDiagram visualizes multi-stage flows, conversions, migrations, energy balances, or state transitions where link widths represent numerical transfer volumes between nodes.

## Frontend Rendering Contract
- **Component**: Nivo Sankey (`SankeyDiagram.tsx`)
- **`chartType`**: `"SankeyDiagram"` (Exact PascalCase)
- **`data`**: Object containing `nodes` and `links`:
  ```json
  {
    "nodes": [
      { "name": "Landing Page" },
      { "name": "Product Details" },
      { "name": "Cart" },
      { "name": "Checkout" }
    ],
    "links": [
      { "source": 0, "target": 1, "value": 1000 },
      { "source": 1, "target": 2, "value": 450 },
      { "source": 2, "target": 3, "value": 280 }
    ]
  }
  ```
- **`dataKeys`**: MUST BE an empty object `{}`.
- **Index & Numeric Rules**:
  - `source` and `target` in `links` MUST be 0-based integer indices corresponding to the position in `nodes`.
  - `value` in each link MUST be a positive JSON number.

## Complete JSON Schema Example
```json
{
  "chartType": "SankeyDiagram",
  "title": "User Funnel Conversion Flow",
  "description": "Multi-stage conversion pipeline from initial session acquisition to completed purchase.",
  "data": {
    "nodes": [
      { "name": "Traffic Acquisition" },
      { "name": "Product Page Visit" },
      { "name": "Added to Cart" },
      { "name": "Checkout Initiated" },
      { "name": "Order Confirmed" },
      { "name": "Abandoned Funnel" }
    ],
    "links": [
      { "source": 0, "target": 1, "value": 8500 },
      { "source": 1, "target": 2, "value": 3200 },
      { "source": 1, "target": 5, "value": 5300 },
      { "source": 2, "target": 3, "value": 1950 },
      { "source": 2, "target": 5, "value": 1250 },
      { "source": 3, "target": 4, "value": 1420 },
      { "source": 3, "target": 5, "value": 530 }
    ]
  },
  "dataKeys": {}
}
```

## Python Generation Pattern
```python
import os, pandas as pd

df = pd.read_csv('slices/master_clean.csv')

# Compute transitions between stages
transitions = df.groupby(['from_stage', 'to_stage'])['count'].sum().reset_index()

all_nodes = list(pd.concat([transitions['from_stage'], transitions['to_stage']]).unique())
node_to_idx = {name: idx for idx, name in enumerate(all_nodes)}

links = []
for _, r in transitions.iterrows():
    links.append({
        "source": int(node_to_idx[r['from_stage']]),
        "target": int(node_to_idx[r['to_stage']]),
        "value": float(r['count'])
    })

sankey_spec = {
    "chartType": "SankeyDiagram",
    "title": "Stage Transition Flow",
    "description": "Sankey diagram showing directional flows between states.",
    "data": {
        "nodes": [{"name": str(n)} for n in all_nodes],
        "links": links
    },
    "dataKeys": {}
}
```
