import type { LiveExecutionStep } from '../types';

export type AgentTraceSessionStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AgentTraceSession {
  id: string;
  title: string;
  stage: string;
  status: AgentTraceSessionStatus;
  startTime?: Date;
  endTime?: Date;
  steps: LiveExecutionStep[];
  error?: string;
}

export interface AgentTraceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStage?: string;
  isAnalyzing?: boolean;
  status?: AgentTraceSessionStatus;
  steps: LiveExecutionStep[];
  error?: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}
