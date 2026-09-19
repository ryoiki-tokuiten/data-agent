import React, { useState, useEffect } from 'react';
import { useUIStore } from '../hooks/stores';

declare var hljs: any;

export const FullScreenCodePanel: React.FC = () => {
    const { fullScreenCodePanelInfo, isFullScreenCodePanelVisible, toggleFullScreenCodePanel } = useUIStore();
    const [codeCopied, setCodeCopied] = useState(false);
    const [logCopied, setLogCopied] = useState(false);

    useEffect(() => {
        if (isFullScreenCodePanelVisible && typeof hljs !== 'undefined') {
            setTimeout(() => {
                document.querySelectorAll('.code-panel-content pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
            }, 50);
        }
    }, [isFullScreenCodePanelVisible, fullScreenCodePanelInfo]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullScreenCodePanelVisible) {
                handleClose();
            }
        };

        if (isFullScreenCodePanelVisible) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isFullScreenCodePanelVisible]);

    if (!isFullScreenCodePanelVisible || !fullScreenCodePanelInfo) return null;

    const { pythonCode, executionLog, tabName } = fullScreenCodePanelInfo;

    const handleClose = () => {
        toggleFullScreenCodePanel(null);
    };

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(pythonCode);
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy code:', err);
        }
    };

    const handleCopyLog = async () => {
        try {
            await navigator.clipboard.writeText(executionLog);
            setLogCopied(true);
            setTimeout(() => setLogCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy log:', err);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    return (
        <div 
            className="fullscreen-code-panel-overlay" 
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="code-panel-title"
        >
            <div className="fullscreen-code-panel-container">
                {/* Header */}
                <div className="code-panel-header">
                    <div className="code-panel-title-section">
                        <svg className="code-panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="16 18 22 12 16 6"></polyline>
                            <polyline points="8 6 2 12 8 18"></polyline>
                        </svg>
                        <h2 id="code-panel-title">Executed Python Code - {tabName}</h2>
                    </div>
                    <button 
                        className="code-panel-close-button" 
                        onClick={handleClose}
                        aria-label="Close code panel"
                        title="Close (Esc)"
                    >
                        ✕
                    </button>
                </div>

                {/* Content Grid */}
                <div className="code-panel-content-grid">
                    {/* Left: Python Code */}
                    <div className="code-panel-section">
                        <div className="code-panel-section-header">
                            <div className="code-panel-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                                <h3>Python Code</h3>
                            </div>
                            <button 
                                className="code-panel-copy-button" 
                                onClick={handleCopyCode}
                                title="Copy code to clipboard"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                </svg>
                                {codeCopied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <div className="code-panel-content custom-scrollbar">
                            <pre><code className="language-python">{pythonCode}</code></pre>
                        </div>
                    </div>

                    {/* Right: Execution Output */}
                    <div className="code-panel-section">
                        <div className="code-panel-section-header">
                            <div className="code-panel-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                    <line x1="8" y1="21" x2="16" y2="21"></line>
                                    <line x1="12" y1="17" x2="12" y2="21"></line>
                                </svg>
                                <h3>Execution Output</h3>
                            </div>
                            <button 
                                className="code-panel-copy-button" 
                                onClick={handleCopyLog}
                                title="Copy output to clipboard"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                </svg>
                                {logCopied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <div className="code-panel-content code-panel-output custom-scrollbar">
                            {executionLog ? (
                                <pre><code>{executionLog}</code></pre>
                            ) : (
                                <div className="code-panel-empty-state">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="16" x2="12" y2="12"></line>
                                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                    </svg>
                                    <p>No execution output available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
