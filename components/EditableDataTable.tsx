import React, { useState, useCallback, useMemo } from 'react';
import './EditableDataTable.css';

interface EditableDataTableProps {
    data: any[];
    onDataChange: (newData: any[]) => void;
    title?: string;
}

export const EditableDataTable: React.FC<EditableDataTableProps> = ({ data, onDataChange, title }) => {
    const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Extract columns from data
    const columns = useMemo(() => {
        if (!data || data.length === 0) return [];
        const allKeys = new Set<string>();
        data.forEach(row => {
            Object.keys(row).forEach(key => {
                if (!key.startsWith('_') && !key.startsWith('cartesian')) {
                    allKeys.add(key);
                }
            });
        });
        return Array.from(allKeys);
    }, [data]);

    // Sort data
    const sortedData = useMemo(() => {
        if (!sortConfig) return data;
        
        const sorted = [...data].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            
            if (aVal === bVal) return 0;
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;
            
            const aNum = parseFloat(aVal);
            const bNum = parseFloat(bVal);
            
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
            }
            
            return sortConfig.direction === 'asc' 
                ? String(aVal).localeCompare(String(bVal))
                : String(bVal).localeCompare(String(aVal));
        });
        
        return sorted;
    }, [data, sortConfig]);

    const handleSort = (column: string) => {
        setSortConfig(prev => {
            if (prev?.key === column) {
                return prev.direction === 'asc' 
                    ? { key: column, direction: 'desc' }
                    : null;
            }
            return { key: column, direction: 'asc' };
        });
    };

    const startEdit = (rowIndex: number, column: string) => {
        const actualRow = sortedData[rowIndex];
        const originalIndex = data.indexOf(actualRow);
        setEditingCell({ row: originalIndex, col: column });
        setEditValue(String(actualRow[column] ?? ''));
    };

    const saveEdit = useCallback(() => {
        if (!editingCell) return;
        
        const newData = [...data];
        const { row, col } = editingCell;
        
        // Try to parse as number if it looks like one
        let parsedValue: any = editValue;
        const numValue = parseFloat(editValue);
        if (!isNaN(numValue) && editValue.trim() !== '') {
            parsedValue = numValue;
        }
        
        newData[row] = { ...newData[row], [col]: parsedValue };
        onDataChange(newData);
        setEditingCell(null);
        setEditValue('');
    }, [editingCell, editValue, data, onDataChange]);

    const cancelEdit = () => {
        setEditingCell(null);
        setEditValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            saveEdit();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    };

    const formatValue = (value: any): string => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'number') {
            return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(4);
        }
        return String(value);
    };

    if (!data || data.length === 0) {
        return (
            <div className="editable-data-table-empty">
                <p>No data available to edit</p>
            </div>
        );
    }

    return (
        <div className="editable-data-table-container">
            {title && <h3 className="editable-data-table-title">{title}</h3>}
            
            <div className="editable-data-table-info">
                <span>{data.length} rows × {columns.length} columns</span>
                <span className="edit-hint">Click any cell to edit</span>
            </div>

            <div className="editable-data-table-wrapper custom-scrollbar">
                <table className="editable-data-table">
                    <thead>
                        <tr>
                            <th className="row-number-header">#</th>
                            {columns.map(col => (
                                <th 
                                    key={col}
                                    onClick={() => handleSort(col)}
                                    className="sortable"
                                    title={`Click to sort by ${col}`}
                                >
                                    <span>{col}</span>
                                    {sortConfig?.key === col && (
                                        <span className="sort-indicator">
                                            {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                                        </span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((row, rowIndex) => {
                            const originalIndex = data.indexOf(row);
                            return (
                                <tr key={rowIndex}>
                                    <td className="row-number-cell">{rowIndex + 1}</td>
                                    {columns.map(col => {
                                        const isEditing = editingCell?.row === originalIndex && editingCell?.col === col;
                                        const value = row[col];
                                        const isNumeric = typeof value === 'number';
                                        
                                        return (
                                            <td
                                                key={col}
                                                className={`${isNumeric ? 'numeric-cell' : ''} ${isEditing ? 'editing' : ''}`}
                                                onClick={() => !isEditing && startEdit(rowIndex, col)}
                                                title={isEditing ? 'Press Enter to save, Esc to cancel' : 'Click to edit'}
                                            >
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onBlur={saveEdit}
                                                        onKeyDown={handleKeyDown}
                                                        autoFocus
                                                        className="cell-input"
                                                    />
                                                ) : (
                                                    <span className="cell-value">{formatValue(value)}</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
