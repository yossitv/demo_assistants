export type DeltaRole = 'assistant';
export interface ChatCompletionChunkDelta {
    role?: DeltaRole;
    content?: string;
}
export interface ChatCompletionChunkChoice {
    index: number;
    delta: ChatCompletionChunkDelta;
    finish_reason: null | 'stop';
}
export interface ChatCompletionChunk {
    id: string;
    object: 'chat.completion.chunk';
    created: number;
    model: string;
    choices: [ChatCompletionChunkChoice];
}
export declare const SSE_DONE_EVENT = "data: [DONE]\n\n";
export declare const generateChunkId: () => string;
export declare const createInitialChunk: (params: {
    id: string;
    model: string;
    created?: number;
}) => ChatCompletionChunk;
export declare const createContentChunk: (params: {
    id: string;
    model: string;
    content: string;
    created?: number;
}) => ChatCompletionChunk;
export declare const createFinalChunk: (params: {
    id: string;
    model: string;
    created?: number;
}) => ChatCompletionChunk;
export declare const formatSseEvent: (payload: unknown) => string;
export declare const splitAnswerIntoChunks: (answer: string, requestedChunkSize?: number) => string[];
//# sourceMappingURL=sse.d.ts.map