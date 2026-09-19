# Chart Specifications Catalog

This directory contains individual specification files for each supported chart type in the Data Science Agent platform. Downstream agents can consult these files on disk at any time to verify exact JSON schemas, required dataKeys, numeric constraints, and Python generation patterns.

## Available Chart Types

| Category | Chart Type | Specification File | Primary Use Case |
|---|---|---|---|
| Categorical & Comparisons | BarChart | [BarChart.md](./BarChart.md) | Discrete category comparisons, aggregations |
| Categorical & Comparisons | StackedBarChart | [StackedBarChart.md](./StackedBarChart.md) | Multi-series part-to-whole categorical comparisons |
| Categorical & Comparisons | PolarBar | [PolarBar.md](./PolarBar.md) | Cyclical or multi-metric radial bar comparisons |
| Categorical & Comparisons | DataTable | [DataTable.md](./DataTable.md) | High-cardinality structured data inspection |
| Trends & Time Series | LineChart | [LineChart.md](./LineChart.md) | Continuous trends over time or sequence |
| Trends & Time Series | AreaChart | [AreaChart.md](./AreaChart.md) | Cumulative metrics and volume trends |
| Trends & Time Series | Streamgraph | [Streamgraph.md](./Streamgraph.md) | Multiple stream displacements over time |
| Trends & Time Series | MultiLineRateOfChangePlot | [MultiLineRateOfChangePlot.md](./MultiLineRateOfChangePlot.md) | Derivative / growth rate comparisons |
| Proportions & Composition | PieChart | [PieChart.md](./PieChart.md) | Part-to-whole proportions (5-7 slices max) |
| Proportions & Composition | WaffleChart | [WaffleChart.md](./WaffleChart.md) | Grid-based percentage / demographic breakdown |
| Proportions & Composition | TreeMap | [TreeMap.md](./TreeMap.md) | Nested hierarchical category distributions |
| Correlation & Dispersion | ScatterPlot | [ScatterPlot.md](./ScatterPlot.md) | Bivariate / multivariate correlations, clustering |
| Correlation & Dispersion | BubbleChart | [BubbleChart.md](./BubbleChart.md) | 3D+ metric relationships (X, Y, bubble size) |
| Correlation & Dispersion | Heatmap | [Heatmap.md](./Heatmap.md) | 2D matrix grids, intensity tables |
| Correlation & Dispersion | CorrelationHeatmap | [CorrelationHeatmap.md](./CorrelationHeatmap.md) | Feature correlation coefficients (-1.0 to 1.0) |
| Distributions | BoxPlot | [BoxPlot.md](./BoxPlot.md) | Raw data points, quartiles, and outliers |
| Distributions | ViolinPlot | [ViolinPlot.md](./ViolinPlot.md) | Kernel density curves across categories |
| Temporal & Activity | Calendar | [Calendar.md](./Calendar.md) | Year-long daily activity / metric heatmaps |
| Temporal & Activity | TimeRange | [TimeRange.md](./TimeRange.md) | 1-6 month weekday activity heatmaps |
| Hierarchical & Flow | SankeyDiagram | [SankeyDiagram.md](./SankeyDiagram.md) | Multi-stage flows, conversions, migrations |
| Hierarchical & Flow | RadialBar | [RadialBar.md](./RadialBar.md) | Multi-concentric category metrics |
| Geospatial | Choropleth | [Choropleth.md](./Choropleth.md) | Global country metrics by ISO-3 country codes |
| Advanced & Scientific | ComposedChart | [ComposedChart.md](./ComposedChart.md) | Hybrid views combining bars, lines, and areas |
| Advanced & Scientific | ComplexPlanePlot | [ComplexPlanePlot.md](./ComplexPlanePlot.md) | Real vs imaginary components, eigenvalues |
| Advanced & Scientific | FrequencySpectrumPlot | [FrequencySpectrumPlot.md](./FrequencySpectrumPlot.md) | FFT power spectral density distributions |
| Overlays | Regression Analysis | [RegressionAnalysis.md](./RegressionAnalysis.md) | Linear, polynomial, exponential, logistic fits |

## Universal Rules for Downstream Agents
1. Programmatic Generation: Always load data directly from `./slices/` or `./user_uploaded/` using Python. Never handcode mock data arrays.
2. Numeric Typing: Every metric, coordinate, and measurement value in `data` must be a valid JSON number (float or int), not a string.
3. Schema Verification: Dump output to your agent's dedicated directory (e.g. `./visualization/final_output.json`) and call `parse_final_output` to validate.
