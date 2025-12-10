import * as vscode from 'vscode';
import { WriteTexSettings } from './types';
import { getContextSummary } from './context';
import { OpenAIMessage, OpenAIRequest } from './openai';

export interface ProxyRequest {
    model: string;
    messages: OpenAIMessage[];
    stream?: boolean;
    max_tokens?: number;
    temperature?: number;
    [key: string]: any; // Allow other OpenAI parameters
}

/**
 * Injects editor context into OpenAI messages for vision requests
 */
export function injectContext(messages: OpenAIMessage[]): OpenAIMessage[] {
    const context = getContextSummary();
    if (!context) {
        return messages; // No active editor, pass through unchanged
    }

    // Check if this is a vision request (contains images)
    const hasImages = messages.some(msg =>
        Array.isArray(msg.content) &&
        msg.content.some(part => part.type === 'image_url')
    );

    if (!hasImages) {
        return messages; // Not a vision request, pass through
    }

    // Build context instruction
    const marker = '<<<User Cursor Here>>>';
    const contextInstruction = `You are an OCR expert for LaTeX/TikZ/Markdown. The user is working in their code editor at the following location:

File: ${context.file}
Language: ${context.languageId}
Mode hint: ${context.mode}

Surrounding context (cursor marked with '${marker}'):
--------------------
${context.surroundingText}
--------------------

When extracting content from images, return ONLY the exact code necessary. No commentary, no explanations, no prose, no code blocks. Prefer formatting consistent with the provided editor context. Do not include preamble/packages. If TikZ content is detected, output ONLY the body unless the context indicates the absence of a tikzpicture wrapper. If math, choose inline $...$ vs display \\[...\\] consistent with context.`;

    // Inject context as the first system message
    const contextMessage: OpenAIMessage = {
        role: 'system',
        content: contextInstruction
    };

    return [contextMessage, ...messages];
}

/**
 * Transforms a proxy request into an OpenAI request with context
 */
export function transformRequest(proxyReq: ProxyRequest, settings: WriteTexSettings): OpenAIRequest {
    const messagesWithContext = injectContext(proxyReq.messages);

    return {
        model: settings.apiModel, // Use configured model
        messages: messagesWithContext,
        stream: proxyReq.stream !== false, // Default to streaming
        max_tokens: proxyReq.max_tokens || 2000
    };
}
