export interface CreateConversationRequest {
  replica_id?: string;
  persona_id?: string;
  audio_only?: boolean;
  conversation_name?: string;
  conversational_context?: string;
  custom_greeting?: string;
  test_mode?: boolean;
  properties?: ConversationProperties;
}

export interface CreateConversationResponse {
  conversation_url: string;
  [key: string]: unknown;
}

export interface ConversationProperties {
  participant_left_timeout?: number;
  language?: string;
  [key: string]: unknown;
}
