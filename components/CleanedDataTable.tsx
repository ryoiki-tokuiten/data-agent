import React, { useMemo } from 'react';
import './CleanedDataTable.css';

interface CleanedDataTableProps {
    data: any;
    title?: string;
    maxRows?: number;
    maxColumns?: number;
    mode?: 'preview' | 'fullscreen';
}

/**
 * Recursively searches for array data in nested objects
 */
const findArrayData = (obj: any, maxDepth: number = 4, currentDepth: number = 0): any[] | null => {
    if (currentDepth > maxDepth) return null;

    // Check if it's a valid array of objects
    if (Array.isArray(obj) && obj.length > 0) {
        // Accept arrays of objects or arrays of primitives
        if (typeof obj[0] === 'object' && obj[0] !== null) {
            return obj;
        }
        // Convert array of primitives to objects
        if (typeof obj[0] !== 'object') {
            return obj.map((val, idx) => ({ index: idx, value: val }));
        }
    }

    if (typeof obj === 'object' && obj !== null) {
        // Priority keys to check first (expanded list)
        const priorityKeys = [
            'mainDataTable', 'modelTrainingData', 'data', 'rows', 'records', 'items',
            'timeSeriesData', 'categoryDistribution', 'keyMetrics', 'values',
            'derivedFeaturesTable', 'customDatasets', 'dataTable', 'table',
            'results', 'entries', 'dataset', 'observations', 'samples',
            'forecasts', 'predictions', 'measurements', 'dataPoints'
        ];

        // Check priority keys first
        for (const key of priorityKeys) {
            if (obj[key]) {
                const result = findArrayData(obj[key], maxDepth, currentDepth + 1);
                if (result) return result;
            }
        }

        // Then check all other keys that look like they might contain data
        const otherKeys = Object.keys(obj).filter(k => !priorityKeys.includes(k));
        for (const key of otherKeys) {
            // Skip metadata-like keys
            if (['metadata', 'config', 'settings', 'options', 'info'].includes(key.toLowerCase())) {
                continue;
            }
            const result = findArrayData(obj[key], maxDepth, currentDepth + 1);
            if (result) return result;
        }
    }

    return null;
};

/**
 * Flattens nested objects into dot notation for better display
 */
const flattenObject = (obj: any, prefix: string = ''): Record<string, any> => {
    const flattened: Record<string, any> = {};

    for (const key in obj) {
        if (!obj.hasOwnProperty(key)) continue;

        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (value === null || value === undefined) {
            flattened[newKey] = value;
        } else if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length < 5) {
            // Only flatten small objects to avoid too many columns
            Object.assign(flattened, flattenObject(value, newKey));
        } else {
            flattened[newKey] = value;
        }
    }

    return flattened;
};

const renderSimpleMarkdown = (text: string): string => {
    if (!text) return '';
    
    // Headers
    let html = text
        .replace(/^### (.*$)/gim, '<h3 style="margin-top:1.5rem;margin-bottom:0.75rem;font-size:1.15rem;color:var(--text-color);font-weight:600;">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 style="margin-top:2rem;margin-bottom:1rem;font-size:1.35rem;color:var(--text-color);font-weight:700;border-bottom:1px solid var(--border-color);padding-bottom:0.4rem;">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 style="margin-top:1rem;margin-bottom:1.25rem;font-size:1.6rem;color:var(--text-color);font-weight:800;">$1</h1>');

    // Bold and italic
    html = html
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Code blocks & inline code
    html = html
        .replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre style="background:var(--bg-secondary);padding:1rem;border-radius:6px;overflow-x:auto;margin:1rem 0;border:1px solid var(--border-color);"><code class="language-$1">$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:0.15rem 0.4rem;border-radius:4px;font-size:0.9em;">$1</code>');

    // Unordered lists
    html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li style="margin-left:1.5rem;margin-bottom:0.35rem;">$1</li>');

    // Tables
    html = html.replace(/((?:\|.+?\|\n?)+)/g, (match) => {
        const lines = match.trim().split('\n');
        if (lines.length < 2) return match;
        const rows = lines.map((line, idx) => {
            const cells = line.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1);
            if (cells.every(c => c.trim().match(/^:?-+:?$/))) {
                return '';
            }
            const tag = idx === 0 ? 'th' : 'td';
            return `<tr>${cells.map(c => `<${tag} style="border:1px solid var(--border-color);padding:0.5rem 0.75rem;text-align:left;">${c.trim()}</${tag}>`).join('')}</tr>`;
        }).filter(Boolean);
        return `<div style="overflow-x:auto;margin:1rem 0;"><table style="border-collapse:collapse;width:100%;font-size:0.9rem;">${rows.join('')}</table></div>`;
    });

    // Paragraph breaks
    html = html.replace(/\n\n/g, '<div style="height:0.75rem;"></div>');

    return html;
};

