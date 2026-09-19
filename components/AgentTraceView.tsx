import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { LiveExecutionStep, AnalysisTabType } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import {
  FiTerminal,
  FiCpu,
  FiSearch,
  FiExternalLink,
  FiZap,
  FiImage,
  FiBarChart2,
  FiTrendingUp,
  FiCheck,
  FiCopy,
  FiActivity,
  FiArrowRight,
  FiMessageSquare,
  FiChevronDown,
  FiChevronUp,
  FiFileText
} from 'react-icons/fi';

declare var hljs: any;

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const highlightPython = (code: string): string => {
  if (!code) return '';
  if (typeof hljs !== 'undefined') {
    try {
      return hljs.highlight(code, { language: 'python', ignoreIllegals: true }).value;
    } catch {
      return escapeHtml(code);
    }
  }
  return escapeHtml(code);
};

// ==========================================
// 1. Clean Tool & Step Cards
// ==========================================

const CodeExecutionCard: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const lineCount = useMemo(() => (code ? code.split('\n').length : 0), [code]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const highlightedHtml = useMemo(() => highlightPython(code), [code]);

  return (
    <div className="trace-card">
      <div className="trace-card-header">
        <div className="trace-header-left">
          <FiTerminal size={11} className="trace-icon-muted" />
          <span className="trace-tag">python</span>
          <span className="trace-meta-info">{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="trace-copy-btn"
          title="Copy code"
        >
          {copied ? <FiCheck size={11} style={{ color: 'var(--accent-green, #00E676)' }} /> : <FiCopy size={11} />}
        </button>
      </div>
      <pre className="trace-code-body custom-scrollbar">
        <code
          className="hljs language-python"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </pre>
    </div>
  );
};

const StandardOutputCard: React.FC<{ output: string }> = ({ output }) => {
  const [copied, setCopied] = useState(false);
  const isError = useMemo(() => {
    return /traceback|error:|exception:|failed/i.test(output);
  }, [output]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="trace-card">
      <div className="trace-card-header">
        <div className="trace-header-left">
          <FiCpu size={11} className="trace-icon-muted" />
          <span className="trace-tag">stdout</span>
          {isError && <span className="trace-pill-warn">Error</span>}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="trace-copy-btn"
          title="Copy output"
        >
          {copied ? <FiCheck size={11} style={{ color: 'var(--accent-green, #00E676)' }} /> : <FiCopy size={11} />}
        </button>
      </div>
      <pre className={`trace-output-body custom-scrollbar ${isError ? 'text-error' : ''}`}>
        <code>{output}</code>
      </pre>
    </div>
  );
};

// Schema Compiler Validator Card (parse_final_output)
const ParseFinalOutputCard: React.FC<{
  args?: Record<string, any>;
  result?: any;
}> = ({ args, result }) => {
  const [showPayload, setShowPayload] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const agentName = args?.agent || result?.agent || '';
  const filePath = args?.file_path || result?.file_path || (agentName ? `${agentName}/final_output.json` : 'final_output.json');
  const fileContent = args?.file_content || '';
  const hasResult = result !== undefined && result !== null;
  const isSuccess = result?.success === true;

  const handleCopyPayload = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(fileContent);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 1600);
  };

  return (
    <div className="trace-card">
      <div className="trace-card-header">
        <div className="trace-header-left">
          <FiZap size={11} className="trace-icon-muted" />
          <span className="trace-tag">validate_output</span>
          <code className="trace-inline-code">{filePath}</code>
        </div>
        {hasResult && (
          <span className={isSuccess ? 'trace-pill-ok' : 'trace-pill-warn'}>
            {isSuccess ? 'Valid' : 'Self-Correcting'}
          </span>
        )}
      </div>

      <div className="trace-card-body">
        {hasResult ? (
          isSuccess ? (
            <div className="trace-text-success">
              Verified: {result.message || `${result.itemCount ?? ''} items valid against frontend contracts.`}
            </div>
          ) : (
            <div className="trace-val-error-block">
              <div className="trace-text-warn">
                Validation failed ({result.errorCount || result.errors?.length || 1} issues):
              </div>
              {Array.isArray(result.errors) && (
                <ul className="trace-error-list custom-scrollbar">
                  {result.errors.map((err: string, i: number) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )
        ) : (
          <div className="trace-text-muted">
            Compiling and validating payload against schema...
          </div>
        )}

        {fileContent && (
          <div className="trace-payload-row">
            <button
              type="button"
              className="trace-link-btn"
              onClick={() => setShowPayload(!showPayload)}
            >
              {showPayload ? <FiChevronUp size={11} /> : <FiChevronDown size={11} />}
              <span>{showPayload ? 'Hide' : 'View'} payload (~{(fileContent.length / 1024).toFixed(1)} KB)</span>
            </button>
            {showPayload && (
              <div className="trace-payload-wrap">
                <button
                  type="button"
                  onClick={handleCopyPayload}
                  className="trace-copy-btn"
                  style={{ marginBottom: '0.25rem' }}
                >
                  {copiedPayload ? <><FiCheck size={11} /><span>Copied</span></> : <><FiCopy size={11} /><span>Copy</span></>}
                </button>
                <pre className="trace-payload-pre custom-scrollbar">
                  <code>{fileContent.substring(0, 2000)}{fileContent.length > 2000 ? `\n... [${fileContent.length - 2000} characters remaining]` : ''}</code>
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Statistical Test Card (run_statistical_test)
const StatisticalTestCard: React.FC<{
  args?: Record<string, any>;
  result?: any;
}> = ({ args, result }) => {
  const testType = args?.test_type || result?.test_type || 'Statistical Test';
  const pValue = result?.p_value !== undefined ? Number(result.p_value) : undefined;
  const isSignificant = pValue !== undefined ? pValue < 0.05 : undefined;

  return (
    <div className="trace-card">
      <div className="trace-card-header">
        <div className="trace-header-left">
          <FiActivity size={11} className="trace-icon-muted" />
          <span className="trace-tag">statistical_test</span>
          <code className="trace-inline-code">{testType}</code>
        </div>
        {isSignificant !== undefined && (
          <span className={isSignificant ? 'trace-pill-ok' : 'trace-pill-muted'}>
            {isSignificant ? 'p < 0.05' : 'p ≥ 0.05'}
          </span>
        )}
      </div>

      <div className="trace-card-body">
        {result ? (
          <div className="trace-stat-row">
            {result.statistic !== undefined && (
              <span><strong>stat:</strong> {typeof result.statistic === 'number' ? result.statistic.toFixed(4) : result.statistic}</span>
            )}
            {pValue !== undefined && (
              <span><strong>p-val:</strong> {pValue < 0.0001 ? '< 0.0001' : pValue.toFixed(4)}</span>
            )}
            {result.interpretation && (
              <span className="trace-text-muted">{result.interpretation}</span>
            )}
          </div>
        ) : (
          <span className="trace-text-muted">Computing hypothesis test...</span>
        )}
      </div>
    </div>
  );
};

// Dataset Dictionary Card (search_dataset_dictionary)
const DatasetDictionaryCard: React.FC<{
  args?: Record<string, any>;
  result?: any;
}> = ({ args, result }) => {
  const query = args?.query || '';
  return (
    <div className="trace-card">
      <div className="trace-card-header">
        <div className="trace-header-left">
          <FiSearch size={11} className="trace-icon-muted" />
          <span className="trace-tag">dataset_dictionary</span>
          <code className="trace-inline-code">"{query}"</code>
        </div>
      </div>
      {result && (
        <pre className="trace-output-body custom-scrollbar">
          <code>{JSON.stringify(result, null, 2)}</code>
        </pre>
      )}
    </div>
  );
};

// Generic Tool Card
const GenericToolCard: React.FC<{
  step: LiveExecutionStep;
}> = ({ step }) => {
  const isResult = step.type === 'function_result';
  return (
    <div className="trace-card">
      <div className="trace-card-header">
        <div className="trace-header-left">
          <FiZap size={11} className="trace-icon-muted" />
          <span className="trace-tag">{isResult ? 'tool_result' : 'tool_call'}</span>
          <code className="trace-inline-code">{step.functionName}</code>
        </div>
      </div>
      {step.functionArgs && (
        <pre className="trace-output-body custom-scrollbar">
          <code>{JSON.stringify(step.functionArgs, null, 2)}</code>
        </pre>
      )}
      {step.functionResult !== undefined && (
        <pre className="trace-output-body custom-scrollbar">
          <code>{JSON.stringify(step.functionResult, null, 2)}</code>
        </pre>
      )}
    </div>
  );
};

// Model Reasoning Card (Thoughts)
const ThoughtCard: React.FC<{ thought: string }> = ({ thought }) => {
  const text = thought.trim();
  const isEncryptedSig = !text || text.startsWith('El4K') || text.startsWith('EI4K') || text.startsWith('EvEF') || /^[A-Za-z0-9+/=_-]{35,}$/.test(text);
  const displayText = isEncryptedSig ? "Analyzing context and planning next execution step..." : text;

  return (
    <div className="trace-card">
      <div className="trace-card-header">
        <div className="trace-header-left">
          <FiMessageSquare size={11} className="trace-icon-muted" />
          <span className="trace-tag">reasoning</span>
        </div>
      </div>
      <div className="trace-card-body trace-thought-text">
        {displayText}
      </div>
    </div>
  );
};

// Model Output Commentary Card
const AgentOutputCard: React.FC<{ text: string }> = ({ text }) => {
  const content = text.trim();
  if (!content) return null;

  return (
    <div className="trace-card">
      <div className="trace-card-header">
        <div className="trace-header-left">
          <FiFileText size={11} className="trace-icon-muted" />
          <span className="trace-tag">output</span>
        </div>
      </div>
      <div className="trace-card-body trace-output-text custom-scrollbar">
        {content}
      </div>
    </div>
  );
};

// Grounded Search Card
const SearchCard: React.FC<{ step: LiveExecutionStep }> = ({ step }) => {
  return (
    <div className="trace-card">
      <div className="trace-card-header">
        <div className="trace-header-left">
          <FiSearch size={11} className="trace-icon-muted" />
          <span className="trace-tag">search</span>
          <span className="trace-meta-info">{step.text || 'Grounded Web Search'}</span>
        </div>
      </div>
      {step.citations && step.citations.length > 0 && (
        <div className="trace-card-body trace-citations-list">
          {step.citations.map((c, cIdx) => (
            <a
              key={cIdx}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="trace-citation-chip"
            >
              <span>{c.title || c.url}</span>
              <FiExternalLink size={10} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

// Milestone Status Line
const StatusMilestoneCard: React.FC<{ text?: string; timestamp: Date }> = ({ text, timestamp }) => {
  const timeStr = useMemo(() => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  }, [timestamp]);

  return (
    <div className="trace-milestone-line">
      <FiArrowRight size={10} className="trace-icon-muted" />
      <span className="trace-milestone-text">{text}</span>
      {timeStr && <span className="trace-milestone-time">{timeStr}</span>}
    </div>
  );
};

// Step Dispatcher
const StepItem: React.FC<{ step: LiveExecutionStep }> = ({ step }) => {
  if (step.type === 'code_execution_call') {
    return <CodeExecutionCard code={step.code || step.text || ''} />;
  }
  if (step.type === 'code_execution_result') {
    return <StandardOutputCard output={step.output || step.text || ''} />;
  }
  if (step.type === 'thought') {
    return <ThoughtCard thought={step.text || (step as any).thought || ''} />;
  }
  if (step.type === 'text') {
    return <AgentOutputCard text={step.text || ''} />;
  }
  if (step.type === 'function_call' || step.type === 'function_result') {
    const fnName = step.functionName || '';
    if (fnName === 'execute_bash') {
      if (step.type === 'function_call') {
        const cmd = step.functionArgs?.command || step.code || step.text || '';
        return <CodeExecutionCard code={cmd} />;
      } else {
        const out = (step.functionResult?.output !== undefined)
          ? step.functionResult.output
          : (typeof step.functionResult === 'string' ? step.functionResult : (step.output || step.text || ''));
        return <StandardOutputCard output={out} />;
      }
    }
    if (fnName === 'parse_final_output') {
      return <ParseFinalOutputCard args={step.functionArgs} result={step.functionResult} />;
    }
    if (fnName === 'run_statistical_test') {
      return <StatisticalTestCard args={step.functionArgs} result={step.functionResult} />;
    }
    if (fnName === 'search_dataset_dictionary') {
      return <DatasetDictionaryCard args={step.functionArgs} result={step.functionResult} />;
    }
    return <GenericToolCard step={step} />;
  }
  if (step.type === 'google_search' || step.type === 'url_context') {
    return <SearchCard step={step} />;
  }
  if (step.type === 'status') {
    return <StatusMilestoneCard text={step.text} timestamp={step.timestamp} />;
  }
  if (step.type === 'image_output' && step.imageOutput) {
    return (
      <div className="trace-card">
        <div className="trace-card-header">
          <div className="trace-header-left">
            <FiImage size={11} className="trace-icon-muted" />
            <span className="trace-tag">image</span>
          </div>
        </div>
        <div className="trace-card-body">
          <img
            src={step.imageOutput.url || `data:${step.imageOutput.mimeType || 'image/png'};base64,${step.imageOutput.data}`}
            alt="Output"
            className="trace-image-preview"
          />
        </div>
      </div>
    );
  }
  return null;
};

// ==========================================
// 2. Main Agent Panel
// ==========================================

export interface AgentPanelConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  steps: LiveExecutionStep[];
  isRunning: boolean;
  emptyText: string;
}

export const AgentPanel: React.FC<{
  config: AgentPanelConfig;
  autoScroll?: boolean;
}> = ({ config, autoScroll = true }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && contentRef.current) {
      const el = contentRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [config.steps.length, autoScroll]);

  return (
    <div className="agent-panel">
      <div className="agent-panel-header">
        <div className="agent-panel-title-area">
          <span className="agent-panel-icon">{config.icon}</span>
          <h3 className="agent-panel-title">{config.title}</h3>
        </div>
        <div className="agent-panel-badges">
          {config.isRunning ? (
            <span className="agent-running-tag">
              <LoadingSpinner inline />
              <span>Running</span>
            </span>
          ) : config.steps.length > 0 ? (
            <span className="agent-count-tag">{config.steps.length}</span>
          ) : null}
        </div>
      </div>

      <div ref={contentRef} className="agent-panel-content custom-scrollbar">
        {config.steps.length === 0 ? (
          <div className="agent-panel-empty">{config.emptyText}</div>
        ) : (
          config.steps.map((step, idx) => (
            <StepItem key={step.id || idx} step={step} />
          ))
        )}
      </div>
    </div>
  );
};

// ==========================================
// 3. Top-Level AgentTraceView
// ==========================================

export interface AgentTraceViewProps {
  steps: LiveExecutionStep[];
  isAnalyzing: boolean;
  error?: string | null;
  enabledTabs?: AnalysisTabType[];
}

export const AgentTraceView: React.FC<AgentTraceViewProps> = ({
  steps,
  isAnalyzing,
  error: _error,
  enabledTabs = ['Visualizations', 'Anomalies', 'Forecasting'],
}) => {
  // 1. Data Cleaning
  const dataCleaningSteps = useMemo(() => {
    return steps.filter(s => {
      const st = (s.stage || '').toLowerCase();
      return st.includes('clean') || st.includes('profil') || st.includes('data science agent');
    });
  }, [steps]);

  // 2. Visualizations
  const vizSteps = useMemo(() => {
    return steps.filter(s => {
      const st = (s.stage || '').toLowerCase();
      return (st.includes('visual') || st.includes('chart')) && !st.includes('clean');
    });
  }, [steps]);

  // 3. Anomalies
  const anomalySteps = useMemo(() => {
    return steps.filter(s => {
      const st = (s.stage || '').toLowerCase();
      return st.includes('anomal') || st.includes('outlier');
    });
  }, [steps]);

  // 4. Forecasting
  const forecastSteps = useMemo(() => {
    return steps.filter(s => {
      const st = (s.stage || '').toLowerCase();
      return (st.includes('forecast') || st.includes('model') || st.includes('predict')) && !st.includes('clean');
    });
  }, [steps]);

  const latestStage = (steps[steps.length - 1]?.stage || '').toLowerCase();
  const isCleaningRunning = isAnalyzing && (steps.length === 0 || latestStage.includes('clean') || latestStage.includes('profil') || latestStage.includes('data science agent'));
  const isVizRunning = isAnalyzing && (latestStage.includes('visual') || latestStage.includes('chart')) && !latestStage.includes('clean');
  const isAnomalyRunning = isAnalyzing && (latestStage.includes('anomal') || latestStage.includes('outlier'));
  const isForecastRunning = isAnalyzing && (latestStage.includes('forecast') || latestStage.includes('model') || latestStage.includes('predict')) && !latestStage.includes('clean');

  const hasForecasting = enabledTabs.includes('Forecasting');
  const hasAnomalies = enabledTabs.includes('Anomalies');
  const hasViz = enabledTabs.includes('Visualizations');

  const cleaningConfig: AgentPanelConfig = {
    id: 'cleaning',
    title: 'Data Cleaning',
    icon: <FiTerminal size={13} className="trace-icon-muted" />,
    steps: dataCleaningSteps,
    isRunning: isCleaningRunning,
    emptyText: isAnalyzing ? 'Initializing container and profiling data...' : 'No cleaning steps.',
  };

  const vizConfig: AgentPanelConfig = {
    id: 'visualizations',
    title: 'Visualizations',
    icon: <FiBarChart2 size={13} className="trace-icon-muted" />,
    steps: vizSteps,
    isRunning: isVizRunning,
    emptyText: isAnalyzing ? 'Waiting for cleaned data slices...' : 'No visualization steps.',
  };

  const anomalyConfig: AgentPanelConfig = {
    id: 'anomalies',
    title: 'Anomalies',
    icon: <FiActivity size={13} className="trace-icon-muted" />,
    steps: anomalySteps,
    isRunning: isAnomalyRunning,
    emptyText: isAnalyzing ? 'Waiting for cleaned data...' : 'No anomaly steps.',
  };

  const forecastConfig: AgentPanelConfig = {
    id: 'forecasting',
    title: 'Forecasting',
    icon: <FiTrendingUp size={13} className="trace-icon-muted" />,
    steps: forecastSteps,
    isRunning: isForecastRunning,
    emptyText: isAnalyzing ? 'Waiting for cleaned dataset...' : 'No forecasting steps.',
  };

  return (
    <div className="agent-trace-page-container">
      <style>{`
        .agent-trace-page-container {
          height: 100%;
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          overflow: hidden;
          box-sizing: border-box;
          background: #000000;
        }

        /* Body & Grid */
        .agent-trace-body {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .agent-trace-grid {
          height: 100%;
          flex: 1;
          min-height: 0;
          display: grid;
          gap: 0.45rem;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        }

        /* Panel */

        /* Panel */
        .agent-panel {
          display: flex;
          flex-direction: column;
          min-height: 0;
          height: 100%;
          background: var(--card-bg-color, #090909);
          border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
          border-radius: var(--border-radius-sm, 8px);
          overflow: hidden;
          box-sizing: border-box;
        }

        .agent-panel-header {
          padding: 0.45rem 0.75rem;
          background: #000000;
          border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .agent-panel-title-area {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .agent-panel-icon {
          display: flex;
          align-items: center;
        }

        .agent-panel-title {
          margin: 0;
          font-size: 0.76rem;
          font-weight: 600;
          color: var(--text-color, #FCFCFC);
        }

        .agent-panel-badges {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .agent-running-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.65rem;
          color: var(--accent-blue, #0169CC);
        }

        .agent-count-tag {
          font-size: 0.63rem;
          color: var(--text-tertiary-color, #666);
          font-family: var(--font-family-monospace, monospace);
        }

        .agent-panel-content {
          flex: 1;
          min-height: 0;
          overflow-y: auto !important;
          overflow-x: hidden;
          padding: 0.5rem 0.65rem;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .agent-panel-content > * {
          flex-shrink: 0 !important;
        }

        .agent-panel-empty {
          color: var(--text-tertiary-color, #666);
          font-size: 0.72rem;
          padding: 2.5rem 1rem;
          text-align: center;
          margin: auto 0;
        }

        /* Generic Clean Card */
        .trace-card {
          width: 100%;
          box-sizing: border-box;
          background: #000000;
          border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
          border-radius: 6px;
          overflow: hidden;
        }

        .trace-card-header {
          padding: 0.28rem 0.55rem;
          background: #040404;
          border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .trace-header-left {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-wrap: wrap;
        }

        .trace-icon-muted {
          color: var(--text-tertiary-color, #666);
        }

        .trace-tag {
          font-size: 0.62rem;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-secondary-color, #888);
          letter-spacing: 0.02em;
        }

        .trace-meta-info {
          font-size: 0.64rem;
          color: var(--text-tertiary-color, #666);
        }

        .trace-inline-code {
          font-family: var(--font-family-monospace, monospace);
          font-size: 0.66rem;
          color: var(--text-secondary-color, #AAA);
        }

        .trace-pill-ok {
          font-size: 0.62rem;
          color: var(--accent-green, #00E676);
          font-family: var(--font-family-monospace, monospace);
        }

        .trace-pill-warn {
          font-size: 0.62rem;
          color: var(--accent-pink, #FF4081);
          font-family: var(--font-family-monospace, monospace);
        }

        .trace-pill-muted {
          font-size: 0.62rem;
          color: var(--text-tertiary-color, #666);
          font-family: var(--font-family-monospace, monospace);
        }

        .trace-copy-btn {
          background: transparent;
          border: none;
          color: var(--text-tertiary-color, #666);
          font-size: 0.65rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
          padding: 0.1rem 0.25rem;
          border-radius: 3px;
        }

        .trace-copy-btn:hover {
          color: var(--text-color, #FCFCFC);
        }

        .trace-code-body {
          margin: 0;
          padding: 0.5rem 0.65rem !important;
          font-family: var(--font-family-monospace, monospace);
          font-size: 0.71rem;
          line-height: 1.42;
          max-height: 240px;
          overflow-y: auto;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-word;
          background: transparent !important;
          color: #e6edf3;
        }

        .trace-code-body code,
        .trace-code-body .hljs {
          background: transparent !important;
          box-shadow: none !important;
          outline: none !important;
        }

        .trace-code-body .hljs-keyword,
        .trace-code-body .hljs-operator { color: #ff7b72 !important; }
        .trace-code-body .hljs-string { color: #a5d6ff !important; }
        .trace-code-body .hljs-title,
        .trace-code-body .hljs-function { color: #d2a8ff !important; }
        .trace-code-body .hljs-comment { color: #8b949e !important; font-style: italic; }
        .trace-code-body .hljs-number { color: #79c0ff !important; }
        .trace-code-body .hljs-built_in { color: #ffa657 !important; }

        .trace-output-body {
          margin: 0;
          padding: 0.5rem 0.65rem;
          font-family: var(--font-family-monospace, monospace);
          font-size: 0.71rem;
          line-height: 1.42;
          color: var(--text-secondary-color, #9E9E9E);
          max-height: 180px;
          overflow-y: auto;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-word;
          background: transparent;
        }

        .trace-output-body.text-error {
          color: #FF8A80;
        }

        .trace-card-body {
          padding: 0.45rem 0.65rem;
          font-size: 0.72rem;
          color: var(--text-secondary-color, #9E9E9E);
          line-height: 1.4;
        }

        .trace-text-success {
          color: var(--accent-green, #00E676);
          font-size: 0.72rem;
        }

        .trace-text-warn {
          color: var(--accent-pink, #FF4081);
          font-size: 0.72rem;
          font-weight: 500;
        }

        .trace-text-muted {
          color: var(--text-tertiary-color, #777);
          font-size: 0.7rem;
        }

        .trace-val-error-block {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .trace-error-list {
          margin: 0.15rem 0 0 1rem;
          padding: 0;
          font-size: 0.68rem;
          color: #FF8A80;
          max-height: 100px;
          overflow-y: auto;
        }

        .trace-error-list li {
          margin-bottom: 0.12rem;
        }

        .trace-payload-row {
          margin-top: 0.35rem;
          border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.05));
          padding-top: 0.3rem;
        }

        .trace-link-btn {
          background: transparent;
          border: none;
          color: var(--text-tertiary-color, #777);
          font-size: 0.66rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
          padding: 0;
        }

        .trace-link-btn:hover {
          color: var(--text-color, #FCFCFC);
        }

        .trace-payload-wrap {
          margin-top: 0.25rem;
        }

        .trace-payload-pre {
          margin: 0;
          padding: 0.4rem;
          background: #040404;
          border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
          border-radius: 4px;
          font-family: var(--font-family-monospace, monospace);
          font-size: 0.68rem;
          max-height: 140px;
          overflow-y: auto;
          color: var(--text-secondary-color, #888);
        }

        .trace-stat-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          align-items: center;
          font-family: var(--font-family-monospace, monospace);
          font-size: 0.7rem;
        }

        .trace-thought-text {
          font-size: 0.72rem;
          color: var(--text-secondary-color, #AAA);
          line-height: 1.42;
          white-space: pre-wrap;
        }

        .trace-output-text {
          font-size: 0.71rem;
          color: var(--text-color, #DDD);
          line-height: 1.42;
          white-space: pre-wrap;
          font-family: var(--font-family-monospace, monospace);
          max-height: 200px;
          overflow-y: auto;
        }

        .trace-citations-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }

        .trace-citation-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
          padding: 0.12rem 0.35rem;
          background: #040404;
          border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
          border-radius: 4px;
          color: var(--text-secondary-color, #9E9E9E);
          text-decoration: none;
          font-size: 0.66rem;
        }

        .trace-citation-chip:hover {
          color: var(--text-color, #FCFCFC);
        }

        .trace-milestone-line {
          width: 100%;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.35rem;
          font-size: 0.68rem;
          color: var(--text-tertiary-color, #777);
          padding: 0.15rem 0;
        }

        .trace-milestone-text {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: var(--text-secondary-color, #888);
        }

        .trace-milestone-time {
          font-size: 0.61rem;
          color: var(--text-tertiary-color, #555);
          font-family: var(--font-family-monospace, monospace);
        }

        .trace-image-preview {
          max-width: 100%;
          max-height: 180px;
          border-radius: 4px;
          border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
        }

        /* ========================================================= */
        /* LIGHT MODE COMPLETE STYLING                              */
        /* ========================================================= */
        [data-theme="light"] .agent-trace-page-container {
          background: #f8f9fa !important;
        }

        [data-theme="light"] .agent-panel {
          background: #ffffff !important;
          border-color: rgba(0, 0, 0, 0.09) !important;
        }

        [data-theme="light"] .agent-panel-header {
          background: #fbfbfb !important;
          border-bottom-color: rgba(0, 0, 0, 0.07) !important;
        }

        [data-theme="light"] .agent-panel-title {
          color: #111827 !important;
        }

        [data-theme="light"] .trace-card {
          background: #ffffff !important;
          border-color: rgba(0, 0, 0, 0.08) !important;
        }

        [data-theme="light"] .trace-card-header {
          background: #f9fafb !important;
          border-bottom-color: rgba(0, 0, 0, 0.06) !important;
        }

        [data-theme="light"] .trace-code-body {
          color: #1f2328 !important;
        }

        [data-theme="light"] .trace-output-body {
          color: #374151 !important;
        }

        [data-theme="light"] .trace-output-text {
          color: #111827 !important;
        }

        [data-theme="light"] .trace-thought-text {
          color: #374151 !important;
        }

        [data-theme="light"] .trace-payload-pre {
          background: #f9fafb !important;
          border-color: rgba(0, 0, 0, 0.08) !important;
          color: #374151 !important;
        }

        [data-theme="light"] .trace-citation-chip {
          background: #f3f4f6 !important;
          border-color: rgba(0, 0, 0, 0.08) !important;
          color: #4b5563 !important;
        }

        @media (max-width: 1024px) {
          .agent-trace-grid {
            grid-template-columns: 1fr;
          }
          .agent-panel {
            min-height: 280px;
          }
        }
      `}</style>

      {/* Main Body */}
      <div className="agent-trace-body">
        <div className="agent-trace-grid">
          <AgentPanel config={cleaningConfig} />
          {hasViz && <AgentPanel config={vizConfig} />}
          {hasAnomalies && <AgentPanel config={anomalyConfig} />}
          {hasForecasting && <AgentPanel config={forecastConfig} />}
        </div>
      </div>
    </div>
  );
};
