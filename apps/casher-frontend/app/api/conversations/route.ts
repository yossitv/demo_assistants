import { NextRequest, NextResponse } from "next/server";

import {
  ConversationRequestBody,
  handleCreateConversation,
} from "@/server/tavus/handler";
import { TavusError } from "@/server/tavus/errors";
import { resolveContextBuilder } from "@/server/context/factory";

export async function POST(request: NextRequest) {
  let payload: ConversationRequestBody;

  try {
    payload = (await request.json()) as ConversationRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const { context_seed, ...conversationPayload } = payload;

  if (!conversationPayload.conversational_context && context_seed) {
    try {
      const builder = resolveContextBuilder();
      conversationPayload.conversational_context = await builder.build(
        context_seed,
      );
    } catch (error) {
      const message =
        error instanceof TavusError
          ? error.message
          : "Failed to build conversational context";
      const status = error instanceof TavusError ? error.statusCode : 502;
      return NextResponse.json({ error: message }, { status });
    }
  }

  try {
    const result = await handleCreateConversation(conversationPayload);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TavusError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
