import React, { useState, useEffect, useRef } from 'react';
import type { ForecastingModelDetail } from '../types';
import { GeminiService, GeminiError } from '../services/geminiService';
import { LoadingSpinner } from './LoadingSpinner';

interface InsightAssistantModalProps {
  show: boolean;
  onClose: () => void;
  modelDetail: ForecastingModelDetail | null;
  dataCleaningReport?: string | undefined | null;
  geminiService: GeminiService | null;
  originalModelId: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'error';
}

export const InsightAssistantModal: React.FC<InsightAssistantModalProps> = ({
  show,
  onClose,
  modelDetail,
  dataCleaningReport,
  geminiService,
  originalModelId,
}) => {
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentConversationSubjectId, setCurrentConversationSubjectId] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      let subjectIdentifier: string | null = null;
      let initialMessageText: string = "Ask a question below.";

      if (modelDetail) {
        subjectIdentifier = modelDetail.modelIdSuggestion;
        initialMessageText = `Asking about model: "${modelDetail.modelName || modelDetail.modelIdSuggestion}". Type your question below.`;
      }

      if (subjectIdentifier && subjectIdentifier !== currentConversationSubjectId) {
        setConversation([{ id: 'initial-info', text: initialMessageText, sender: 'ai' }]);
        setUserInput('');
        setCurrentConversationSubjectId(subjectIdentifier);
      } else if (!subjectIdentifier && currentConversationSubjectId !== null) {
        // Case where modal is shown but subject is no longer valid (e.g. context cleared before modal fully closes)
        setConversation([]);
        setUserInput('');
        setCurrentConversationSubjectId(null);
      }
    } else if (!show && currentConversationSubjectId !== null) {
      // Clear conversation when modal is hidden
      setConversation([]);
      setUserInput('');
      setCurrentConversationSubjectId(null);
    }
  }, [show, modelDetail, currentConversationSubjectId]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading || !geminiService) return;
    if (!modelDetail) return;


    const userMessage: Message = { id: Date.now().toString() + 'u', text: userInput, sender: 'user' };
    setConversation(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const aiResponseText = await geminiService.getModelInsight(
        modelDetail,
        userMessage.text,
        dataCleaningReport || null,
        originalModelId,
      );

      const aiMessage: Message = { id: Date.now().toString() + 'a', text: aiResponseText || "No response text.", sender: 'ai' };
      setConversation(prev => [...prev, aiMessage]);

    } catch (error: any) {
      console.error("Error getting insight from AI:", error);
      const errorMessageText = error instanceof GeminiError ? `AI Error: ${error.message}` : (error.message || "An unexpected error occurred.");
      const errorMessage: Message = { id: Date.now().toString() + 'e', text: errorMessageText, sender: 'error' };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSubjectTitle = () => {
    if (modelDetail) return modelDetail.modelName || modelDetail.modelIdSuggestion;
    return "Insight Assistant";
  };

  const getSubjectDescription = () => {
    if (modelDetail) return modelDetail.description;
    return "";
  }

  if (!show) return null;
  if (!modelDetail) return null;


  return (
    <div className={`modal-overlay ${show ? 'active' : ''}`} role="dialog" aria-modal={show} aria-labelledby="insight-modal-title">
      <div className="modal-content" style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h2 id="insight-modal-title" className="modal-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.75rem', verticalAlign: 'bottom' }}><path d="m10.83 9.17 2.5 2.5-2.5 2.5"></path><path d="M12 2a10 10 0 1 0 10 10c0-2.24-.76-4.32-2.05-6.04L12 2"></path><path d="M12 22a10 10 0 0 0 7.95-3.96L12 22Z"></path><circle cx="12" cy="12" r="10"></circle></svg>
            Model Insight Assistant
          </h2>
          <button onClick={onClose} className="modal-close-button" aria-label="Close modal">&times;</button>
        </div>
        <div className="modal-body custom-scrollbar" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '60vh' }}>
          {modelDetail && (
            <div style={{ padding: '1rem 1.5rem 0.75rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(var(--bg-color-rgb),0.2)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '0.25rem' }}>{getSubjectTitle()}</h3>
              {getSubjectDescription() && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary-color)', maxHeight: '60px', overflowY: 'auto' }} className="custom-scrollbar">
                  {getSubjectDescription()}
                </p>
              )}
            </div>
          )}
          <div className="custom-scrollbar" style={{ flexGrow: 1, padding: '1rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {conversation.map(msg => (
              <div key={msg.id} style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
              }}>
                <div style={{
                  background: msg.sender === 'user' ? 'var(--accent-purple)' : msg.sender === 'error' ? 'rgba(var(--accent-pink-rgb),0.2)' : 'var(--card-bg-color)',
                  color: msg.sender === 'user' ? 'white' : msg.sender === 'error' ? 'var(--accent-pink)' : 'var(--text-color)',
                  padding: '0.6rem 1rem',
                  borderRadius: msg.sender === 'user' ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
                  border: msg.sender !== 'user' && msg.sender !== 'error' ? '1px solid var(--border-color)' : 'none',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                  fontSize: '0.9rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }}>
                <LoadingSpinner inline />
                <span style={{ color: 'var(--text-secondary-color)', fontSize: '0.9rem' }}>AI is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem', background: 'rgba(var(--bg-color-rgb),0.2)' }}>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              placeholder="Ask a question about this model..."
              rows={2}
              style={{ flexGrow: 1, resize: 'none', fontSize: '0.9rem' }}
              aria-label="Your question about the model"
              disabled={isLoading}
            />
            <button onClick={handleSendMessage} disabled={isLoading || !userInput.trim()} className="primary-action">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
