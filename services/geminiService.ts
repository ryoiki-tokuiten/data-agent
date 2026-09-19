import { GoogleGenAI } from "@google/genai";
import type {
  RawDataInput,
  VisualizationRequest,
  VisualizationGenerationResult,
  ChartSpec,
  SupportedChartType,
  AnomalyReport,
  ForecastingReport,
  ForecastingModelDetail,
  ForecastingModelProposal,
  LiveExecutionStep,
  DataCleaningReportResult
} from '../types';
import { SUPPORTED_CHART_TYPES, DEFAULT_MODEL_ID } from '../constants';
import {
  GET_DATA_CLEANING_REPORT_SYSTEM_PROMPT,
  DETECT_ANOMALIES_SYSTEM_PROMPT,
  GENERATE_VISUALIZATIONS_SYSTEM_PROMPT,
  GET_FORECASTING_REPORT_SYSTEM_PROMPT_PHASE1_PROPOSAL,
  GET_FORECASTING_REPORT_SYSTEM_PROMPT_PHASE2_CODE_EXEC,
  GET_MODEL_INSIGHT_SYSTEM_PROMPT,
} from '../prompts';
import {
  DATA_SCIENCE_FUNCTION_TOOLS,
  executeRegisteredFunction,
  getValidatedOutput,
  clearValidatedOutput
} from './functionTools';

function deduplicateTools(toolList?: any[]): any[] | undefined {
  if (!toolList || toolList.length === 0) return undefined;
  const seen = new Set<string>();
  const deduped: any[] = [];
  for (const t of toolList) {
    const key = t.name || t.function?.name || t.type;
    if (!key || !seen.has(key)) {
      if (key) seen.add(key);
      deduped.push(t);
    }
  }
  return deduped;
}

export class GeminiError extends Error {
  public type: string;
  public details?: string;
  public suggestion?: string;
  public isRetryable: boolean;

  constructor(message: string, type: string = "GeminiProcessingError", details?: string, suggestion?: string, isRetryable: boolean = false) {
    super(message);
    this.name = "GeminiError";
    this.type = type;
    this.details = details;
    this.suggestion = suggestion;
    this.isRetryable = isRetryable;
  }
}

export interface InteractionExecutionResult {
  id: string;
  outputText: string;
  executedPythonCode: string;
  executionLog: string;
  steps: any[];
  citations?: Array<{ title: string; url: string }>;
  outputImages?: Array<{ data: string; mimeType: string; url?: string }>;
}


export class GeminiService {
  public ai: GoogleGenAI;

