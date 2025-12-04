import { ContextBuilder, ContextSeed, isProductSeed } from "./types";
import { TavusError } from "../tavus/errors";

type FetchLike = typeof fetch;

export interface DedalusConfig {
  endpoint: string;
  apiKey?: string;
}

export class DedalusContextBuilder implements ContextBuilder {
  constructor(
    private readonly config: DedalusConfig,
    private readonly fetchFn: FetchLike = fetch,
  ) {}

  async build(seed: ContextSeed): Promise<string> {
    if (isProductSeed(seed)) {
      return JSON.stringify(
        {
          summary: "Product context",
          product: seed.product,
          prompt: seed.prompt,
        },
        null,
        2,
      );
    }

    if (!this.config.endpoint) {
      throw new TavusError("DEDALUS_CONTEXT_URL is not configured", 500);
    }

    const response = await this.safeFetch(this.config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.config.apiKey
          ? { Authorization: `Bearer ${this.config.apiKey}` }
          : {}),
      },
      body: JSON.stringify({ user: seed.user, posts: seed.posts, question: seed.question }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      context?: string;
      error?: string;
    };

    if (!response.ok) {
      throw new TavusError(
        payload.error ?? `Dedalus context service error (${response.status})`,
        response.status,
      );
    }

    if (typeof payload.context !== "string" || !payload.context.trim()) {
      throw new TavusError(
        "Dedalus context service did not return a context string",
        502,
      );
    }

    return payload.context;
  }

  private async safeFetch(url: string, init: RequestInit): Promise<Response> {
    try {
      return await this.fetchFn(url, init);
    } catch {
      throw new TavusError("Unable to reach Dedalus context service", 500);
    }
  }
}
