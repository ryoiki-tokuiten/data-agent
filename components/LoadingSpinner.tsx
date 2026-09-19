
import React from 'react';

interface LoadingSpinnerProps {
  inline?: boolean; 
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ inline = false }) => {
  const style: React.CSSProperties = {};
  if (inline) {
    style.display = 'inline-block';
    style.verticalAlign = 'middle';
  }

  return (
    <div className="spinner" style={style} role="status" aria-label="Loading...">
      
    </div>
  );
};
