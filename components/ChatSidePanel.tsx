import React, { useState, useRef, useEffect, useMemo } from 'react';
import { RiGeminiFill } from 'react-icons/ri';
import { FiZap } from 'react-icons/fi';
import { useAppStore, usePipelineStore } from '../stores';
import type { ChartSpec, ForecastingModelDetail } from '../types';
import { VISUALIZATION_CHAT_SYSTEM_PROMPT, FORECASTING_CHAT_SYSTEM_PROMPT } from '../prompts';
import { DATA_SCIENCE_FUNCTION_TOOLS, executeRegisteredFunction } from '../services/functionTools';
import './ChatSidePanel.css';

interface ChatSidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'visualization' | 'forecasting';
    dataCleaningReport?: string | null;
    cleaningInteractionId?: string | null;
    visualizations?: ChartSpec[];
    forecastingModels?: ForecastingModelDetail[];
    onNewVisualization?: (chartSpec: ChartSpec) => void;
    onNewForecastingModel?: (modelDetail: ForecastingModelDetail) => void;
    modelId?: string;
}

interface GeneratedItem {
    type: 'visualization' | 'model' | 'chart-edit';
    title: string;
    id: string;
    chartType?: string;
    modelType?: string;
    vizIndex?: number;
    originalTitle?: string;
}

interface ChartSuggestion {
    title: string;
    index: number;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
    generatedItems?: GeneratedItem[];
    isGeneratingVisualization?: boolean;
    isGeneratingModel?: boolean;
    isGeneratingEdit?: boolean;
    isRunningPython?: boolean;
    pythonCodeSnippet?: string;
    pythonExecutionOutput?: string;
    pythonExecutionOutcome?: string;
    pythonDetailsExpanded?: boolean;
    citations?: Array<{ title: string; url: string }>;
    imageOutputs?: Array<{ data?: string; mimeType?: string; url?: string }>;
    executingFunction?: string;
    completedFunctions?: Array<{ name: string; args: any; result: any }>;
}

const WELCOME_MESSAGES = {
    visualization: `Hello! I'm your enhanced visualization assistant. You can:\n\n• **Reference specific charts** using @ mentions (e.g., @"Chart Title")\n• **Edit existing charts** by asking me to modify them\n• **Create new visualizations** from your data\n• **Create flow diagrams** like Sankey charts to show relationships\n• **Ask questions** about any chart's data or insights\n\nTry asking: "Create a Sankey diagram showing flow from categories to outcomes" or "Show me relationships between teams and business impact"\n\nType @ to see available charts, or just tell me what you'd like to do!`,
    forecasting: "Hello! I'm here to help you with predictive modeling. You can ask me to:\n\n• **Train an ARIMA model** for time series forecasting\n• **Create a regression model** to predict values\n• **Build a classification model** for categories\n• **Forecast future trends** in your data\n• **Predict outcomes** based on features\n\nWhat would you like to predict?"
} as const;

