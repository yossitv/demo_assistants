// Interface for LLM (Large Language Model) service
// Requirements: 4.14 - Call LLM API to generate assistant's response

export interface ILLMService {
  /**
   * Generates a completion response from the LLM
   * @param prompt - The complete prompt including context and user message
   * @returns Promise resolving to the generated text response
   */
  generateCompletion(prompt: string): Promise<string>;
}
