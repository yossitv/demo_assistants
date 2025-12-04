import { getTavusConfig } from "./config";
import { TavusError } from "./errors";
import { TavusService } from "./service";
import { CreateConversationRequest, ConversationProperties } from "./types";
import { ContextSeed } from "../context/types";

const DEFAULT_LANGUAGE = "japanese";

export interface ConversationRequestBody {
  replica_id?: string;
  persona_id?: string;
  audio_only?: boolean;
  conversation_name?: string;
  conversational_context?: string;
  custom_greeting?: string;
  test_mode?: boolean;
  language?: string;
  properties?: ConversationProperties;
  context_seed?: ContextSeed;
}

export async function handleCreateConversation(
  body: ConversationRequestBody,
): Promise<{ conversation_url: string }> {
  const config = getTavusConfig();
  const replicaId = body.replica_id ?? config.defaultReplicaId;
  const personaId = body.persona_id ?? config.defaultPersonaId;

  if (!replicaId && !personaId) {
    throw new TavusError(
      "Either replica_id or persona_id must be provided",
      400,
    );
  }

  const language =
    normalizeString(body.language) ??
    normalizeString(body.properties?.language) ??
    DEFAULT_LANGUAGE;

  const payload: CreateConversationRequest = {
    ...pickBoolean("audio_only", body.audio_only),
    ...pickBoolean("test_mode", body.test_mode),
    ...pickString("replica_id", replicaId),
    ...pickString("persona_id", personaId),
    ...pickString("conversation_name", body.conversation_name),
    ...pickString("conversational_context", body.conversational_context),
    ...pickString("custom_greeting", body.custom_greeting),
    ...pickProperties(body.properties, language),
  };

  const service = new TavusService(config);
  return service.createConversation(payload);
}

function pickString(key: string, value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return {};
  }
  return { [key]: trimmed };
}

function pickBoolean(key: string, value: boolean | undefined) {
  if (typeof value === "boolean") {
    return { [key]: value };
  }

  return {};
}

function pickProperties(
  properties: ConversationProperties | undefined,
  language?: string,
) {
  const normalized: Record<string, unknown> = {};

  if (properties) {
    for (const [key, value] of Object.entries(properties)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed) {
          normalized[key] = trimmed;
        }
        continue;
      }

      normalized[key] = value;
    }
  }

  const normalizedLanguage = normalizeString(language);
  if (normalizedLanguage) {
    normalized.language = normalizedLanguage;
  }

  if (Object.keys(normalized).length === 0) {
    return {};
  }

  return { properties: normalized };
}

function normalizeString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}
