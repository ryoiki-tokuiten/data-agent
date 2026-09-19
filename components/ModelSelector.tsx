
import React from 'react';
import { AVAILABLE_MODELS } from '../utils/constants';

interface ModelSelectorProps {
  selectedModelId: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModelId, onChange, disabled }) => {
  return (
    <div>
      <label htmlFor="model-selector">
        Select Gemini Model:
      </label>
      <select
        id="model-selector"
        name="model-selector"
        value={selectedModelId}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{width: '100%', marginTop: '0.5rem'}}
      >
        {AVAILABLE_MODELS.map(model => (
          <option key={model.id} value={model.id}>
            {model.displayName}
          </option>
        ))}
      </select>
    </div>
  );
};