  private cachedUploadedFiles: Array<{ name: string; content: string }> = [];
  private cachedInputParts: any[] = [];

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("API Key is required to initialize GeminiService.");
    }
    // Sanitize API key: trim whitespace and strip any accidental quotes
    const sanitizedKey = apiKey.trim().replace(/^['"]|['"]$/g, '').trim();
    this.ai = new GoogleGenAI({ apiKey: sanitizedKey });
  }

  private activeRunId: string = 'default';

  public setActiveRunId(runId: string) {
    this.activeRunId = runId;
    if (typeof window !== 'undefined') {
      (window as any).__activeRunId = runId;
    }
  }

  public getActiveRunId(): string {
    return this.activeRunId;
  }

  public setCachedFiles(files: Array<{ name: string; content: string }>) {
    this.cachedUploadedFiles = files;
  }

  public getCachedFiles(): Array<{ name: string; content: string }> {
    return this.cachedUploadedFiles;
  }

  public setCachedInputParts(parts: any[]) {
    this.cachedInputParts = parts;
  }

  public getCachedInputParts(): any[] {
    return this.cachedInputParts;
  }

  public extractAndCacheFilesFromParts(parts: any[]) {
    this.cachedUploadedFiles = [];
    for (const part of parts) {
      if (part?.fileData?.displayName) {
        this.cachedUploadedFiles.push({ name: part.fileData.displayName, content: '' });
      }
    }
  }

  public generateFilesystemBootstrapPython(): string {
    return `import os, shutil, glob
import pandas as pd
import numpy as np

# Ensure clean directory structure for data science workspace
for d in ['user_uploaded', 'slices', 'visualization', 'anomalies', 'forecasting']:
    os.makedirs(d, exist_ok=True)
`;
  }

  /**
   * Executes a bash command on the local backend server (http://localhost:3001/api/bash).
   * Automatically capped to 8,000 tokens.
   */
  public static async executeLocalBash(command: string, runId?: string): Promise<{ output: string; stdout: string; stderr: string; exitCode: number }> {
    const backendUrl = 'http://localhost:3001/api/bash';
    const effectiveRunId = runId || (typeof window !== 'undefined' && (window as any).__activeRunId) || 'default';
    try {
      const resp = await fetch(backendUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-run-id': effectiveRunId
        },
        body: JSON.stringify({ command, runId: effectiveRunId })
      });
      if (!resp.ok) {
        throw new Error(`Backend bash execution failed with status ${resp.status}`);
      }
      return await resp.json();
    } catch (err: any) {
      console.error('[GeminiService] Error calling local bash endpoint:', err);
      return {
        output: `Error executing bash command: ${err.message}`,
        stdout: '',
        stderr: err.message,
        exitCode: 1
      };
    }
  }

  /**
   * Uploads a file/blob directly to our local backend server workspace.
   */
  public async uploadFile(
    file: File | Blob,
    onStatusUpdate?: (status: string) => void,
    runId?: string
  ): Promise<{ name: string; relativePath: string; size: number }> {
    try {
      const effectiveRunId = runId || this.activeRunId || (typeof window !== 'undefined' && (window as any).__activeRunId) || 'default';
      const fileDisplayName = file instanceof File ? file.name : 'file';
      const fileSizeMB = ((file.size || 0) / (1024 * 1024)).toFixed(2);
      onStatusUpdate?.(`Saving ${fileDisplayName} (${fileSizeMB} MB) to workspace [${effectiveRunId}]...`);

      const formData = new FormData();
      formData.append('files', file);

      const resp = await fetch(`http://localhost:3001/api/files/upload?runId=${encodeURIComponent(effectiveRunId)}`, {
        method: 'POST',
        headers: {
          'x-run-id': effectiveRunId
        },
        body: formData
      });

      if (!resp.ok) {
        throw new Error(`Failed to upload file to backend workspace: HTTP ${resp.status}`);
      }

      const resJson = await resp.json();
      const uploadedFile = resJson.files?.[0];

      onStatusUpdate?.(`File saved to workspace: ${uploadedFile?.name || fileDisplayName}`);

      return {
        name: uploadedFile?.name || fileDisplayName,
        relativePath: uploadedFile?.relativePath || fileDisplayName,
        size: uploadedFile?.size || (file.size || 0)
      };
    } catch (err) {
      console.error(`[GeminiService] Local file upload failed for ${file instanceof File ? file.name : 'file'}:`, err);
      throw err;
    }
  }

  /**
   * Formats prompt input for Interactions API as a clean text string describing workspace files and tasks.
   */
  public formatInputForInteractions(userParts: any[], prependedText?: string, appendedText?: string): string {
    const textPieces: string[] = [];
    if (prependedText && prependedText.trim() !== '') {
      textPieces.push(prependedText.trim());
    }

    for (const part of userParts) {
      if (!part) continue;
      if (typeof part === 'string' && part.trim() !== '') {
        textPieces.push(part.trim());
      } else if (part.name) {
        textPieces.push(`Active dataset file in workspace: "${part.name}" (${((part.size || 0) / 1024).toFixed(1)} KB).`);
      } else if (part.fileData?.displayName) {
        textPieces.push(`Active dataset file in workspace: "${part.fileData.displayName}".`);
      } else if (part.text && part.text.trim() !== '') {
        textPieces.push(part.text.trim());
      }
    }

    if (appendedText && appendedText.trim() !== '') {
      textPieces.push(appendedText.trim());
    }

    return textPieces.join('\n\n');
  }

  /**
   * Unwraps nested and masked error messages from @google/genai SDK,
   * specifically extracting the underlying server message when Google returns
   * array errors like [{ error: { code: 400, message: "API key not valid..." } }].
   */
  public static unwrapGoogleError(error: any): { message: string; isAuthError: boolean; isBadRequest: boolean } {
    if (!error) return { message: 'Unknown error', isAuthError: false, isBadRequest: false };

    const candidates: any[] = [
      error?.cause?.body,
      error?.body,
      error?.data$,
      error?.cause?.data$,
      error?.response?.body,
      error?.cause?.message,
      error?.message
    ];

    let detailedMessage = '';

    for (const c of candidates) {
      if (!c) continue;
      if (typeof c === 'string') {
        try {
          const parsed = JSON.parse(c);
          const target = Array.isArray(parsed) ? parsed[0] : parsed;
          if (target?.error?.message) {
            detailedMessage = target.error.message;
            break;
          }
        } catch (_) {
          if (!c.includes('httpMeta') && c.length > 5 && !detailedMessage) {
            detailedMessage = c;
          }
        }
      } else if (typeof c === 'object') {
        const target = Array.isArray(c) ? c[0] : c;
        if (target?.error?.message) {
          detailedMessage = target.error.message;
          break;
        }
      }
    }

    const rawMsg = detailedMessage || error?.message || 'Gemini API call failed';
    const isAuthError =
      rawMsg.includes('API_KEY_INVALID') ||
      rawMsg.includes('API key not valid') ||
      rawMsg.includes('PERMISSION_DENIED') ||
      rawMsg.includes('UNAUTHENTICATED') ||
      error?.status === 401 ||
      error?.status === 403;

    const isBadRequest = error?.status === 400 || rawMsg.includes('INVALID_ARGUMENT') || rawMsg.includes('BadRequestError');

    let friendlyMessage = rawMsg;
    if (isAuthError) {
      friendlyMessage = `Invalid Gemini API Key: ${rawMsg}. Please check that your key was copied from Google AI Studio (https://aistudio.google.com/app/apikey).`;
    }

    return { message: friendlyMessage, isAuthError, isBadRequest };
  }

  private async withRetry<T>(
    apiCall: () => Promise<T>,
    context: string
  ): Promise<T> {
    try {
      return await apiCall();
    } catch (error: any) {
      const { message: unwrappedMessage, isAuthError } = GeminiService.unwrapGoogleError(error);

      if (isAuthError) {
        console.error(`[${context}] Authentication error: ${unwrappedMessage}`);
        throw new GeminiError(unwrappedMessage, 'AuthenticationError', undefined, 'Verify your Gemini API key in Google AI Studio', false);
      }

      const isRateLimitError =
        error?.status === 429 ||
        unwrappedMessage.includes('RESOURCE_EXHAUSTED') ||
        unwrappedMessage.includes('429') ||
        unwrappedMessage.includes('rate limit') ||
        unwrappedMessage.includes('quota');

      if (isRateLimitError) {
        console.warn(`[${context}] Rate limit encountered. Retrying once in 5000ms...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return await apiCall();
      }

      // Fail fast immediately on any client error, duplicate tool, bad request, or stream error
      console.error(`[${context}] Request failed: ${unwrappedMessage}`);
      throw (error instanceof GeminiError) ? error : new GeminiError(unwrappedMessage, 'GeminiApiError', error?.stack, undefined, false);
    }
  }

  /**
   * Helper to execute an interaction via Interactions API with streaming or non-streaming
   * and server-side code execution enabled. Emits LiveExecutionStep events for transparency.
   */
  async runInteraction(params: {
    model: string;
    input: any;
    systemInstruction?: string;
    tools?: Array<any>;
    responseMimeType?: string;
    previousInteractionId?: string;
    onProgress?: (step: LiveExecutionStep) => void;
    stageName?: string;
    datasetContext?: any;
  }, context: string): Promise<InteractionExecutionResult> {
    const effectiveModel = params.model || DEFAULT_MODEL_ID;
    // By default, provide code_execution for data analysis and sandbox computations.
    // Avoid mixing incompatible tools (e.g. url_context or search + code_execution) which triggers 400.
    const defaultTools: any[] = DATA_SCIENCE_FUNCTION_TOOLS;
    const tools = deduplicateTools(params.tools !== undefined ? params.tools : defaultTools);
    const stageName = params.stageName || context;

    return await this.withRetry(async () => {
      // Announce stage start in agent trace
      params.onProgress?.({
        id: `init-${Date.now()}`,
        stage: stageName,
        type: 'thought',
        text: `Starting ${stageName} using model ${effectiveModel}...`,
        timestamp: new Date()
      });

      const prevId = (typeof params.previousInteractionId === 'string' && params.previousInteractionId.trim().length > 0)
        ? params.previousInteractionId.trim()
        : undefined;

      let currentInteractionId = prevId;
      let fullText = '';
      let accumulatedCode = '';
      let accumulatedLog = '';
      const rawSteps: any[] = [];
      let currentInput: any = params.input;
      let turnCount = 0;
      const MAX_TURNS = 50;

      while (turnCount < MAX_TURNS) {
        turnCount++;
        let interactionId = '';
        let currentTextStepId: string | null = null;
        let currentTextBuffer = '';
        let lastFlushedLength = 0;

        const emitOrUpdateTextStep = (force: boolean = false) => {
          const trimmed = currentTextBuffer.trim();
          if (!trimmed) return;
          if (!force && trimmed.length - lastFlushedLength < 15) return;
          if (!currentTextStepId) {
            currentTextStepId = `${interactionId || 'stream'}-text-${Date.now()}`;
          }
          lastFlushedLength = trimmed.length;
          params.onProgress?.({
            id: currentTextStepId,
            stage: stageName,
            type: 'text',
            text: trimmed,
            timestamp: new Date()
          });
        };

        const finalizeTextStep = () => {
          if (currentTextStepId && currentTextBuffer.trim()) {
            params.onProgress?.({
              id: currentTextStepId,
              stage: stageName,
              type: 'text',
              text: currentTextBuffer.trim(),
              timestamp: new Date()
            });
          }
          currentTextStepId = null;
          currentTextBuffer = '';
          lastFlushedLength = 0;
        };

        const stream = await this.ai.interactions.create({
          model: effectiveModel,
          input: currentInput,
          system_instruction: turnCount === 1 ? params.systemInstruction : undefined,
          tools: tools && tools.length > 0 ? (tools as any) : undefined,
          stream: true,
          previous_interaction_id: currentInteractionId,
        });

        let functionCallRequested: { id: string; name: string; arguments: any } | null = null;
        let deltaArgumentsString = '';

        for await (const rawEvent of (stream as any)) {
          const event: any = rawEvent;
          if (event.interaction?.id) {
            interactionId = event.interaction.id;
            currentInteractionId = event.interaction.id;
          }

          if (event.interaction?.output_text && !fullText) {
            fullText = event.interaction.output_text;
          }

          // Check for stream error event - throw immediately
          if (event.event_type === 'error' || event.type === 'error') {
            finalizeTextStep();
            console.error(`[${context}] Interactions stream error event:`, event.error);
            throw new GeminiError(event.error?.message || 'Interactions stream error', 'StreamError', JSON.stringify(event.error));
          }

          if (event.event_type === 'step.start' && event.step?.type === 'function_call') {
            finalizeTextStep();
            functionCallRequested = {
              id: event.step.id || `call_${Date.now()}`,
              name: event.step.name || '',
              arguments: event.step.arguments || {}
            };
          }

          const delta = event.delta;
          if (delta) {
            if (delta.arguments) {
              deltaArgumentsString += (typeof delta.arguments === 'string' ? delta.arguments : JSON.stringify(delta.arguments));
            }
            if (delta.type === 'text' || delta.content) {
              const textVal = delta.text || (typeof delta.content === 'string' ? delta.content : '');
              if (textVal) {
                fullText += textVal;
                currentTextBuffer += textVal;
                emitOrUpdateTextStep(false);
              }
            }

            if (delta.type === 'thought_summary' || delta.type === 'thought_signature' || delta.type === 'thought') {
              const thoughtText = delta.content?.text || delta.text || delta.thought || delta.summary || '';
              const isEncryptedSig = !thoughtText || thoughtText.startsWith('El4K') || thoughtText.startsWith('EI4K') || thoughtText.startsWith('EvEF') || /^[A-Za-z0-9+/=_-]{35,}$/.test(thoughtText.trim());
              const displayedThought = isEncryptedSig ? 'Analyzing dataset and formulating plan...' : thoughtText;
              params.onProgress?.({
                id: `${interactionId || 'step'}-thought-${event.index ?? 0}`,
                stage: stageName,
                type: 'thought',
                text: displayedThought,
                timestamp: new Date()
              });
            }
          }

          if (event.step) {
            rawSteps.push(event.step);
          }

          if (event.interaction?.steps) {
            for (const s of event.interaction.steps) {
              rawSteps.push(s);
              if (s.type === 'function_call' && !functionCallRequested) {
                functionCallRequested = {
                  id: s.id || s.call_id || `call_${Date.now()}`,
                  name: s.name || '',
                  arguments: s.arguments || {}
                };
              }
            }
          }
        }

        finalizeTextStep();

        if (functionCallRequested && deltaArgumentsString && (!functionCallRequested.arguments || Object.keys(functionCallRequested.arguments).length === 0)) {
          try {
            functionCallRequested.arguments = JSON.parse(deltaArgumentsString);
          } catch {
            functionCallRequested.arguments = { command: deltaArgumentsString };
          }
        }

        // If no function call requested, model is finished!
        if (!functionCallRequested) {
          break;
        }

        const fcName = functionCallRequested.name;
        const fcArgs = functionCallRequested.arguments || {};
        const callId = functionCallRequested.id;

        let toolOutputText = '';

        if (fcName === 'execute_bash') {
          const bashCmd = fcArgs.command || '';
          accumulatedCode += (accumulatedCode ? '\n\n' : '') + bashCmd;

          params.onProgress?.({
            id: `${interactionId}-fc-${Date.now()}`,
            stage: stageName,
            type: 'function_call',
            functionName: 'execute_bash',
            functionArgs: { command: bashCmd },
            text: `Running: ${bashCmd}`,
            timestamp: new Date()
          });

          const bashRes = await GeminiService.executeLocalBash(bashCmd);
          toolOutputText = bashRes.output;
          accumulatedLog += (accumulatedLog ? '\n' : '') + toolOutputText;

          params.onProgress?.({
            id: `${interactionId}-fr-${Date.now()}`,
            stage: stageName,
            type: 'function_result',
            functionName: 'execute_bash',
            functionResult: { output: toolOutputText, exitCode: bashRes.exitCode },
            text: toolOutputText.slice(0, 1000),
            timestamp: new Date()
          });
        } else {
          // Custom tool function from functionTools
          try {
            const execResult = await executeRegisteredFunction(fcName, fcArgs, params.datasetContext);
            toolOutputText = JSON.stringify(execResult);
            params.onProgress?.({
              id: `${interactionId}-fr-${Date.now()}`,
              stage: stageName,
              type: 'function_result',
              functionName: fcName,
              functionArgs: fcArgs,
              functionResult: execResult,
              timestamp: new Date()
            });
          } catch (fcErr: any) {
            toolOutputText = JSON.stringify({ error: fcErr.message || String(fcErr) });
          }
        }

        // Prepare input for next turn with function_result
        currentInput = [
          {
            type: 'function_result',
            name: fcName,
            call_id: callId,
            result: [
              { type: 'text', text: toolOutputText }
            ]
          }
        ];
      }

      const { citations, outputImages } = this.extractCitationsAndImages(rawSteps);

      params.onProgress?.({
        id: `${currentInteractionId || 'final'}-completed-${Date.now()}`,
        stage: stageName,
        type: 'status',
        text: `Completed ${stageName} successfully.`,
        timestamp: new Date()
      });

      return {
        id: currentInteractionId || '',
        outputText: fullText,
        executedPythonCode: accumulatedCode,
        executionLog: accumulatedLog,
        steps: rawSteps,
        citations,
        outputImages
      };
    }, context);
  }

  /**
   * Helper to extract citations and multimodal images from interaction steps
   */
  public extractCitationsAndImages(steps: any[]): {
    citations: Array<{ title: string; url: string }>;
    outputImages: Array<{ data: string; mimeType: string; url?: string }>;
  } {
    const citationsMap = new Map<string, string>();
    const outputImages: Array<{ data: string; mimeType: string; url?: string }> = [];

    if (!Array.isArray(steps)) return { citations: [], outputImages: [] };

    for (const step of steps) {
      if (Array.isArray(step?.annotations)) {
        for (const ann of step.annotations) {
          if (ann.type === 'url_citation' && ann.url) {
            citationsMap.set(ann.url, ann.title || ann.url);
          }
        }
      }

      if (step?.type === 'model_output' && Array.isArray(step.content)) {
        for (const block of step.content) {
          if (block.type === 'text' && Array.isArray(block.annotations)) {
            for (const ann of block.annotations) {
              if (ann.type === 'url_citation' && ann.url) {
                citationsMap.set(ann.url, ann.title || ann.url);
              }
            }
          }
          if (block.type === 'image' && (block.data || block.url)) {
            outputImages.push({
              data: block.data,
              mimeType: block.mime_type || 'image/png',
              url: block.url
            });
          }
        }
      }
    }

    const citations = Array.from(citationsMap.entries()).map(([url, title]) => ({ title, url }));
    return { citations, outputImages };
  }

  /**
   * Helper to extract output text from an Interaction object

   */
  private extractOutputText(interaction: any): string {
    if (!interaction) return '';
    if (interaction.output_text) return interaction.output_text;
    if (typeof interaction.outputText === 'function') return interaction.outputText();

    if (Array.isArray(interaction.outputs)) {
      const parts = interaction.outputs
        .filter((o: any) => o.type === 'text' && o.text)
        .map((o: any) => o.text);
      if (parts.length > 0) return parts.join('\n');
    }

    if (Array.isArray(interaction.steps)) {
      const textParts: string[] = [];
      for (const step of interaction.steps) {
        if (step.type === 'model_output' && Array.isArray(step.content)) {
          for (const block of step.content) {
            if (block.type === 'text' && block.text) {
              textParts.push(block.text);
            }
          }
        } else if (step.text) {
          textParts.push(step.text);
        }
      }
      if (textParts.length > 0) return textParts.join('\n');
    }

    return '';
  }

  /**
   * Helper to extract executed Python code and sandbox logs from an Interaction object
   */
  private extractCodeAndLogs(interaction: any): { code: string; log: string } {
    let code = '';
    let log = '';

    const steps = interaction?.steps || interaction?.outputs || [];
    if (Array.isArray(steps)) {
      for (const step of steps) {
        if (step.type === 'code_execution_call') {
          const c = step.arguments?.code || step.code || '';
          if (c) code += (code ? '\n' : '') + c;
        } else if (step.type === 'code_execution_result') {
          const r = step.result || step.output || '';
          if (r) log += (log ? '\n' : '') + r;
        }
      }
    }

    return { code, log };
  }

  /**
   * Stream interactions generator for Chat panels with previous_interaction_id support
   */
  async *createInteractionStream(params: {
    model: string;
    input: any;
    systemInstruction?: string;
    tools?: Array<any>;
    previousInteractionId?: string;
  }): AsyncGenerator<any, void, unknown> {
    const effectiveModel = params.model || DEFAULT_MODEL_ID;
    const defaultTools: any[] = DATA_SCIENCE_FUNCTION_TOOLS;
    const tools = deduplicateTools(params.tools ?? defaultTools);


    const stream = await this.ai.interactions.create({
      model: effectiveModel,
      input: params.input,
      system_instruction: params.systemInstruction,
      tools: tools as any,
      stream: true,
      previous_interaction_id: params.previousInteractionId,
    });

    for await (const event of stream) {
      yield event;
    }
  }

  public parseJsonResponse<T>(responseText: string, context: string): T | null {
    if (!responseText || typeof responseText !== 'string') return null;

    const raw = responseText.trim();
    if (!raw) return null;

    const unwrapIfWrapped = (val: any): any => {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        if (val.AnomalyReport && typeof val.AnomalyReport === 'object') return val.AnomalyReport;
        if (val.anomalyReport && typeof val.anomalyReport === 'object') return val.anomalyReport;
      }
      return val;
    };

    const sanitizeControlCharsInStrings = (str: string): string => {
      let out = '';
      let inString = false;
      let escaped = false;
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (escaped) {
          out += c;
          escaped = false;
          continue;
        }
        if (c === '\\') {
          out += c;
          escaped = true;
          continue;
        }
        if (c === '"') {
          inString = !inString;
          out += c;
          continue;
        }
        if (inString) {
          if (c === '\n') { out += '\\n'; continue; }
          if (c === '\r') { out += '\\r'; continue; }
          if (c === '\t') { out += '\\t'; continue; }
        }
        out += c;
      }
      return out;
    };

    const repairTruncatedJson = (str: string): string => {
      const stack: string[] = [];
      let inString = false;
      let escaped = false;

      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (escaped) { escaped = false; continue; }
        if (c === '\\') { escaped = true; continue; }
        if (c === '"') { inString = !inString; continue; }
        if (!inString) {
          if (c === '{' || c === '[') stack.push(c);
          else if (c === '}' && stack[stack.length - 1] === '{') stack.pop();
          else if (c === ']' && stack[stack.length - 1] === '[') stack.pop();
        }
      }

      let result = str.trim();
      if (inString) result += '"';
      result = result.replace(/:\s*$/, ': null').replace(/,\s*$/, '');

      while (stack.length > 0) {
        const opening = stack.pop();
        result = result.replace(/,\s*$/, '');
        if (opening === '{') result += '}';
        else if (opening === '[') result += ']';
      }

      return result;
    };

    const attemptParse = (candidate: string): T | null => {
      if (!candidate) return null;
      const trimmed = candidate.trim();
      if (!trimmed) return null;

      // 1. Direct parse
      try {
        const val = JSON.parse(trimmed);
        if (val && typeof val === 'object') return unwrapIfWrapped(val) as T;
      } catch (_) {}

      // 2. Sanitize common LLM flaws (NaN, Infinity, trailing commas, unescaped string newlines)
      let sanitized = sanitizeControlCharsInStrings(trimmed)
        .replace(/\bNaN\b/g, 'null')
        .replace(/\b-?Infinity\b/g, 'null')
        .replace(/,\s*([}\]])/g, '$1');

      try {
        const val = JSON.parse(sanitized);
        if (val && typeof val === 'object') return unwrapIfWrapped(val) as T;
      } catch (_) {}

      // 3. Auto-close truncated JSON
      try {
        const closed = repairTruncatedJson(sanitized);
        const val = JSON.parse(closed);
        if (val && typeof val === 'object') return unwrapIfWrapped(val) as T;
      } catch (_) {}

      return null;
    };

    // Strategy 1: Direct parse
    let parsed = attemptParse(raw);
    if (parsed) return parsed;

    // Strategy 2: Code block anywhere in the text (supports both closed and unclosed markdown blocks)
    const codeBlockRegex = /```(?:json|[\w-]*)\s*([\s\S]*?)(?:```|$)/gi;
    let match: RegExpExecArray | null;
    while ((match = codeBlockRegex.exec(raw)) !== null) {
      if (match[1]?.trim()) {
        parsed = attemptParse(match[1].trim());
        if (parsed) return parsed;
      }
    }

    // Strategy 3: Outermost JSON object { ... }
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      parsed = attemptParse(raw.substring(firstBrace, lastBrace + 1));
      if (parsed) return parsed;
    } else if (firstBrace !== -1) {
      parsed = attemptParse(raw.substring(firstBrace));
      if (parsed) return parsed;
    }

    // Strategy 4: Outermost JSON array [ ... ]
    const firstBracket = raw.indexOf('[');
    const lastBracket = raw.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      parsed = attemptParse(raw.substring(firstBracket, lastBracket + 1));
      if (parsed) return parsed;
    } else if (firstBracket !== -1) {
      parsed = attemptParse(raw.substring(firstBracket));
      if (parsed) return parsed;
    }

    console.warn(`[${context}] parseJsonResponse could not extract valid JSON from response (length ${raw.length}). First 400 chars:`, raw.substring(0, 400));
    return null;
  }

  // ==========================================
  // UNIFIED AGENT 1: Data Cleaning & Curation
  // (Filesystem Lakehouse + DATA_REPORT.md - Option B)
  // ==========================================
  async getDataCleaningReport(
    input: RawDataInput,
    modelId: string,
    focusAndMetricsInput?: string,
    onProgress?: (step: LiveExecutionStep) => void
  ): Promise<DataCleaningReportResult> {
    const effectiveModelId = modelId || DEFAULT_MODEL_ID;
    const context = `DataCleaningReport (Model: ${effectiveModelId})`;

    let systemInstruction = GET_DATA_CLEANING_REPORT_SYSTEM_PROMPT;
    const focusAndMetricsPromptSnippet = (focusAndMetricsInput && focusAndMetricsInput.trim() !== '')
      ? `<USER_FOCUS_AND_METRICS>Use this user guidance to prioritize analysis, cleaning, and slice creation: "${focusAndMetricsInput.trim()}".</USER_FOCUS_AND_METRICS>`
      : `<USER_FOCUS_AND_METRICS>No specific focus areas or key metrics were provided. Perform comprehensive data structuring, quality audit, and derive salient slices.</USER_FOCUS_AND_METRICS>`;

    systemInstruction = systemInstruction.replace('{{USER_FOCUS_AND_METRICS_PROMPT_SNIPPET}}', focusAndMetricsPromptSnippet);

    const userMessageParts: any[] = [...input.parts];
    this.cachedInputParts = userMessageParts;
    if (userMessageParts.length === 0 && (!focusAndMetricsInput || focusAndMetricsInput.trim() === '')) {
      throw new GeminiError("No input parts or focus guidance provided for data cleaning.", "InvalidInput_EmptyAll_Report", undefined, "Please provide data (files/text) or specify focus areas/key metrics.", false);
    }

    this.extractAndCacheFilesFromParts(userMessageParts);

    const promptText = (focusAndMetricsInput && focusAndMetricsInput.trim() !== '')
      ? `Please inspect the raw dataset in './user_uploaded/' using execute_bash, profile it, sanitize it, write verified clean slices into './slices/', and output the complete DATA_REPORT.md. User Guidance: "${focusAndMetricsInput.trim()}".`
      : `Please inspect the raw dataset in './user_uploaded/' using execute_bash, profile it, sanitize it, write verified clean slices into './slices/', and output the complete DATA_REPORT.md as specified in your system instructions.`;

    const finalInput = this.formatInputForInteractions(userMessageParts, promptText);

    try {
      const interactionResult = await this.runInteraction({
        model: effectiveModelId,
        input: finalInput,
        systemInstruction,
        stageName: 'Data Cleaning & Profiling',
        datasetContext: { runId: this.activeRunId },
        onProgress
      }, context);

      let reportMarkdown = interactionResult.outputText?.trim();
      if (!reportMarkdown) {
        throw new GeminiError(
          `Data cleaning produced no text report. Execution output: ${interactionResult.executionLog || 'None'}`,
          'EmptyReportError',
          undefined,
          'Please check the execution logs and retry.',
          false
        );
      }

      const headingMatch = reportMarkdown.search(/^#\s+/m);
      if (headingMatch > 0) {
        reportMarkdown = reportMarkdown.substring(headingMatch).trim();
      }

      return {
        reportMarkdown,
        interactionId: interactionResult.id,
        pythonCodeSnippet: interactionResult.executedPythonCode || null,
        executionLog: interactionResult.executionLog || null
      };
    } catch (error: any) {
      if (error instanceof GeminiError) throw error;
      console.error(`[${context}] Error in getDataCleaningReport:`, error);
      throw new GeminiError(
        `[${context}] Data cleaning failed: ${error.message || String(error)}`,
        'API_DataCleaningErrorReport',
        String(error),
        "Ensure your API key is valid and the selected model supports Interactions API.",
        true
      );
    }
  }

  // ==========================================
  // AGENT 3: Anomaly Detection
  // ==========================================
  async detectAnomalies(
    focusAndMetricsInput: string | undefined,
    modelId: string,
    onProgress?: (step: LiveExecutionStep) => void,
    cleaningInteractionId?: string,
    dataCleaningReport?: string,
    inputParts?: any[]
  ): Promise<AnomalyReport | null> {
    const effectiveModelId = modelId || DEFAULT_MODEL_ID;
    const context = `AnomalyDetection (Model: ${effectiveModelId})`;

    if (!cleaningInteractionId && !dataCleaningReport) {
      throw new GeminiError(`[${context}] Data cleaning context is missing. Cannot perform anomaly detection.`, "InvalidInput_MissingDataCleaningReport", undefined, "Previous data cleaning produced no data.", false);
    }

    let systemInstruction = DETECT_ANOMALIES_SYSTEM_PROMPT;
    const focusAndMetricsPromptSnippet = (focusAndMetricsInput && focusAndMetricsInput.trim() !== '')
      ? `<USER_FOCUS_AND_METRICS>Prioritize anomalies related to this user guidance: "${focusAndMetricsInput.trim()}".</USER_FOCUS_AND_METRICS>`
      : `<USER_FOCUS_AND_METRICS>No specific focus areas provided. Perform comprehensive anomaly detection across all data dimensions.</USER_FOCUS_AND_METRICS>`;
    systemInstruction = systemInstruction.replace('{{USER_FOCUS_AND_METRICS_PROMPT_SNIPPET}}', focusAndMetricsPromptSnippet);

    const promptText = `Please analyze the dataset using the Data Cleaning Report and curated data slices in './slices/' to perform comprehensive anomaly detection.

The Data Cleaning Report is:
${dataCleaningReport || 'Refer to DATA_REPORT.md and data slices in ./slices/ in your workspace.'}

Curated data slices are available in './slices/' (e.g. 'slices/master_clean.csv', 'slices/anomalies_candidates.csv').

WORKSPACE DATA ACCESS:
Load clean data from 'slices/master_clean.csv' (or relevant slice cataloged in the report, or raw dataset in './user_uploaded/').

CRITICAL INSTRUCTIONS:
1. Use your server-side Python execution environment (pandas, numpy, scikit-learn, scipy) to inspect both curated slices in './slices/' and raw inputs in './user_uploaded/' to uncover deep statistical, structural, and multivariate anomalies.
2. Cross-reference clean records against raw inputs to differentiate between data corruption, transmission glitches, and genuine structural anomalies.
3. CREATE NEW SLICES AS NECESSARY: Save specialized anomaly subsets into './slices/' (e.g., 'slices/anomalies_multivariate.csv', 'slices/anomalies_temporal_spikes.csv') so that they cover maximum analytical depth.
4. Output delivery: Save your output to './anomalies/final_output.json' and call the 'parse_final_output' tool with agent="anomalies", file_path="anomalies/final_output.json", and file_content.
5. If parse_final_output reports schema errors, fix them in Python and call parse_final_output again until verified.`;

    clearValidatedOutput('anomalies');

    const partsToUse = (inputParts && inputParts.length > 0) ? inputParts : this.cachedInputParts;
    const finalInput = this.formatInputForInteractions(partsToUse, promptText);

    try {
      const interactionResult = await this.runInteraction({
        model: effectiveModelId,
        input: finalInput,
        systemInstruction,
        stageName: 'Anomaly Detection',
        datasetContext: { runId: this.activeRunId },
        previousInteractionId: cleaningInteractionId,
        onProgress
      }, context);

      const validatedReport = getValidatedOutput<AnomalyReport>('anomalies');
      if (validatedReport && Array.isArray(validatedReport.detectedAnomalies)) {
        console.log(`[${context}] Successfully retrieved verified AnomalyReport (${validatedReport.detectedAnomalies.length} anomalies) from parse_final_output tool.`);
        (validatedReport as any)._pythonCode = interactionResult.executedPythonCode || null;
        (validatedReport as any)._executionLog = interactionResult.executionLog || null;
        return validatedReport;
      }

      let anomalyReport = this.parseJsonResponse<AnomalyReport>(interactionResult.outputText, context);
      if (!anomalyReport && interactionResult.executionLog) {
        console.log(`[${context}] outputText did not parse, checking Python execution log...`);
        anomalyReport = this.parseJsonResponse<AnomalyReport>(interactionResult.executionLog, context);
      }

      if (!anomalyReport || !Array.isArray(anomalyReport.detectedAnomalies)) {
        throw new GeminiError(
          `[${context}] Output does not contain a valid AnomalyReport with detectedAnomalies array.`,
          "AnomalyParsingError",
          (interactionResult.outputText || interactionResult.executionLog || '').substring(0, 500),
          "Try again or refine data.",
          false
        );
      }

      if (anomalyReport) {
        (anomalyReport as any)._pythonCode = interactionResult.executedPythonCode || null;
        (anomalyReport as any)._executionLog = interactionResult.executionLog || null;
      }

      console.log(`[${context}] Detected ${anomalyReport.detectedAnomalies.length} anomalies.`);
      return anomalyReport;

    } catch (error: any) {
      if (error instanceof GeminiError) throw error;
      console.error(`[${context}] Anomaly detection failed:`, error);
      throw new GeminiError(
        `[${context}] Anomaly detection failed: ${error.message || String(error)}`,
        'AnomalyDetectionError',
        String(error),
        "Try re-running the analysis.",
        true
      );
    }
  }

  // ==========================================
  // AGENT 4: Visualization Generation
  // ==========================================
  async generateVisualizations(
    request: VisualizationRequest,
    modelId: string,
    onProgress?: (step: LiveExecutionStep) => void
  ): Promise<VisualizationGenerationResult> {
    const effectiveModelId = modelId || DEFAULT_MODEL_ID;
    const context = `VisualizationGeneration (Model: ${effectiveModelId})`;

    const previousInteractionId = request.cleaningInteractionId;
    const promptText = `You must generate 20-30 diverse, insightful chart specifications from the dataset using the Data Cleaning Report and curated data slices in './slices/'.

The Data Cleaning Report is:
${request.dataCleaningReport || 'Refer to DATA_REPORT.md in your working directory and slices in ./slices/'}

The data slices are available in './slices/' (e.g. 'slices/master_clean.csv', 'slices/master_clean.parquet').

WORKSPACE DATA ACCESS:
Load clean data from 'slices/master_clean.csv' (or relevant slice in './slices/' or raw dataset in './user_uploaded/').

CRITICAL INSTRUCTIONS:
1. Use your server-side Python environment (pandas, numpy, scikit-learn) to inspect the data files directly, aggregate key metrics, compute distributions, and calculate trends.
2. CREATE NEW SLICES AS NECESSARY: You are explicitly encouraged and empowered to compute, transform, and save new data slices directly into './slices/' (e.g., 'slices/viz_cohort_trends.csv', 'slices/viz_correlation_matrix.csv', 'slices/viz_multivariate_agg.parquet') to uncover maximum analytical depth across all dimensions.
3. Output delivery: Save your output to './visualization/final_output.json' and call the 'parse_final_output' tool with agent="visualization", file_path="visualization/final_output.json", and file_content.
4. If parse_final_output reports schema or rendering errors, fix them in Python and call parse_final_output again until verified.`;

    clearValidatedOutput('visualization');

    const partsToUse = (request.inputParts && request.inputParts.length > 0) ? request.inputParts : this.cachedInputParts;
    const finalInput = this.formatInputForInteractions(partsToUse, promptText);

    try {
      const interactionResult = await this.runInteraction({
        model: effectiveModelId,
        input: finalInput,
        systemInstruction: GENERATE_VISUALIZATIONS_SYSTEM_PROMPT,
        stageName: 'Generating Visualizations',
        datasetContext: { runId: this.activeRunId },
        previousInteractionId,
        onProgress
      }, context);

      const validatedCharts = getValidatedOutput<ChartSpec[]>('visualization');
      if (validatedCharts && Array.isArray(validatedCharts) && validatedCharts.length > 0) {
        console.log(`[${context}] Successfully retrieved ${validatedCharts.length} verified chart specifications from parse_final_output tool.`);
        return {
          chartSpecs: validatedCharts,
          pythonCodeSnippet: interactionResult.executedPythonCode || undefined,
          executionLog: interactionResult.executionLog || undefined
        };
      }

      let chartSpecs = this.extractChartSpecsFromPythonOutput(interactionResult.executionLog, context);
      if (!chartSpecs || chartSpecs.length === 0) {
        chartSpecs = this.extractChartSpecsFromPythonOutput(interactionResult.outputText, context);
      }
      if (!chartSpecs || chartSpecs.length === 0) {
        chartSpecs = this.extractChartSpecsFromPythonOutput(interactionResult.executedPythonCode, context);
      }

      if (chartSpecs && chartSpecs.length > 0) {
        const validCharts = chartSpecs.filter(spec => {
          if (!spec.chartType || !spec.title || !spec.data || !spec.dataKeys) {
            return false;
          }
          if (!SUPPORTED_CHART_TYPES.includes(spec.chartType as SupportedChartType)) {
            return false;
          }
          return true;
        });

        console.log(`[${context}] Generated ${validCharts.length} valid chart specifications.`);
        return {
          chartSpecs: validCharts,
          pythonCodeSnippet: interactionResult.executedPythonCode || undefined,
          executionLog: interactionResult.executionLog || undefined
        };
      }

      console.warn(`[${context}] No valid chart specifications found in output. Attempting fallback parse.`);
      const fallback = this.parseJsonResponse<ChartSpec[]>(interactionResult.outputText, context)
        || this.parseJsonResponse<ChartSpec[]>(interactionResult.executionLog, context);
      if (fallback && Array.isArray(fallback)) {
        return {
          chartSpecs: fallback,
          pythonCodeSnippet: interactionResult.executedPythonCode || undefined,
          executionLog: interactionResult.executionLog || undefined
        };
      }

      return {
        chartSpecs: [],
        pythonCodeSnippet: interactionResult.executedPythonCode || undefined,
        executionLog: interactionResult.executionLog || undefined
      };

    } catch (error: any) {
      if (error instanceof GeminiError) throw error;
      console.error(`[${context}] Visualization generation error:`, error);
      throw new GeminiError(
        `[${context}] Visualization generation failed: ${error.message || String(error)}`,
        'VisualizationGenerationError',
        String(error),
        "Try adjusting model or input.",
        true
      );
    }
  }

  // ==========================================
  // AGENT 5: Forecasting & Predictive Modeling
  // ==========================================
  async getForecastingReport(
    focusAndMetricsInput: string | undefined,
    modelId: string,
    onProgress?: (step: LiveExecutionStep) => void,
    cleaningInteractionId?: string,
    dataCleaningReport?: string,
    inputParts?: any[]
  ): Promise<ForecastingReport | null> {
    const effectiveModelId = modelId || DEFAULT_MODEL_ID;
    const context = `ForecastingReport (Model: ${effectiveModelId})`;

    // Phase 1: Propose Models
    const proposals = await this.getForecastingModelProposals(
      focusAndMetricsInput,
      effectiveModelId,
      onProgress,
      cleaningInteractionId,
      dataCleaningReport,
      inputParts
    );
    if (!proposals || proposals.length === 0) {
      console.warn(`[${context}] Phase 1 did not yield any model proposals.`);
      return {
        overallSummary: "Comprehensive forecasting dataset",
        models: [],
        limitationsAndAssumptions: "No suitable predictive or forecasting models could be proposed for the current dataset structure."
      };
    }

    console.log(`[${context}] Generated ${proposals.length} model proposals. Beginning execution...`);

    // Phase 2: Execute each model via Interactions API code execution
    const executedModels: ForecastingModelDetail[] = [];

    for (const proposal of proposals) {
      console.log(`[ForecastingReport] Training model ${executedModels.length + 1}/${proposals.length}: ${proposal.modelName}`);
      const result = await this.executeForecastingModel(
        proposal,
        effectiveModelId,
        onProgress,
        cleaningInteractionId,
        dataCleaningReport,
        inputParts
      );
      executedModels.push(result);
    }

    return {
      overallSummary: dataCleaningReport ? "Forecasting dataset prepared with server-side filesystem slices" : "Forecasting dataset prepared with server-side feature engineering",
      identifiedTargetVariables: Array.from(new Set(proposals.map(p => p.targetVariable).filter(Boolean))),
      models: executedModels,
      limitationsAndAssumptions: "Models are trained in Google's cloud Python environment using scikit-learn, numpy, and pandas."
    };
  }

  private async getForecastingModelProposals(
    focusAndMetricsInput: string | undefined,
    modelId: string,
    onProgress?: (step: LiveExecutionStep) => void,
    cleaningInteractionId?: string,
    dataCleaningReport?: string,
    inputParts?: any[]
  ): Promise<ForecastingModelProposal[]> {
    const context = "ForecastPhase1_Proposal";

    let systemInstruction = GET_FORECASTING_REPORT_SYSTEM_PROMPT_PHASE1_PROPOSAL;
    const focusAndMetricsPromptSnippet = (focusAndMetricsInput && focusAndMetricsInput.trim() !== '')
      ? `<USER_FOCUS_AND_METRICS>Prioritize models related to this user guidance: "${focusAndMetricsInput.trim()}".</USER_FOCUS_AND_METRICS>`
      : `<USER_FOCUS_AND_METRICS>No specific focus areas provided. Propose diverse models for the data.</USER_FOCUS_AND_METRICS>`;
    systemInstruction = systemInstruction.replace('{{USER_FOCUS_AND_METRICS_PROMPT_SNIPPET}}', focusAndMetricsPromptSnippet);

    const userPrompt = `Based on the system instructions, please propose a diverse set of forecasting/predictive models for the dataset based on the Data Cleaning Report, curated slices, and attached dataset:\n\n${dataCleaningReport || 'Refer to DATA_REPORT.md'}\n\nSlices are available in './slices/' (e.g. 'slices/master_clean.csv', 'slices/timeseries_regularized.parquet'). Return ONLY a JSON array of ForecastingModelProposal objects.`;

    const partsToUse = (inputParts && inputParts.length > 0) ? inputParts : this.cachedInputParts;
    const finalInput = this.formatInputForInteractions(partsToUse, userPrompt);

    const interactionResult = await this.runInteraction({
      model: modelId,
      input: finalInput,
      systemInstruction,
      stageName: 'Forecasting: Proposing Models',
      datasetContext: { runId: this.activeRunId },
      previousInteractionId: cleaningInteractionId,
      onProgress
    }, context);

    return this.parseJsonResponse<ForecastingModelProposal[]>(interactionResult.outputText, context) || [];
  }

  private async executeForecastingModel(
    proposal: ForecastingModelProposal,
    modelId: string,
    onProgress?: (step: LiveExecutionStep) => void,
    cleaningInteractionId?: string,
    dataCleaningReport?: string,
    inputParts?: any[]
  ): Promise<ForecastingModelDetail> {
    const context = `ForecastingModel_${proposal.modelIdSuggestion || 'exec'}`;
    const promptText = `You must train and evaluate the proposed predictive model using the \`execute_bash\` tool.

Target Model Proposal:
${JSON.stringify(proposal, null, 2)}

Curated data slices are in './slices/' (e.g. 'slices/master_clean.csv', 'slices/timeseries_regularized.parquet'). Refer to DATA_REPORT.md for target/feature context.

WORKSPACE DATA ACCESS:
Load training data from 'slices/master_clean.csv' (or relevant slice in './slices/').

CRITICAL EXECUTION INSTRUCTIONS:
1. EXECUTE your Python script directly using \`execute_bash\`.
2. Load training data from 'slices/master_clean.csv' (or other relevant slice cataloged in the report).
3. CREATE NEW SLICES AS NECESSARY: Save engineered feature matrices and model predictions into './slices/' (e.g. 'slices/forecast_features_${proposal.targetVariable}.csv', 'slices/forecast_predictions_${proposal.modelIdSuggestion}.csv') to cover maximum analytical depth!
4. Train the proposed ${proposal.modelType} model for target variable '${proposal.targetVariable}' using scikit-learn.
5. Compute numerical evaluation metrics (such as accuracy, f1_score, precision, recall, or MAE, RMSE, R²).
6. Output delivery: Save your output to './forecasting/final_output.json' and call the 'parse_final_output' tool with agent="forecasting", file_path="forecasting/final_output.json", and file_content.
7. If parse_final_output reports schema errors, fix them in Python and call parse_final_output again until verified.`;

    clearValidatedOutput('forecasting');

    const systemInstruction = GET_FORECASTING_REPORT_SYSTEM_PROMPT_PHASE2_CODE_EXEC;

    const partsToUse = (inputParts && inputParts.length > 0) ? inputParts : this.cachedInputParts;
    const finalInput = this.formatInputForInteractions(partsToUse, promptText);

    try {
      const interactionResult = await this.runInteraction({
        model: modelId,
        input: finalInput,
        systemInstruction,
        stageName: `Forecasting: Training ${proposal.modelName}`,
        datasetContext: { runId: this.activeRunId },
        previousInteractionId: cleaningInteractionId,
        onProgress
      }, context);

      const validatedForecast = getValidatedOutput<any>('forecasting');
      if (validatedForecast) {
        const validatedModel = Array.isArray(validatedForecast.models)
          ? validatedForecast.models[0]
          : (Array.isArray(validatedForecast) ? validatedForecast[0] : validatedForecast);

        if (validatedModel && typeof validatedModel === 'object') {
          console.log(`[${context}] Successfully retrieved verified ForecastingModelDetail from parse_final_output tool.`);
          return {
            ...proposal,
            ...validatedModel,
            pythonCodeSnippet: interactionResult.executedPythonCode || validatedModel.pythonCodeSnippet || '',
            executionLog: interactionResult.executionLog || validatedModel.executionLog || '',
            diagnosticCharts: validatedModel.diagnosticCharts || this.parseDiagnosticChartsFromLog(interactionResult.executionLog, context),
            error: null
          } as ForecastingModelDetail;
        }
      }

      let modelDetail = this.extractModelDetailFromPythonOutput(interactionResult.executionLog);
      if (!modelDetail) {
        modelDetail = this.extractModelDetailFromPythonOutput(interactionResult.outputText);
      }
      if (!modelDetail) {
        modelDetail = this.extractModelDetailFromPythonOutput(interactionResult.executedPythonCode);
      }

      if (modelDetail) {
        return {
          ...proposal,
          ...modelDetail,
          pythonCodeSnippet: interactionResult.executedPythonCode || '',
          executionLog: interactionResult.executionLog || '',
          diagnosticCharts: this.parseDiagnosticChartsFromLog(interactionResult.executionLog, context),
          error: null
        } as ForecastingModelDetail;
      }

      return {
        ...proposal,
        pythonCodeSnippet: interactionResult.executedPythonCode || '',
        executionLog: interactionResult.executionLog || interactionResult.outputText,
        error: "Model trained but could not parse output details."
      } as ForecastingModelDetail;

    } catch (error: any) {
      console.error(`[${context}] Error training model:`, error);
      return {
        ...proposal,
        pythonCodeSnippet: '',
        executionLog: String(error),
        error: error.message || 'Failed to train model.'
      } as ForecastingModelDetail;
    }
  }

  // ==========================================
  // AGENT 6: Model Insight Assistant
  // ==========================================
  async getModelInsight(
    modelDetail: ForecastingModelDetail,
    userQuestion: string,
    dataCleaningReport: string | null | undefined,
    modelId: string
  ): Promise<string> {
    const effectiveModelId = modelId || DEFAULT_MODEL_ID;
    const context = `ModelInsight (Model: ${effectiveModelId})`;

    const promptText = `User Question: "${userQuestion}"

Model Detail:
${JSON.stringify(modelDetail, null, 2)}

Data Cleaning Report Summary:
${dataCleaningReport || 'Refer to DATA_REPORT.md'}

Analyze the model metrics, feature importance, and performance. You have the \`execute_bash\` tool to compute any statistical verifications. Provide a clear, actionable explanation.`;

    const interactionResult = await this.runInteraction({
      model: effectiveModelId,
      input: [{ type: "text", text: promptText }],
      systemInstruction: GET_MODEL_INSIGHT_SYSTEM_PROMPT
    }, context);

    return interactionResult.outputText;
  }

  private extractChartSpecsFromPythonOutput(output: string, context: string): ChartSpec[] | null {
    if (!output) return null;

    const isValidChartList = (arr: any): boolean => {
      return Array.isArray(arr) && arr.length > 0 && arr.some(item => item && typeof item === 'object' && typeof item.chartType === 'string' && typeof item.title === 'string');
    };

    const lines = output.split('\n');
    let jsonBuffer = '';
    let bracketCount = 0;
    let foundStart = false;

    for (const line of lines) {
      for (const char of line) {
        if (char === '[') {
          bracketCount++;
          if (bracketCount === 1) foundStart = true;
        }
        if (foundStart) {
          jsonBuffer += char;
        }
        if (char === ']') {
          bracketCount--;
          if (bracketCount === 0 && foundStart) {
            try {
              const parsed = JSON.parse(jsonBuffer);
              if (isValidChartList(parsed)) {
                console.log(`[${context}] Successfully parsed ${parsed.length} chart specs from output`);
                return parsed as ChartSpec[];
              }
            } catch (err) {
              // continue scanning
            }
            jsonBuffer = '';
            foundStart = false;
          }
        }
      }
      if (foundStart) {
        jsonBuffer += '\n';
      }
    }

    try {
      const parsed = this.parseJsonResponse<ChartSpec[]>(output, context);
      if (isValidChartList(parsed)) {
        return parsed;
      }
    } catch (err) {
      console.warn(`[${context}] Fallback JSON parsing failed:`, err);
    }

    return null;
  }

  private extractModelDetailFromPythonOutput(output: string): Partial<ForecastingModelDetail> | null {
    if (!output) return null;

    const beforeDiagnostic = output.split('---DIAGNOSTIC_CHART_JSON_START---')[0];
    const lines = beforeDiagnostic.split('\n');
    let jsonBuffer = '';
    let braceCount = 0;
    let foundStart = false;

    for (const line of lines) {
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          if (braceCount === 1) foundStart = true;
        }
        if (foundStart) {
          jsonBuffer += char;
        }
        if (char === '}') {
          braceCount--;
          if (braceCount === 0 && foundStart) {
            try {
              const parsed = JSON.parse(jsonBuffer);
              if (parsed && typeof parsed === 'object' && (parsed.modelType || parsed.modelName || parsed.targetVariable || parsed.evaluationMetrics)) {
                return parsed as Partial<ForecastingModelDetail>;
              }
            } catch (err) {
              // continue
            }
            jsonBuffer = '';
            foundStart = false;
          }
        }
      }
      if (foundStart) {
        jsonBuffer += '\n';
      }
    }

    try {
      const parsed = this.parseJsonResponse<Partial<ForecastingModelDetail>>(output, 'ModelDetail');
      if (parsed && typeof parsed === 'object' && (parsed.modelType || parsed.modelName || parsed.targetVariable || parsed.evaluationMetrics)) {
        return parsed;
      }
    } catch (_) {}

    // Regex fallback if Python dictionary format was emitted in output
    const modelDetailMatch = output.match(/model_detail\s*=\s*\{([\s\S]*?)\}\s*(?:\n|$)/);
    if (modelDetailMatch) {
      try {
        const block = modelDetailMatch[1];
        const result: Partial<ForecastingModelDetail> = {};
        const getField = (field: string) => {
          const m = block.match(new RegExp(`['"]${field}['"]\\s*:\\s*['"]([^'"]+)['"]`));
          return m ? m[1] : undefined;
        };
        result.modelName = getField('modelName');
        result.modelType = getField('modelType') as any;
        result.targetVariable = getField('targetVariable');
        result.description = getField('description');
        result.interpretationOfResults = getField('interpretationOfResults');
        if (result.modelName || result.targetVariable || result.description) {
          return result;
        }
      } catch (_) {}
    }

    return null;
  }


  private parseDiagnosticChartsFromLog(log: string, context: string): ChartSpec[] {
    const charts: ChartSpec[] = [];
    if (!log) return charts;

    const regex = /---DIAGNOSTIC_CHART_JSON_START---([\s\S]*?)---DIAGNOSTIC_CHART_JSON_END---/g;
    let match;
    while ((match = regex.exec(log)) !== null) {
      try {
        const chartJsonString = match[1].trim();
        const chartSpec = this.parseJsonResponse<ChartSpec>(chartJsonString, `${context}-DiagnosticChart`);

        if (chartSpec && chartSpec.chartType && chartSpec.title && chartSpec.data && chartSpec.dataKeys) {
          if (SUPPORTED_CHART_TYPES.includes(chartSpec.chartType as SupportedChartType)) {
            charts.push(chartSpec);
          }
        }
      } catch (e) {
        console.error(`[${context}-DiagnosticChartParse] Error parsing diagnostic chart:`, e);
      }
    }
    return charts;
  }
}
