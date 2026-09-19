


import React, { useState } from 'react';
import { useAppStore } from '../stores';

export const ApiKeyForm: React.FC = () => {
  const currentGemini = useAppStore((state) => state.geminiApiKey) || localStorage.getItem('geminiApiKey') || '';
  const [geminiKey, setGeminiKey] = useState(currentGemini);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  const setApiKeys = useAppStore((state) => state.setApiKeys);
  const isSubmitting = useAppStore((state) => state.isProcessingAnyPipeline);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSubmitting) {
      const cleanKey = geminiKey.trim().replace(/^['"]|['"]$/g, '').trim();
      setApiKeys(cleanKey);
    }
  };

  return (
    <main className="custom-scrollbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
      <div className="api-key-form-card">
        <h2 className="modal-title" style={{ textAlign: 'center', fontSize: '2.4rem', marginBottom: '1rem', letterSpacing: '-0.03em' }}>
          Welcome to the Data Science Agent
        </h2>
        <p style={{ color: 'var(--text-secondary-color)', textAlign: 'center', lineHeight: '1.7', marginBottom: '2rem', maxWidth: '550px', marginInline: 'auto' }}>
          Please enter your Google Gemini API key. Your key is stored locally in your browser and connects directly to Google AI Studio and the Interactions API.
        </p>
        <form onSubmit={handleSubmit} style={{width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px', marginInline: 'auto'}}>
          <div>
            <label htmlFor="gemini-key" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary-color)', fontWeight: 500 }}>
              Google Gemini API Key <span style={{ color: 'var(--accent-blue)', fontSize: '0.8rem' }}>(Required)</span>
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="gemini-key"
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Enter your Gemini API Key (e.g. AIzaSy...)"
                aria-label="Gemini API Key Input"
                className="api-key-input"
                style={{ width: '100%', paddingRight: '2.8rem' }}
                disabled={isSubmitting}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary-color)',
                  cursor: 'pointer',
                  padding: '0.3rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={showGeminiKey ? 'Hide key' : 'Show key'}
                aria-label={showGeminiKey ? 'Hide key' : 'Show key'}
              >
                {showGeminiKey ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary-color)', lineHeight: '1.4' }}>
              Requires a standard Google Gemini API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue, #0169CC)', textDecoration: 'underline' }}>Google AI Studio</a> (typically starts with <code>AIzaSy...</code>). The same key powers all models and the Interactions API.
            </p>
          </div>
          <button 
            type="submit" 
            className="button"
            disabled={isSubmitting || !geminiKey.trim()}
            style={{ padding: '0.75rem 2rem', fontSize: '1rem', marginTop: '0.5rem' }}
          >
            Continue
          </button>
        </form>
      </div>
    </main>
  );
};
