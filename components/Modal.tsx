
import React from 'react';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  type?: 'info' | 'error' | 'success';
  showCloseButton?: boolean; 
  modalIsActive: boolean; 
}

export const Modal: React.FC<ModalProps> = ({ title, children, onClose, type = 'info', showCloseButton = true, modalIsActive }) => {
  let titleClass = 'modal-title';
  if (type === 'error') titleClass += ' error';
  if (type === 'success') titleClass += ' success';

  return (
    <div className={`modal-overlay ${modalIsActive ? 'active' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title-id">
      <div className="modal-content">
        <div className="modal-header">
          <h2 id="modal-title-id" className={titleClass}>{title}</h2>
          {onClose && showCloseButton && (
            <button
              onClick={onClose}
              className="modal-close-button"
              aria-label="Close modal"
            >
              &times;
            </button>
          )}
        </div>
        <div className="modal-body custom-scrollbar">
            {children}
        </div>
         {onClose && showCloseButton && ( 
            <div className="modal-footer">
                <button
                    onClick={onClose}
                    className="button primary-action" 
                >
                    OK
                </button>
            </div>
         )}
      </div>
    </div>
  );
};
