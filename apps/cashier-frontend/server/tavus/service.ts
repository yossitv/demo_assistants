import { TavusConfig } from "./config";
import { TavusError } from "./errors";
import {
  CreateConversationRequest,
  CreateConversationResponse,
} from "./types";

type FetchLike = typeof fetch;

export class TavusService {
  private readonly baseUrl: string;
  private readonly headers: HeadersInit;

  constructor(
    private readonly config: TavusConfig,
    private readonly fetchFn: FetchLike = fetch,
  ) {
    this.baseUrl = config.baseUrl;
    this.headers = {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
    };
  }

  async createConversation(
    payload: CreateConversationRequest,
  ): Promise<CreateConversationResponse> {
    const url = new URL("/v2/conversations", this.baseUrl);

    let response: Response;

    try {
      response = await this.fetchFn(url.toString(), {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(payload),
      });
    } catch {
      throw new TavusError("Unable to reach Tavus API", 500);
    }

    const text = await response.text();
    const body = text ? (JSON.parse(text) as Record<string, unknown>) : {};

    if (!response.ok) {
      const message =
        typeof body?.message === "string"
          ? body.message
          : `Tavus API error (${response.status})`;
      throw new TavusError(message, response.status);
    }

    if (typeof body.conversation_url !== "string") {
      throw new TavusError("conversation_url is missing in Tavus response", 502);
    }

    return body as CreateConversationResponse;
  }
}
