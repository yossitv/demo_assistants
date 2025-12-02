import { NextRequest, NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ conversation_id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { conversation_id } = await context.params;
  const apiKey = process.env.TAVUS_API_KEY;
  const baseUrl = process.env.TAVUS_API_BASE || "https://tavusapi.com";

  if (!apiKey) {
    return NextResponse.json({ error: "TAVUS_API_KEY not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(`${baseUrl}/v2/conversations/${conversation_id}/end`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: error.error || `Failed to end conversation (${response.status})` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to end conversation:", error);
    return NextResponse.json({ error: "Failed to end conversation" }, { status: 500 });
  }
}
