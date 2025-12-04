import { ContextBuilder } from "./types";
import { LocalContextBuilder } from "./localBuilder";
import {
  OpenAIContextBuilder,
  OpenAIConfig,
} from "./openaiBuilder";
import {
  DedalusContextBuilder,
  DedalusConfig,
} from "./dedalusBuilder";

let cachedBuilder: ContextBuilder | null = null;

export function resolveContextBuilder(): ContextBuilder {
  if (cachedBuilder) {
    return cachedBuilder;
  }

  const provider = (process.env.CONTEXT_PROVIDER ?? "local").toLowerCase();

  if (provider === "openai") {
    cachedBuilder = new OpenAIContextBuilder(getOpenAIConfig());
    return cachedBuilder;
  }

  if (provider === "dedalus") {
    cachedBuilder = new DedalusContextBuilder(getDedalusConfig());
    return cachedBuilder;
  }

  cachedBuilder = new LocalContextBuilder();
  return cachedBuilder;
}

function getOpenAIConfig(): OpenAIConfig {
  return {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    apiBase: process.env.OPENAI_API_BASE ?? "https://api.openai.com",
    model: process.env.OPENAI_CONTEXT_MODEL ?? "gpt-4o-mini",
  };
}

function getDedalusConfig(): DedalusConfig {
  return {
    endpoint: process.env.DEDALUS_CONTEXT_URL ?? "",
    apiKey: process.env.DEDALUS_API_KEY,
  };
}

export function resetContextBuilder() {
  cachedBuilder = null;
}
