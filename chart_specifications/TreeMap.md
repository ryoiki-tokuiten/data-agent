# TreeMap Specification

## Overview
TreeMap displays nested hierarchical data using nested rectangles proportional to an area metric. Ideal for multi-level category taxonomies, folder storage distributions, or segmented product hierarchies.

## Frontend Rendering Contract
- **Component**: Nivo TreeMap (`TreeMap.tsx`)
- **`chartType`**: `"TreeMap"` (Exact PascalCase)
- **`data`**: Nested JSON object of shape:
  ```json
  {
    "name": "Root",
    "children": [
      {
        "name": "Category A",
        "children": [
          { "name": "Subcategory A1", "value": 120 },
          { "name": "Subcategory A2", "value": 85 }
        ]
      },
      { "name": "Category B", "value": 210 }
    ]
  }
  ```
- **`dataKeys`**: Must be an empty object `{}`.
- **Numeric Rules**: Every leaf node must contain a positive numeric `value`. Parent nodes contain a `children` array.

## Complete JSON Schema Example
```json
{
  "chartType": "TreeMap",
  "title": "Global Revenue Distribution by Region and Sector",
  "description": "Hierarchical treemap nested by geographical market and business sector.",
  "data": {
    "name": "Global Revenue",
    "children": [
      {
        "name": "North America",
        "children": [
          { "name": "Enterprise Software", "value": 45000 },
          { "name": "Cloud Infrastructure", "value": 38000 },
          { "name": "Consumer Hardware", "value": 24000 }
        ]
      },
      {
        "name": "Europe",
        "children": [
          { "name": "Enterprise Software", "value": 31000 },
          { "name": "Cloud Infrastructure", "value": 26000 },
          { "name": "Consumer Hardware", "value": 18000 }
        ]
      },
      {
        "name": "Asia Pacific",
        "children": [
          { "name": "Consumer Hardware", "value": 42000 },
          { "name": "Enterprise Software", "value": 29000 },
          { "name": "Cloud Infrastructure", "value": 21000 }
        ]
      }
    ]
  },
  "dataKeys": {}
}
```

## Python Generation Pattern
```python
import os, pandas as pd

df = pd.read_csv('slices/master_clean.csv')

# Build hierarchical tree from region and category columns
tree = {"name": "Root", "children": []}
for region, reg_group in df.groupby('region'):
    reg_node = {"name": str(region), "children": []}
    for cat, cat_group in reg_group.groupby('category'):
        val = float(cat_group['amount'].sum())
        if val > 0:
            reg_node["children"].append({"name": str(cat), "value": val})
    if reg_node["children"]:
        tree["children"].append(reg_node)

treemap_spec = {
    "chartType": "TreeMap",
    "title": "Hierarchical Value Distribution",
    "description": "Nested proportional rectangles built from hierarchical slice data.",
    "data": tree,
    "dataKeys": {}
}
```