export const ChatSidePanel: React.FC<ChatSidePanelProps> = ({
    isOpen,
    onClose,
    type,
    dataCleaningReport,
    cleaningInteractionId,
    visualizations = [],
    forecastingModels = [],
    onNewVisualization,
    onNewForecastingModel,
    modelId = "gemini-2.5-pro"
}) => {
    const { geminiService } = useAppStore();
    const { updateVisualization } = usePipelineStore();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const previousInteractionIdRef = useRef<string | undefined>(undefined);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<ChartSuggestion[]>([]);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const recentVisualizationHashesRef = useRef<Set<string>>(new Set());
    
    // Get available charts for suggestions
    const availableCharts = useMemo<ChartSuggestion[]>(() => {
        if (type === 'visualization' && visualizations) {
            return visualizations.map((chart: ChartSpec, index) => ({
                title: chart.title,
                index
            }));
        }
        return [];
    }, [type, visualizations]);

    const hashChartSpec = (chart: ChartSpec) => {
        return `${chart.chartType}-${chart.title}-${Array.isArray(chart.data) ? chart.data.length : 0}`;
    };

    useEffect(() => {
        const newHashes = new Set(visualizations.map(hashChartSpec));
        recentVisualizationHashesRef.current = newHashes;
    }, [visualizations]);

    useEffect(() => {
        if (!isOpen) {
            recentVisualizationHashesRef.current.clear();
            previousInteractionIdRef.current = undefined;
        }
    }, [isOpen]);

    const shouldAddVisualization = (chartSpec: ChartSpec): boolean => {
        const hash = hashChartSpec(chartSpec);
        if (recentVisualizationHashesRef.current.has(hash)) {
            return false;
        }
        recentVisualizationHashesRef.current.add(hash);
        return true;
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            // Add welcome message
            const welcomeMessage: ChatMessage = {
                id: `welcome-${Date.now()}`,
                role: 'assistant',
                content: WELCOME_MESSAGES[type],
                timestamp: new Date()
            };
            setMessages([welcomeMessage]);
        }
    }, [isOpen, type, messages.length]);

    // Handle @ mention suggestions
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart || 0;
        setInputValue(value);
        setCursorPosition(cursorPos);

        // Check for @ symbol
        const textBeforeCursor = value.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        if (lastAtIndex !== -1 && lastAtIndex === textBeforeCursor.length - 1) {
            // Just typed @, show all suggestions
            if (availableCharts.length > 0) {
                setSuggestions(availableCharts.slice(0, 5));
                setShowSuggestions(true);
                setSelectedSuggestionIndex(0);
            }
        } else if (lastAtIndex !== -1 && cursorPos > lastAtIndex) {
            // @ with some text after it
            const searchText = value.substring(lastAtIndex + 1, cursorPos).toLowerCase();
            
            // Check if we're still in a mention (no space after @)
            if (!searchText.includes(' ') && !searchText.includes('\n')) {
                const filtered = availableCharts.filter(chart => 
                    chart.title.toLowerCase().includes(searchText)
                ).slice(0, 5);
                
                if (filtered.length > 0) {
                    setSuggestions(filtered);
                    setShowSuggestions(true);
                    setSelectedSuggestionIndex(0);
                } else {
                    setShowSuggestions(false);
                }
            } else {
                setShowSuggestions(false);
            }
        } else {
            setShowSuggestions(false);
        }
    };

    const insertSuggestion = (suggestion: ChartSuggestion) => {
        const textBeforeCursor = inputValue.substring(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        if (lastAtIndex !== -1) {
            const beforeAt = inputValue.substring(0, lastAtIndex);
            const afterCursor = inputValue.substring(cursorPosition);
            const newValue = `${beforeAt}@"${suggestion.title}" ${afterCursor}`;
            setInputValue(newValue);
            setShowSuggestions(false);
            
            // Focus back to textarea and set cursor position
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newCursorPos = beforeAt.length + `@"${suggestion.title}" `.length;
                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                    }
                }, 0);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || !geminiService || isLoading) return;
        setShowSuggestions(false);

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: inputValue.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        // Create streaming assistant message
        const assistantMessageId = `assistant-${Date.now()}`;
        const assistantMessage: ChatMessage = {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true
        };

        setMessages(prev => [...prev, assistantMessage]);

        try {
            await streamChatResponse(userMessage.content, assistantMessageId);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => prev.map(msg =>
                msg.id === assistantMessageId
                    ? { ...msg, content: 'Sorry, I encountered an error. Please try again.', isStreaming: false }
                    : msg
            ));
        } finally {
            setIsLoading(false);
        }
    };

    const streamChatResponse = async (userInput: string, messageId: string) => {
        if (!geminiService) return;

        // Parse @ mentions to identify referenced charts
        const mentionRegex = /@"([^"]+)"/g;
        const mentions: string[] = [];
        let match;
        while ((match = mentionRegex.exec(userInput)) !== null) {
            mentions.push(match[1]);
        }

        // Find referenced charts
        const referencedCharts = mentions
            .map((mention) => {
                const chartSuggestion = availableCharts.find(
                    (c) => c.title.toLowerCase() === mention.toLowerCase()
                );
                if (chartSuggestion && visualizations?.[chartSuggestion.index]) {
                    return {
                        chart: visualizations[chartSuggestion.index] as ChartSpec,
                        index: chartSuggestion.index
                    };
                }
                return null;
            })
            .filter((item): item is { chart: ChartSpec; index: number } => item !== null);

        const systemPrompt = type === 'visualization'
            ? VISUALIZATION_CHAT_SYSTEM_PROMPT
            : FORECASTING_CHAT_SYSTEM_PROMPT;

        // Build conversation history for context
        const conversationHistory = messages
            .filter(msg => msg.role === 'user' || (msg.role === 'assistant' && !msg.content.includes('Hello! I\'m')))
            .slice(-10) // Keep last 10 messages for context
            .map(msg => ({
                role: msg.role,
                content: msg.content.replace(/```(?:visualization-json|model-json|chart-edit-json)\s*[\s\S]*?\s*```/g, '[Generated content]')
            }));

        const contextData = {
            dataCleaningReport,
            visualizations: type === 'visualization' ? visualizations : undefined,
            forecastingModels: type === 'forecasting' ? forecastingModels : undefined,
            referencedCharts: referencedCharts.length > 0 ? referencedCharts : undefined,
            conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined
        };

        const referencedChartsContext =
            referencedCharts.length > 0
                ? referencedCharts
                      .map(({ chart, index }) =>
                          [
                              `Chart Index: ${index}`,
                              `Title: ${chart.title}`,
                              'ChartSpec JSON:',
                              JSON.stringify(chart, null, 2)
                          ].join('\n')
                      )
                      .join('\n\n')
                : 'None';

        const fullPrompt = `${systemPrompt}

CONTEXT DATA:
${JSON.stringify(contextData, null, 2)}

USER REQUEST: ${userInput}

${referencedCharts.length > 0 ? 
    `The user has referenced specific charts. Consider whether they want to:
    1. Get information about these charts
    2. Edit/modify these charts (if so, provide chart-edit-json with chartIndex and updatedChart)
    3. Create similar charts
    4. Compare these charts` : ''}

REFERENCED CHART DETAILS:
${referencedChartsContext}

Please respond naturally and helpfully. If you need to create a visualization, use visualization-json. If you need to edit an existing chart, use chart-edit-json with the format: {"chartIndex": number, "updatedChart": ChartSpec, "originalTitle": string}.`;

        try {
            console.log('Starting streaming chat API call via Interactions API...');

            let turnInput: any = fullPrompt;
            let fullResponse = '';
            let inJsonBlock = false;
            let jsonBlockType = '';
            let jsonBlockContent = '';
            let contentBeforeJson = '';
            let pythonBuffer = '';
            let pythonOutputBuffer = '';
            let turnCount = 0;
            const MAX_CONSECUTIVE_TURNS = 50;

            while (turnCount < MAX_CONSECUTIVE_TURNS) {
                turnCount++;
                const stream = geminiService.createInteractionStream({
                    model: modelId,
                    input: turnInput,
                    systemInstruction: systemPrompt,
                    tools: DATA_SCIENCE_FUNCTION_TOOLS,
                    previousInteractionId: previousInteractionIdRef.current,
                });

                const turnCalls: Array<{ id: string; name: string; arguments: any; deltaArgs: string }> = [];
                let deltaArgumentsString = '';
                let lastInteractionSnapshot: any = null;

                for await (const event of stream) {
                    if (event.interaction?.id) {
                        previousInteractionIdRef.current = event.interaction.id;
                        lastInteractionSnapshot = event.interaction;
                    }

                    // Extract citations and images from steps or interactions
                    if (event.step || event.interaction?.steps) {
                        const stepPool = event.interaction?.steps || [event.step];
                        const { citations, outputImages } = geminiService.extractCitationsAndImages(stepPool);
                        if (citations.length > 0 || outputImages.length > 0) {
                            setMessages(prev => prev.map(msg => {
                                if (msg.id !== messageId) return msg;
                                const existingCitations = msg.citations || [];
                                const newCitations = [...existingCitations];
                                for (const c of citations) {
                                    if (!newCitations.some(ec => ec.url === c.url)) newCitations.push(c);
                                }
                                const existingImages = msg.imageOutputs || [];
                                const newImages = [...existingImages, ...outputImages];
                                return {
                                    ...msg,
                                    citations: newCitations.length > 0 ? newCitations : undefined,
                                    imageOutputs: newImages.length > 0 ? newImages : undefined
                                };
                            }));
                        }
                    }

                    // Only track newly emitted function call steps for this turn
                    if (event.step?.type === 'function_call') {
                        const callId = event.step.id || `call_${Date.now()}`;
                        const fcName = event.step.name || event.step.function_call?.name || '';
                        const fcArgs = event.step.arguments || event.step.function_call?.arguments || {};
                        const existing = turnCalls.find(c => c.id === callId);
                        if (!existing && fcName) {
                            turnCalls.push({ id: callId, name: fcName, arguments: fcArgs, deltaArgs: '' });
                        } else if (existing && fcArgs && typeof fcArgs === 'object' && Object.keys(fcArgs).length > 0) {
                            existing.arguments = fcArgs;
                        }
                    }

                    const delta = event.delta;
                    if (!delta) continue;

                    const argChunk = delta.arguments || delta.args || (delta.type === 'arguments_delta' ? delta.arguments : '');
                    if (argChunk) {
                        const strVal = typeof argChunk === 'string' ? argChunk : JSON.stringify(argChunk);
                        deltaArgumentsString += strVal;
                        if (turnCalls.length > 0) {
                            turnCalls[turnCalls.length - 1].deltaArgs += strVal;
                        }
                    }

                    // 1. Handle Python code execution call directly from Google server
                    if (delta.type === 'code_execution_call') {
                        const codeChunk = delta.arguments?.code || delta.code || '';
                        pythonBuffer += (pythonBuffer ? '\n' : '') + codeChunk;
                        const codeSnapshot = pythonBuffer;
                        setMessages(prev => prev.map(msg =>
                            msg.id === messageId
                                ? { ...msg, isRunningPython: true, pythonCodeSnippet: codeSnapshot }
                                : msg
                        ));
                    }

                    // 2. Handle Python execution output directly from Google server sandbox
                    if (delta.type === 'code_execution_result') {
                        const resultChunk = delta.result || delta.output || '';
                        pythonOutputBuffer += (pythonOutputBuffer ? '\n' : '') + resultChunk;
                        const outputSnapshot = pythonOutputBuffer;
                        setMessages(prev => prev.map(msg =>
                            msg.id === messageId
                                ? {
                                    ...msg,
                                    isRunningPython: false,
                                    pythonExecutionOutput: outputSnapshot,
                                    pythonExecutionOutcome: 'OK',
                                    pythonDetailsExpanded: false
                                }
                                : msg
                        ));

                        // If execution output contains ChartSpec or ForecastingModelDetail JSON, process it
                        if (type === 'visualization') {
                            const handled = handlePythonVisualizationOutput(outputSnapshot, messageId, referencedCharts);
                            if (handled) {
                                pythonGeneratedVisualization = true;
                                setMessages(prev => prev.map(msg =>
                                    msg.id === messageId
                                        ? { 
                                            ...msg,
                                            isGeneratingVisualization: false,
                                            isGeneratingEdit: false,
                                            isGeneratingModel: false
                                        }
                                        : msg
                                ));
                            }
                        } else if (type === 'forecasting') {
                            const handled = handlePythonForecastingOutput(
                                outputSnapshot,
                                messageId,
                                pythonBuffer
                            );
                            if (handled) {
                                pythonGeneratedVisualization = true;
                                setMessages(prev => prev.map(msg =>
                                    msg.id === messageId
                                        ? { 
                                            ...msg,
                                            isGeneratingVisualization: false,
                                            isGeneratingEdit: false,
                                            isGeneratingModel: false
                                        }
                                        : msg
                                ));
                            }
                        }
                    }

                    // 3. Handle custom function call delta
                    if (delta.type === 'function_call') {
                        const fcName = delta.name || delta.function_call?.name || '';
                        const fcArgs = delta.arguments || delta.function_call?.arguments || {};
                        const fcId = delta.id || delta.function_call?.id || `call_${Date.now()}`;
                        const existing = turnCalls.find(c => c.id === fcId);
                        if (!existing && fcName) {
                            turnCalls.push({ id: fcId, name: fcName, arguments: fcArgs, deltaArgs: '' });
                        } else if (existing && fcArgs && typeof fcArgs === 'object' && Object.keys(fcArgs).length > 0) {
                            existing.arguments = fcArgs;
                        }
                        setMessages(prev => prev.map(msg =>
                            msg.id === messageId
                                ? { ...msg, executingFunction: fcName }
                                : msg
                        ));
                    }

                    // 4. Handle model output text chunks
                    if (delta.type === 'text' && delta.text) {
                        const chunkText = delta.text;
                        fullResponse += chunkText;

                        const jsonStartPattern = /```(visualization-json|chart-edit-json|model-json)/;
                        
                        if (!inJsonBlock) {
                            const match = chunkText.match(jsonStartPattern);
                            if (match || fullResponse.match(jsonStartPattern)) {
                                inJsonBlock = true;
                                jsonBlockType = (match || fullResponse.match(jsonStartPattern))?.[1] || '';
                                
                                const jsonStart = fullResponse.indexOf(`\`\`\`${jsonBlockType}`);
                                contentBeforeJson = fullResponse.substring(0, jsonStart).trim();
                                
                                const shouldShowIndicator = !(jsonBlockType === 'visualization-json' && pythonGeneratedVisualization);
                                
                                if (shouldShowIndicator) {
                                    const indicators: { [key: string]: keyof ChatMessage } = {
                                        'visualization-json': 'isGeneratingVisualization',
                                        'chart-edit-json': 'isGeneratingEdit',
                                        'model-json': 'isGeneratingModel'
                                    };
                                    
                                    const indicatorKey = indicators[jsonBlockType];
                                    if (indicatorKey) {
                                        setMessages(prev => prev.map(msg =>
                                            msg.id === messageId
                                                ? { 
                                                    ...msg, 
                                                    content: contentBeforeJson,
                                                    [indicatorKey]: true,
                                                    isStreaming: false
                                                }
                                                : msg
                                        ));
                                    }
                                }
                                continue;
                            }
                            
                            setMessages(prev => prev.map(msg =>
                                msg.id === messageId
                                    ? { ...msg, content: fullResponse.trim() }
                                    : msg
                            ));
                        } else {
                            const blockStartIndex = fullResponse.lastIndexOf(`\`\`\`${jsonBlockType}`);
                            const blockEndIndex = fullResponse.indexOf('```', blockStartIndex + jsonBlockType.length + 3);
                            
                            if (blockEndIndex !== -1) {
                                jsonBlockContent = fullResponse
                                    .substring(blockStartIndex + jsonBlockType.length + 3, blockEndIndex)
                                    .trim();
                                
                                if (jsonBlockContent && !(jsonBlockType === 'visualization-json' && pythonGeneratedVisualization)) {
                                    let processType: 'visualization' | 'edit' | 'model';
                                    if (jsonBlockType === 'visualization-json') processType = 'visualization';
                                    else if (jsonBlockType === 'chart-edit-json') processType = 'edit';
                                    else processType = 'model';
                                    
                                    await processJsonBlock(jsonBlockContent, processType, messageId);
                                }
                                
                                const contentAfterJson = fullResponse.substring(blockEndIndex + 3).trim();
                                const finalContent = [contentBeforeJson, contentAfterJson].filter(Boolean).join('\n\n').trim();
                                
                                setMessages(prev => prev.map(msg =>
                                    msg.id === messageId
                                        ? { 
                                            ...msg, 
                                            content: finalContent,
                                            isGeneratingVisualization: false,
                                            isGeneratingEdit: false,
                                            isGeneratingModel: false,
                                            isStreaming: false,
                                            isRunningPython: false
                                        }
                                        : msg
                                ));
                                
                                inJsonBlock = false;
                                jsonBlockType = '';
                                jsonBlockContent = '';
                                contentBeforeJson = '';
                            }
                        }
                    }
                }

                // If turnCalls is empty but interaction requires_action, find uncompleted calls from interaction.steps
                if (turnCalls.length === 0 && lastInteractionSnapshot?.steps) {
                    const steps = lastInteractionSnapshot.steps;
                    const completedCallIds = new Set(
                        steps.filter((s: any) => s.type === 'function_result').map((s: any) => s.call_id || s.id)
                    );
                    for (const s of steps) {
                        if (s.type === 'function_call' && s.id && !completedCallIds.has(s.id)) {
                            turnCalls.push({
                                id: s.id,
                                name: s.name || s.function_call?.name || '',
                                arguments: s.arguments || s.function_call?.arguments || {},
                                deltaArgs: ''
                            });
                        }
                    }
                }

                // If lastInteractionSnapshot has resolved step arguments, sync them into turnCalls
                if (lastInteractionSnapshot?.steps) {
                    for (const s of lastInteractionSnapshot.steps) {
                        if (s.type === 'function_call') {
                            const match = turnCalls.find(c => c.id === s.id);
                            if (match && s.arguments && typeof s.arguments === 'object' && Object.keys(s.arguments).length > 0) {
                                match.arguments = s.arguments;
                            }
                        }
                    }
                }

                // Parse accumulated delta arguments for any calls with empty arguments
                for (const call of turnCalls) {
                    const argStr = (call.deltaArgs || deltaArgumentsString).trim();
                    if (!call.arguments || typeof call.arguments !== 'object' || Object.keys(call.arguments).length === 0) {
                        if (argStr) {
                            try {
                                const parsed = JSON.parse(argStr);
                                call.arguments = typeof parsed === 'object' && parsed !== null ? parsed : { command: String(parsed) };
                            } catch {
                                call.arguments = { command: argStr };
                            }
                        }
                    } else if (call.name === 'execute_bash' && !call.arguments.command && argStr) {
                        try {
                            const parsed = JSON.parse(argStr);
                            if (parsed.command) call.arguments.command = parsed.command;
                        } catch {
                            call.arguments.command = argStr;
                        }
                    }
                }

                // Filter to calls with valid arguments (never execute an empty bash command)
                const pendingCalls = turnCalls.filter(call => {
                    if (call.name === 'execute_bash') {
                        let cmd = typeof call.arguments === 'string' ? call.arguments : (call.arguments?.command || call.arguments?.cmd || call.arguments?.code || call.arguments?.script);
                        if (!cmd && typeof call.arguments === 'object' && call.arguments !== null) {
                            for (const k of Object.keys(call.arguments)) {
                                if (typeof call.arguments[k] === 'string' && call.arguments[k].trim()) {
                                    cmd = call.arguments[k].trim();
                                    call.arguments = { command: cmd };
                                    break;
                                }
                            }
                        }
                        return Boolean(cmd && String(cmd).trim().length > 0);
                    }
                    return Boolean(call.name);
                });

                // Check if any custom functions were called during this turn
                if (pendingCalls.length > 0) {
                    const functionResultBlocks: any[] = [];
                    const datasetContext = {
                        dataCleaningReport,
                        visualizations,
                        forecastingModels
                    };

                    for (const call of pendingCalls) {
                        setMessages(prev => prev.map(msg =>
                            msg.id === messageId
                                ? { ...msg, executingFunction: call.name }
                                : msg
                        ));

                        const execResult = await executeRegisteredFunction(call.name, call.arguments, datasetContext);

                        setMessages(prev => prev.map(msg => {
                            if (msg.id !== messageId) return msg;
                            const existingFns = msg.completedFunctions || [];
                            return {
                                ...msg,
                                executingFunction: undefined,
                                completedFunctions: [...existingFns, { name: call.name, args: call.arguments, result: execResult }]
                            };
                        }));

                        const outputText = typeof execResult?.output === 'string' ? execResult.output : JSON.stringify(execResult);
                        functionResultBlocks.push({
                            type: 'function_result',
                            name: call.name,
                            call_id: call.id,
                            result: [{ type: 'text', text: outputText }]
                        });
                    }

                    // Feed results back into next interaction turn
                    turnInput = functionResultBlocks;
                } else {
                    // No pending function calls, finish turns
                    break;
                }
            }

            // Final update - mark streaming as complete
            const finalCleanedResponse = fullResponse
                .replace(/```(?:visualization-json|model-json|chart-edit-json|python|py)\s*[\s\S]*?\s*```/g, '')
                .trim();
            
            setMessages(prev => prev.map(msg =>
                msg.id === messageId
                    ? { 
                        ...msg, 
                        content: finalCleanedResponse, 
                        isStreaming: false,
                        isGeneratingVisualization: false,
                        isGeneratingEdit: false,
                        isGeneratingModel: false,
                        isRunningPython: false,
                        executingFunction: undefined
                    }
                    : msg
            ));

        } catch (error) {
            console.error('Streaming chat API error:', error);
            setMessages(prev => prev.map(msg =>
                msg.id === messageId
                    ? {
                        ...msg,
                        isRunningPython: false,
                        executingFunction: undefined
                    }
                    : msg
            ));
            throw error;
        }
    };

    const processJsonBlock = async (jsonString: string, type: 'visualization' | 'edit' | 'model', messageId: string) => {
        try {
            console.log(`Processing ${type} JSON block:`, jsonString);
            
            if (type === 'visualization') {
                const chartSpec = JSON.parse(jsonString) as ChartSpec;
                console.log('Parsed ChartSpec:', chartSpec);

                if (onNewVisualization && shouldAddVisualization(chartSpec)) {
                    console.log('Calling onNewVisualization callback...');
                    onNewVisualization(chartSpec);

                    const vizIndicator: GeneratedItem = {
                        type: 'visualization',
                        title: chartSpec.title,
                        id: `viz-${Date.now()}`,
                        chartType: chartSpec.chartType
                    };

                    appendGeneratedItem(messageId, vizIndicator);
                    console.log('Visualization added successfully!');
                } else {
                    console.log('Visualization skipped due to duplicate detection or missing callback.');
                }
            } else if (type === 'edit') {
                const editData = JSON.parse(jsonString) as { 
                    chartIndex: number; 
                    updatedChart: ChartSpec;
                    originalTitle?: string;
                };
                
                console.log('Parsed edit data:', editData);
                
                if (editData.chartIndex !== undefined && editData.updatedChart) {
                    console.log(`Updating chart at index ${editData.chartIndex}`);
                    updateVisualization(editData.chartIndex, editData.updatedChart);
                    
                    const editIndicator: GeneratedItem = {
                        type: 'chart-edit',
                        title: editData.updatedChart.title,
                        id: `edit-${Date.now()}`,
                        vizIndex: editData.chartIndex,
                        originalTitle: editData.originalTitle,
                        chartType: editData.updatedChart.chartType
                    };
                    
                    appendGeneratedItem(messageId, editIndicator);
                    console.log('Chart edit applied successfully!');
                }
            } else if (type === 'model' && onNewForecastingModel) {
                const modelDetail = JSON.parse(jsonString) as ForecastingModelDetail;
                console.log('Parsed model detail:', modelDetail);
                console.log('Calling onNewForecastingModel callback...');
                
                onNewForecastingModel(modelDetail);

                const modelIndicator: GeneratedItem = {
                    type: 'model',
                    title: modelDetail.modelName,
                    id: `model-${Date.now()}`,
                    modelType: modelDetail.modelType
                };
                
                appendGeneratedItem(messageId, modelIndicator);
                console.log('Model added successfully!');
            } else {
                console.warn(`No callback available for ${type}:`, {
                    type,
                    onNewVisualization: !!onNewVisualization,
                    onNewForecastingModel: !!onNewForecastingModel,
                });
            }
        } catch (error) {
            console.error(`Failed to parse ${type} JSON:`, error);
            console.error('Raw JSON string was:', jsonString);
        }
    };

    const togglePythonDetails = (messageId: string) => {
        setMessages(prev => prev.map(msg =>
            msg.id === messageId
                ? { ...msg, pythonDetailsExpanded: !msg.pythonDetailsExpanded }
                : msg
        ));
    };

    const clearContext = () => {
        // Reset messages to just the welcome message
        const welcomeMessage: ChatMessage = {
            id: `welcome-${Date.now()}`,
            role: 'assistant',
            content: WELCOME_MESSAGES[type],
            timestamp: new Date()
        };
        setMessages([welcomeMessage]);
        setInputValue('');
        setIsLoading(false);
        setShowSuggestions(false);
    };

    const getModelDisplayName = (modelId: string) => {
        const modelNames: Record<string, string> = {
            'gemini-2.5-pro': 'Gemini 2.5 Pro',
            'gemini-2.5-flash': 'Gemini 2.5 Flash',
            'gemini-1.5-pro': 'Gemini 1.5 Pro',
            'gemini-1.5-flash': 'Gemini 1.5 Flash'
        };
        return modelNames[modelId] || modelId;
    };



    const appendGeneratedItem = (messageId: string, newItem: GeneratedItem, extraUpdates: Partial<ChatMessage> = {}) => {
        setMessages(prev => prev.map(msg => {
            if (msg.id !== messageId) return msg;
            const existingItems = msg.generatedItems || [];
            const alreadyExists = existingItems.some(item =>
                item.type === newItem.type &&
                item.title === newItem.title &&
                item.chartType === newItem.chartType &&
                item.modelType === newItem.modelType &&
                item.vizIndex === newItem.vizIndex
            );

            if (alreadyExists) {
                return { ...msg, ...extraUpdates };
            }

            return {
                ...msg,
                ...extraUpdates,
                generatedItems: [...existingItems, newItem]
            };
        }));
    };

    const extractChartSpecFromText = (text: string): ChartSpec | null => {
        if (!text) return null;
        const trimmed = text.trim();
        const candidate = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)?.[1]?.trim() || trimmed.match(/\{[\s\S]*"chartType"[\s\S]*\}/)?.[0] || trimmed;
        try {
            const parsed = JSON.parse(candidate);
            if (parsed?.chartType && parsed?.title && parsed?.data) return parsed as ChartSpec;
        } catch {}
        return null;
    };

    const extractModelDetailFromText = (text: string): ForecastingModelDetail | null => {
        if (!text) return null;
        const beforeDiagnostic = text.trim().split('---DIAGNOSTIC_CHART_JSON_START---')[0].trim();
        const candidate = beforeDiagnostic.match(/```(?:json)?\s*([\s\S]*?)\s*```/)?.[1]?.trim() || beforeDiagnostic.match(/\{[\s\S]*"modelType"[\s\S]*\}/)?.[0] || beforeDiagnostic;
        try {
            const parsed = JSON.parse(candidate);
            if (parsed?.modelType && parsed?.modelName) return parsed as ForecastingModelDetail;
        } catch {}
        return null;
    };

    const extractDiagnosticChartsFromOutput = (text: string): ChartSpec[] => {
        if (!text) return [];
        
        const charts: ChartSpec[] = [];
        const chartPattern = /---DIAGNOSTIC_CHART_JSON_START---\s*(\{[\s\S]*?\})\s*---DIAGNOSTIC_CHART_JSON_END---/g;
        
        let match;
        while ((match = chartPattern.exec(text)) !== null) {
            try {
                const chartJson = match[1].trim();
                const parsed = JSON.parse(chartJson);
                if (parsed && parsed.chartType && parsed.data && parsed.dataKeys) {
                    charts.push(parsed as ChartSpec);
                    console.log('[extractDiagnosticChartsFromOutput] Found diagnostic chart:', parsed.title || parsed.chartType);
                }
            } catch (err) {
                console.warn('[extractDiagnosticChartsFromOutput] Failed to parse diagnostic chart:', err);
            }
        }
        
        return charts;
    };

    const handlePythonVisualizationOutput = (output: string | undefined, messageId: string, referencedCharts?: Array<{chart: ChartSpec, index: number}>): boolean => {
        if (type !== 'visualization') return false;
        if (!output) return false;

        const chartSpec = extractChartSpecFromText(output);
        if (!chartSpec) {
            console.warn('Python execution output did not contain a valid ChartSpec JSON.');
            setMessages(prev => prev.map(msg =>
                msg.id === messageId
                    ? { ...msg, isRunningPython: false }
                    : msg
            ));
            return false;
        }

        // Check if this is an edit operation (user referenced existing charts)
        if (referencedCharts && referencedCharts.length > 0) {
            // Find the best matching referenced chart to edit
            const targetChart = referencedCharts[0]; // Use first referenced chart as target
            const chartIndex = targetChart.index;
            
            console.log(`Python editing chart at index ${chartIndex} with new spec:`, chartSpec);
            
            // Update the existing chart instead of creating a new one
            updateVisualization(chartIndex, chartSpec);
            
            const editIndicator: GeneratedItem = {
                type: 'chart-edit',
                title: chartSpec.title,
                id: `edit-${Date.now()}`,
                vizIndex: chartIndex,
                originalTitle: targetChart.chart.title,
                chartType: chartSpec.chartType
            };
            
            appendGeneratedItem(messageId, editIndicator, { isRunningPython: false });
            console.log('Python chart edit applied successfully!');
            return true;
        }

        // Otherwise, create a new visualization
        if (!shouldAddVisualization(chartSpec) || !onNewVisualization) {
            setMessages(prev => prev.map(msg =>
                msg.id === messageId
                    ? { ...msg, isRunningPython: false }
                    : msg
            ));
            return false;
        }

        onNewVisualization(chartSpec);
        appendGeneratedItem(messageId, { type: 'visualization', title: chartSpec.title, id: `viz-${Date.now()}`, chartType: chartSpec.chartType }, { isRunningPython: false });

        return true;
    };

    const handlePythonForecastingOutput = (output: string | undefined, messageId: string, pythonCode?: string): boolean => {
        console.log('[handlePythonForecastingOutput] Called with type:', type);
        console.log('[handlePythonForecastingOutput] Output length:', output?.length || 0);
        
        if (type !== 'forecasting') {
            console.warn('[handlePythonForecastingOutput] Type is not forecasting, skipping');
            return false;
        }
        if (!output) {
            console.warn('[handlePythonForecastingOutput] No output provided');
            return false;
        }

        const modelDetail = extractModelDetailFromText(output);
        if (!modelDetail) {
            console.warn('[handlePythonForecastingOutput] Python execution output did not contain a valid ForecastingModelDetail JSON.');
            console.warn('[handlePythonForecastingOutput] Output was:', output.substring(0, 500));
            setMessages(prev => prev.map(msg =>
                msg.id === messageId
                    ? { ...msg, isRunningPython: false }
                    : msg
            ));
            return false;
        }

        // Enrich the model detail with execution data
        console.log('[handlePythonForecastingOutput] Enriching model with execution data...');
        
        // Add the actual Python code that was executed
        if (pythonCode) {
            modelDetail.pythonCodeSnippet = pythonCode;
        }
        
        // Add the execution output as executionLog
        modelDetail.executionLog = output;
        
        // Parse diagnostic charts from output
        const diagnosticCharts = extractDiagnosticChartsFromOutput(output);
        if (diagnosticCharts.length > 0) {
            modelDetail.diagnosticCharts = diagnosticCharts;
            console.log('[handlePythonForecastingOutput] Found', diagnosticCharts.length, 'diagnostic charts');
        }

        // Add the trained model
        if (!onNewForecastingModel) {
            console.error('[handlePythonForecastingOutput] onNewForecastingModel callback is not defined!');
            setMessages(prev => prev.map(msg =>
                msg.id === messageId
                    ? { ...msg, isRunningPython: false }
                    : msg
            ));
            return false;
        }

        console.log('[handlePythonForecastingOutput] Successfully extracted model detail:', modelDetail.modelName);
        console.log('[handlePythonForecastingOutput] Calling onNewForecastingModel...');
        onNewForecastingModel(modelDetail);
        appendGeneratedItem(messageId, { type: 'model', title: modelDetail.modelName, id: `model-${Date.now()}`, modelType: modelDetail.modelType }, { isRunningPython: false });

        console.log('[handlePythonForecastingOutput] Model added successfully!');
        return true;
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showSuggestions && suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedSuggestionIndex(prev => 
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedSuggestionIndex(prev => 
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                insertSuggestion(suggestions[selectedSuggestionIndex]);
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
            }
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as any);
        }
    };

    const renderGeneratedItem = (item: GeneratedItem) => {
        const handleItemClick = () => {
            // Don't close the panel - just focus on the generated item
            if (item.type === 'chart-edit' && item.vizIndex !== undefined) {
                // Find the edited chart and scroll to it
                const chartElements = document.querySelectorAll('.chart-card');
                const chartElement = chartElements[item.vizIndex];
                if (chartElement) {
                    chartElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                    // Add highlight effect
                    chartElement.classList.add('highlight-edited');
                    setTimeout(() => {
                        chartElement.classList.remove('highlight-edited');
                    }, 2000);
                }
            } else if (item.type === 'visualization') {
                // Focus on the first visualization (most recently added)
                const chartElement = document.querySelector('.chart-card:first-child, .chart-container:first-child, [data-chart-id]:first-child');
                if (chartElement) {
                    chartElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                    // Add highlight effect
                    chartElement.classList.add('highlight-generated');
                    setTimeout(() => {
                        chartElement.classList.remove('highlight-generated');
                    }, 1500);
                }
            } else {
                // Focus on the first model (most recently added) - try multiple selectors
                const modelElement = document.querySelector(
                    '.model-card:first-child, .model-execution-card:first-child, .forecasting-model:first-child, [data-model-id]:first-child, .model-result:first-child'
                );
                if (modelElement) {
                    modelElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                    // Add highlight effect
                    modelElement.classList.add('highlight-generated');
                    setTimeout(() => {
                        modelElement.classList.remove('highlight-generated');
                    }, 1500);
                }
            }
        };

        return (
            <div
                key={item.id}
                className={`generated-item ${item.type === 'chart-edit' ? 'chart-edit-item' : ''}`}
                data-type={item.type}
                onClick={handleItemClick}
                title={`Click to view ${item.type === 'chart-edit' ? 'edited' : item.type}`}
            >
                <div className="generated-item-icon">
                    {item.type === 'chart-edit' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                    ) : item.type === 'visualization' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 3v18h18" />
                            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
                        </svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    )}
                </div>
                <div className="generated-item-content">
                    <div className="generated-item-title">
                        {item.type === 'chart-edit' && item.originalTitle ? 
                            `${item.originalTitle} → ${item.title}` : 
                            item.title}
                    </div>
                    <div className="generated-item-type">
                        {item.type === 'chart-edit' ? 'Edited Chart' : 
                         item.type === 'visualization' ? item.chartType : 
                         item.modelType}
                    </div>
                </div>
                <div className="generated-item-action">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </div>
            </div>
        );
    };

    const renderMessage = (message: ChatMessage) => {
        // Simple markdown rendering for basic formatting
        let content = message.content;

        // Remove JSON code blocks from display
        content = content.replace(/```(?:visualization-json|model-json|chart-edit-json)\s*[\s\S]*?\s*```/g, '');

        // Basic markdown rendering
        content = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');

        return (
            <div className={`chat-message ${message.role}`} key={message.id}>
                <div className="message-content">
                    <div
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                    {message.isStreaming && (
                        <span className="streaming-indicator">▋</span>
                    )}
                </div>

                {/* Show generating indicators */}
                {message.isGeneratingVisualization && (
                    <div className="generating-card">
                        <div className="generating-spinner">
                            <svg className="spinning" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" strokeDasharray="31.4" strokeDashoffset="7.85" />
                            </svg>
                        </div>
                        <span>Generating Visualization...</span>
                    </div>
                )}
                {message.isGeneratingEdit && (
                    <div className="generating-card">
                        <div className="generating-spinner">
                            <svg className="spinning" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" strokeDasharray="31.4" strokeDashoffset="7.85" />
                            </svg>
                        </div>
                        <span>Editing Chart...</span>
                    </div>
                )}
                {message.isGeneratingModel && (
                    <div className="generating-card">
                        <div className="generating-spinner">
                            <svg className="spinning" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" strokeDasharray="31.4" strokeDashoffset="7.85" />
                            </svg>
                        </div>
                        <span>Training Model...</span>
                    </div>
                )}
                {message.isRunningPython && (
                    <div className="generating-card">
                        <div className="generating-spinner">
                            <svg className="spinning" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2v4" />
                                <path d="M12 18v4" />
                                <path d="M4.93 4.93l2.83 2.83" />
                                <path d="M16.24 16.24l2.83 2.83" />
                                <path d="M2 12h4" />
                                <path d="M18 12h4" />
                                <path d="M4.93 19.07l2.83-2.83" />
                                <path d="M16.24 7.76l2.83-2.83" />
                            </svg>
                        </div>
                        <span>Writing Python Code...</span>
                    </div>
                )}

                {/* Show executing function indicator */}
                {message.executingFunction && (
                    <div className="generating-card tool-execution-card">
                        <div className="generating-spinner">
                            <svg className="spinning" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                        </div>
                        <span>Executing Tool: <code>{message.executingFunction}</code>...</span>
                    </div>
                )}

                {/* Render completed function calls */}
                {message.completedFunctions && message.completedFunctions.length > 0 && (
                    <div className="chat-functions-container">
                        {message.completedFunctions.map((fn, fIdx) => {
                            const cmd = fn.args?.command || fn.args?.cmd || (typeof fn.args === 'string' ? fn.args : '');
                            const outStr = typeof fn.result === 'object' ? (fn.result?.output ?? JSON.stringify(fn.result, null, 2)) : String(fn.result);
                            return (
                                <div key={fIdx} className="chat-function-card">
                                    <div className="chat-function-header">
                                        <FiZap size={12} className="chat-function-icon" />
                                        <span className="chat-function-name">Tool: <code>{fn.name}</code></span>
                                        <span className="chat-function-tag">Executed</span>
                                    </div>
                                    {cmd && (
                                        <div style={{ padding: '6px 10px', fontSize: '11px', fontFamily: 'monospace', color: '#9ca3af', borderBottom: '1px solid #222', background: '#0a0a0a', wordBreak: 'break-all' }}>
                                            $ {cmd}
                                        </div>
                                    )}
                                    {outStr && (
                                        <div className="chat-function-result">
                                            <pre><code>{outStr}</code></pre>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Render multimodal image outputs */}
                {message.imageOutputs && message.imageOutputs.length > 0 && (
                    <div className="chat-image-outputs">
                        {message.imageOutputs.map((img, imgIdx) => {
                            const src = img.url || (img.data ? `data:${img.mimeType || 'image/png'};base64,${img.data}` : '');
                            if (!src) return null;
                            return (
                                <div key={imgIdx} className="chat-image-card">
                                    <img src={src} alt={`Generated output ${imgIdx + 1}`} className="chat-rendered-image" />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Render citations if available */}
                {message.citations && message.citations.length > 0 && (
                    <div className="chat-citations-card">
                        <div className="chat-citations-title">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="2" y1="12" x2="22" y2="12" />
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                            </svg>
                            <span>Web Sources & Citations ({message.citations.length})</span>
                        </div>
                        <div className="chat-citations-list">
                            {message.citations.map((c, cIdx) => (
                                <a
                                    key={cIdx}
                                    href={c.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="citation-badge"
                                    title={c.url}
                                >
                                    <span className="citation-badge-index">[{cIdx + 1}]</span>
                                    <span className="citation-badge-text">{c.title || c.url}</span>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                        <polyline points="15 3 21 3 21 9" />
                                        <line x1="10" y1="14" x2="21" y2="3" />
                                    </svg>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Render generated items */}
                {(message.pythonCodeSnippet || message.pythonExecutionOutput) && (
                    <div className={`python-execution-card ${message.pythonDetailsExpanded ? 'expanded' : ''}`}>
                        <button
                            type="button"
                            className="python-execution-toggle"
                            onClick={() => togglePythonDetails(message.id)}
                        >
                            <span className="python-execution-title">Python Execution Details</span>
                            <span className="python-execution-status">
                                {message.pythonExecutionOutcome === 'OK' ? 'Success' : message.pythonExecutionOutcome || 'Pending'}
                            </span>
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className={message.pythonDetailsExpanded ? 'expanded' : ''}
                            >
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                        {message.pythonDetailsExpanded && (
                            <div className="python-execution-content">
                                {message.pythonCodeSnippet && (
                                    <div className="python-section">
                                        <div className="python-section-header">Python Code</div>
                                        <pre className="python-code-block">
{message.pythonCodeSnippet}
                                        </pre>
                                    </div>
                                )}
                                {message.pythonExecutionOutput && (
                                    <div className="python-section">
                                        <div className="python-section-header">Execution Output</div>
                                        <pre className="python-output-block">
{message.pythonExecutionOutput}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {message.generatedItems && message.generatedItems.length > 0 && (
                    <div className="generated-items">
                        {message.generatedItems.map(item => renderGeneratedItem(item))}
                    </div>
                )}

                <div className="message-timestamp">
                    {message.timestamp.toLocaleTimeString()}
                </div>
            </div>
        );
    };

    return (
        <div className={`chat-side-panel ${isOpen ? 'open' : ''}`}>
            <div className="chat-header">
                <div className="chat-header-content">
                    <h3>
                        {type === 'visualization' ? 'Chat With Visualizations' : 'Chat Predictive Models'}
                    </h3>
                    <div className="model-indicator">
                        <RiGeminiFill size={16} />
                        <span>{getModelDisplayName(modelId)}</span>
                    </div>
                </div>
                <div className="chat-header-actions">
                    <button
                        onClick={clearContext}
                        className="clear-context-button"
                        title="Clear conversation context"
                        disabled={isLoading}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                        Clear Context
                    </button>
                    <button onClick={onClose} className="close-button" aria-label="Close chat">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>

            <div className="chat-messages custom-scrollbar">
                {messages.map(renderMessage)}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="chat-input-form">
                <div className="chat-input-container">
                    {showSuggestions && suggestions.length > 0 && (
                        <div 
                            className="chart-suggestions"
                            style={{
                                position: 'absolute',
                                bottom: '100%',
                                left: 0,
                                right: 0,
                                marginBottom: '4px',
                                zIndex: 1000
                            }}
                        >
                            {suggestions.map((suggestion, index) => (
                                <div
                                    key={`${suggestion.title}-${index}`}
                                    className={`suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}`}
                                    onClick={() => insertSuggestion(suggestion)}
                                    onMouseEnter={() => setSelectedSuggestionIndex(index)}
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        backgroundColor: index === selectedSuggestionIndex ? 'var(--bg-hover)' : 'var(--card-bg-color)',
                                        borderBottom: '1px solid var(--border-color)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 3v18h18" />
                                        <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
                                    </svg>
                                    <span>{suggestion.title}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={`Type @ to reference charts, or ask me anything...`}
                        className="chat-input"
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className="send-button"
                        disabled={!inputValue.trim() || isLoading}
                        aria-label="Send message"
                    >
                        {isLoading ? (
                            <svg className="loading-spinner" width="20" height="20" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="31.416" strokeDashoffset="31.416">
                                    <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite" />
                                    <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite" />
                                </circle>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
                            </svg>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};
