import {
  ContextBuilder,
  ContextSeed,
  ProductContextSeed,
  SocialContextSeed,
  isProductSeed,
} from "./types";
import { TavusError } from "../tavus/errors";

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  apiBase: string;
}

type FetchLike = typeof fetch;

export class OpenAIContextBuilder implements ContextBuilder {
  constructor(
    private readonly config: OpenAIConfig,
    private readonly fetchFn: FetchLike = fetch,
  ) {}

  async build(seed: ContextSeed): Promise<string> {
    const { apiKey, model, apiBase } = this.config;
    if (!apiKey) {
      throw new TavusError("OPENAI_API_KEY is not configured", 500);
    }

    const url = new URL("/v1/chat/completions", apiBase);
    const response = await this.safeFetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: isProductSeed(seed)
          ? buildProductMessages(seed)
          : buildSocialMessages(seed),
      }),
    });

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      const message =
        payload.error?.message ??
        `OpenAI error while building context (${response.status})`;
      throw new TavusError(message, response.status);
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new TavusError("OpenAI returned an empty context", 502);
    }

    return content;
  }

  private async safeFetch(url: string, init: RequestInit): Promise<Response> {
    try {
      return await this.fetchFn(url, init);
    } catch {
      throw new TavusError("Unable to reach OpenAI API", 500);
    }
  }
}

function buildProductMessages(seed: ProductContextSeed) {
  return [
    {
      role: "system" as const,
      content:
        "You prepare concise retail context for Tavus AI sales assistants. Respond with a short JSON object containing: product_summary (<=120 chars), selling_points (array of 3 bullet strings), and opening_question that references the provided prompt.",
    },
    { role: "user" as const, content: buildProductPrompt(seed) },
  ];
}

function buildProductPrompt(seed: ProductContextSeed): string {
  return [
    `Product name: ${seed.product.name}`,
    `Description: ${seed.product.description}`,
    `Prompt: ${seed.prompt}`,
    "Keep it concise and focused on buyer benefits.",
  ].join("\n\n");
}

function buildSocialMessages(seed: SocialContextSeed) {
  return [
    {
      role: "system" as const,
      content:
        "You summarize X (Twitter) data into a concise conversational context for Tavus voice agents. Respond with a short JSON object containing keys: persona_summary, key_topics, and question.",
    },
    { role: "user" as const, content: buildSocialPrompt(seed) },
  ];
}

function buildSocialPrompt(seed: SocialContextSeed): string {
  const metrics = seed.user.metrics;
  const metricText = metrics
    ? `Followers: ${metrics.followersCount ?? "n/a"}, Following: ${
        metrics.followingCount ?? "n/a"
      }, Tweets: ${metrics.tweetCount ?? "n/a"}`
    : "No metrics provided";

  const postLines = seed.posts
    .slice(0, 5)
    .map(
      (post) =>
        `- (${post.createdAt}) ${post.text.replace(/\s+/g, " ").trim()}`,
    )
    .join("\n");

  return [
    `User: ${seed.user.name ?? seed.user.username} (@${seed.user.username})`,
    `Bio: ${seed.user.description ?? "n/a"}`,
    `Metrics: ${metricText}`,
    `Latest posts:\n${postLines}`,
    `Conversation question: ${seed.question}`,
    "Produce JSON with persona_summary (<=120 chars), key_topics (array of 3 bullet strings), question (rephrase for Tavus).",
  ].join("\n\n");
}
