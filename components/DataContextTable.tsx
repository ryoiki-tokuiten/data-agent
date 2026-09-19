import React from 'react';

interface DataContextTableProps {
  data: any;
}

export const DataContextTable: React.FC<DataContextTableProps> = ({ data }) => {
  if (!data) return null;

  // If it's a string, just display it
  if (typeof data === 'string') {
    return <p style={{ color: 'var(--text-secondary-color)', lineHeight: 1.6, margin: 0 }}>{data}</p>;
  }

  // If it's an array, show as table
  if (Array.isArray(data)) {
    if (data.length === 0) return <p style={{ color: 'var(--text-tertiary-color)' }}>No data</p>;
    
    const keys = Object.keys(data[0] || {});
    if (keys.length === 0) return <p style={{ color: 'var(--text-tertiary-color)' }}>No data</p>;

    return (
      <div style={{ overflowX: 'auto' }} className="custom-scrollbar">
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.9rem',
        }}>
          <thead>
            <tr>
              {keys.map(key => (
                <th key={key} style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  borderBottom: '2px solid var(--border-color)',
                  fontWeight: 600,
                  color: 'var(--text-color)',
                  backgroundColor: 'var(--sub-panel-bg-color)',
                }}>
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 10).map((row, idx) => (
              <tr key={idx}>
                {keys.map(key => (
                  <td key={key} style={{
                    padding: '0.75rem',
                    borderBottom: '1px solid var(--border-color)',
                    color: 'var(--text-secondary-color)',
                  }}>
                    {typeof row[key] === 'number' ? row[key].toFixed(3) : String(row[key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 10 && (
          <p style={{ 
            marginTop: '0.5rem', 
            fontSize: '0.85rem', 
            color: 'var(--text-tertiary-color)',
            textAlign: 'center'
          }}>
            Showing 10 of {data.length} rows
          </p>
        )}
      </div>
    );
  }

  // If it's an object, show key-value pairs
  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length === 0) return <p style={{ color: 'var(--text-tertiary-color)' }}>No data</p>;

    return (
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.9rem',
      }}>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key}>
              <td style={{
                padding: '0.5rem 0.75rem',
                fontWeight: 600,
                color: 'var(--text-color)',
                borderBottom: '1px solid var(--border-color)',
                width: '40%',
              }}>
                {key}
              </td>
              <td style={{
                padding: '0.5rem 0.75rem',
                color: 'var(--text-secondary-color)',
                borderBottom: '1px solid var(--border-color)',
              }}>
                {typeof value === 'number' ? value.toFixed(3) : String(value ?? '')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return <p style={{ color: 'var(--text-secondary-color)' }}>{String(data)}</p>;
};