export const CleanedDataTable: React.FC<CleanedDataTableProps> = ({ data, title, maxRows = 1000, maxColumns, mode = 'preview' }) => {
    // Set default maxColumns based on mode if not provided
    const effectiveMaxColumns = maxColumns !== undefined ? maxColumns : (mode === 'preview' ? 5 : undefined);
    const [copiedCell, setCopiedCell] = React.useState<string | null>(null);

    const handleCopyCell = async (value: string, cellId: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopiedCell(cellId);
            setTimeout(() => setCopiedCell(null), 2000);
        } catch (err) {
            console.error('Failed to copy cell value:', err);
        }
    };

    const markdownReport = typeof data === 'string'
        ? data
        : (data?.dataCleaningReport || null);

    if (markdownReport) {
        return (
            <div className="cleaned-data-report-container custom-scrollbar" style={{ padding: '1.75rem', overflowY: 'auto', height: '100%' }}>
                <div 
                    className="markdown-body" 
                    style={{ 
                        lineHeight: 1.7, 
                        color: 'var(--text-color)', 
                        fontSize: '0.95rem',
                        maxWidth: '1100px',
                        margin: '0 auto'
                    }}
                    dangerouslySetInnerHTML={{
                        __html: renderSimpleMarkdown(markdownReport)
                    }}
                />
            </div>
        );
    }

    const tableData = useMemo(() => {
        if (!data) return null;

        // Extract the primary dataset array from various possible structures
        let dataArray: any[] | null = null;
        let detectedPath: string = '';

        // Try comprehensive detection
        dataArray = findArrayData(data);

        // Try to identify where the data came from for better UX
        if (dataArray && typeof data === 'object' && !Array.isArray(data)) {
            const findPath = (obj: any, target: any[], path: string = ''): string => {
                if (obj === target) return path || 'root';
                if (typeof obj === 'object' && obj !== null) {
                    for (const key in obj) {
                        const newPath = path ? `${path}.${key}` : key;
                        const result = findPath(obj[key], target, newPath);
                        if (result) return result;
                    }
                }
                return '';
            };
            detectedPath = findPath(data, dataArray);
        } else if (Array.isArray(data)) {
            detectedPath = 'root array';
        }

        if (!dataArray || dataArray.length === 0) {
            return null;
        }

        // Flatten nested objects in rows for better display
        const flattenedData = dataArray.map(row => {
            if (typeof row === 'object' && row !== null) {
                return flattenObject(row);
            }
            return row;
        });

        // Get all unique columns from the dataset
        const columnsSet = new Set<string>();
        flattenedData.forEach(row => {
            if (typeof row === 'object' && row !== null) {
                Object.keys(row).forEach(key => columnsSet.add(key));
            }
        });

        const allColumns = Array.from(columnsSet);

        // Limit columns if needed
        const columns = effectiveMaxColumns ? allColumns.slice(0, effectiveMaxColumns) : allColumns;
        const isColumnsLimited = effectiveMaxColumns && allColumns.length > effectiveMaxColumns;

        // Limit rows if needed
        const limitedData = maxRows ? flattenedData.slice(0, maxRows) : flattenedData;

        return {
            columns,
            rows: limitedData,
            totalRows: flattenedData.length,
            totalColumns: allColumns.length,
            isRowsLimited: maxRows && flattenedData.length > maxRows,
            isColumnsLimited,
            detectedPath
        };
    }, [data, maxRows, effectiveMaxColumns]);

    if (!tableData) {
        // Try to show raw JSON if no table structure found
        const hasData = data && (Array.isArray(data) || (typeof data === 'object' && Object.keys(data).length > 0));

        return (
            <div className="cleaned-data-table-container">
                <div className="cleaned-data-no-data">
                    {hasData ? (
                        <>
                            <p>No tabular data structure detected.</p>
                            <p className="hint">The data might be in a non-tabular format. Showing raw JSON below:</p>
                            <div className="raw-json-fallback custom-scrollbar">
                                <pre>{JSON.stringify(data, null, 2)}</pre>
                            </div>
                        </>
                    ) : (
                        <>
                            <p>No data available to display.</p>
                            <p className="hint">The cleaned data is empty or not yet generated.</p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    const { columns, rows, totalRows, totalColumns, isRowsLimited, isColumnsLimited, detectedPath } = tableData;

    const getCellType = (value: any): string => {
        if (value === null || value === undefined) return 'null';
        if (typeof value === 'number') return 'numeric';
        if (typeof value === 'string') {
            // Check if it's a date/time string
            if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
        }
        return 'text';
    };

    const formatCellValue = (value: any, truncate: boolean = false): string => {
        if (value === null || value === undefined) {
            return '—';
        }
        if (typeof value === 'number') {
            // Format numbers with appropriate precision
            if (Number.isInteger(value)) {
                return value.toLocaleString();
            }
            // Show up to 4 decimal places for floats
            return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
        }
        if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        }
        if (typeof value === 'object') {
            const jsonStr = JSON.stringify(value);
            if (truncate && jsonStr.length > 100) {
                return jsonStr.substring(0, 97) + '...';
            }
            return jsonStr;
        }

        const strValue = String(value);
        if (truncate && strValue.length > 100) {
            return strValue.substring(0, 97) + '...';
        }
        return strValue;
    };

    const truncateColumnName = (name: string, maxLength: number = 30): string => {
        if (name.length <= maxLength) return name;
        return name.substring(0, maxLength - 3) + '...';
    };

    return (
        <div className={`cleaned-data-table-container ${mode}`}>
            {title && <h5 className="cleaned-data-table-title">{title}</h5>}

            <div className="table-info-bar">
                <div className="table-info-left">
                    <span className="table-stats">
                        <strong>{totalRows.toLocaleString()}</strong> rows × <strong>{totalColumns}</strong> columns
                    </span>
                    {detectedPath && (
                        <span className="table-source-path" title={`Data extracted from: ${detectedPath}`}>
                            Source: {detectedPath}
                        </span>
                    )}
                </div>
                {(isRowsLimited || isColumnsLimited) && (
                    <span className="table-limit-notice">
                        {isRowsLimited && isColumnsLimited && `Showing first ${maxRows?.toLocaleString()} rows & ${columns.length} columns`}
                        {isRowsLimited && !isColumnsLimited && `Showing first ${maxRows?.toLocaleString()} rows`}
                        {!isRowsLimited && isColumnsLimited && `Showing first ${columns.length} of ${totalColumns} columns`}
                    </span>
                )}
            </div>

            <div className="table-scroll-wrapper custom-scrollbar">
                <table className="cleaned-data-table">
                    <thead>
                        <tr>
                            <th className="row-number-header">#</th>
                            {columns.map((col, idx) => (
                                <th key={idx} title={col}>
                                    <span className="column-name-text">{truncateColumnName(col)}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rowIdx) => (
                            <tr key={rowIdx}>
                                <td className="row-number-cell">{rowIdx + 1}</td>
                                {columns.map((col, colIdx) => {
                                    const cellValue = row[col];
                                    const cellType = getCellType(cellValue);
                                    const fullValue = formatCellValue(cellValue, false);
                                    const displayValue = formatCellValue(cellValue, true);
                                    const isTruncated = fullValue.length > 100;
                                    const cellId = `cell-${rowIdx}-${colIdx}`;
                                    const className = `${cellType === 'numeric' ? 'numeric-cell' : cellType === 'date' ? 'date-cell' : ''} ${isTruncated ? 'truncated-cell' : ''}`;

                                    return (
                                        <td
                                            key={colIdx}
                                            className={className}
                                            title={fullValue}
                                            style={{ borderRight: colIdx < columns.length - 1 ? '1px solid var(--border-color)' : 'none' }}
                                        >
                                            <span className="cell-content">{displayValue}</span>
                                            {isTruncated && (
                                                <button
                                                    className="copy-cell-btn"
                                                    onClick={() => handleCopyCell(fullValue, cellId)}
                                                    title="Copy full value"
                                                >
                                                    {copiedCell === cellId ? 'Copied' : 'Copy'}
                                                </button>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
