
import React from 'react';
import { useFileStore } from '../stores';
import { ACCEPTED_MIME_TYPES } from '../constants';
import { FaDatabase } from 'react-icons/fa6';

const getFileExtension = (filename: string) => {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
};

export const FileInput: React.FC = () => {
  const { 
    files: currentFiles, 
    focusAndMetricsInput,
    addFiles,
    removeFile,
    setFocusAndMetricsInput,
  } = useFileStore();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
        addFiles(event.target.files);
    }
    event.target.value = ''; 
  };

  const acceptedMimeTypesString = ACCEPTED_MIME_TYPES.join(',');

  const dropzoneText = currentFiles.length > 0 
    ? `${currentFiles.length} file(s) selected. Click to add more.`
    : "<span>Choose Dataset</span> or any other files";

  return (
    <div className="file-input-main-container">
      <div className="file-input-left-section">
        <div>
          <label htmlFor="file-upload" className="file-input-area">
              {currentFiles.length === 0 && ( 
                <FaDatabase className="file-input-icon" aria-hidden="true" />
              )}
              <p className="file-prompt-text" dangerouslySetInnerHTML={{ __html: dropzoneText }} />
               <input 
                  id="file-upload" 
                  name="file-upload" 
                  type="file" 
                  style={{ display: 'none' }}
                  multiple 
                  onChange={handleFileSelect} 
                  accept={acceptedMimeTypesString} 
                  aria-describedby="file-constraints"
              />
          </label>
          <p id="file-constraints" style={{ fontSize: '0.8rem', color: 'var(--text-secondary-color)', marginTop: '0.5rem' }}>
              All the data-related file types are supported (CSV, XLSX, Parquet, Feather, SQLite, JSON, XML, ZIP, etc)
          </p>
          
          {currentFiles.length > 0 && (
            <div className="file-pills-container">
              {currentFiles.map(file => {
                const extension = getFileExtension(file.name);
                return (
                  <div key={file.name + '-' + file.lastModified} className="file-pill" title={`${file.name} (${(file.size / (1024*1024)).toFixed(2)} MB)`}>
                    <div className="file-pill-content">
                      <span className="file-pill-name">{file.name}</span>
                      <span className="file-pill-info">
                        {extension ? `(${extension.toUpperCase()})` : '(file)'} - {(file.size / (1024*1024)).toFixed(2)} MB
                      </span>
                    </div>
                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFile(file.name);}} 
                        className="file-pill-remove-btn"
                        aria-label={`Remove ${file.name}`}
                    >
                        &times;
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="file-input-right-section">
        <div className="input-field-wrapper">
          <label htmlFor="focus-and-metrics-input">
            Focus areas / Key Metrics to Derive (Optional)
          </label>
          <textarea
            id="focus-and-metrics-input"
            name="focus-and-metrics-input"
            rows={3}
            placeholder="Focus on sales trends and regional performance; derive year-over-year revenue growth and average satisfaction by product category."
            value={focusAndMetricsInput}
            onChange={(e) => setFocusAndMetricsInput(e.target.value)}
            aria-label="Focus areas and key metrics to derive from data"
          />
        </div>
      </div>

    </div>
  );
};
