export interface ILLMService {
    /**
     * Generates a completion response from the LLM
     * @param prompt - The complete prompt including context and user message
     * @returns Promise resolving to the generated text response
     */
    generateCompletion(prompt: string): Promise<string>;
}
//# sourceMappingURL=ILLMService.d.ts.map