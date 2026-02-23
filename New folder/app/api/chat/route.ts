import { NextRequest, NextResponse } from "next/server";
// Fixed paths to bypass the "Module not found" error
import { generateAvikaResponse } from "../../../lib/avika";
import { Message } from "../../../types";

type ChatRequest = {
  messages: Message[];
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;

    if (!body?.messages || body.messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    // This now uses your MONGODB_URI environment variable for session memory
    const result = await generateAvikaResponse(body.messages);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error generating Avika response:", error);
    return NextResponse.json(
      {
        text: "I'm having trouble connecting to my database. Let's try again in a second.",
        videos: [],
        mood: {
          dominantMood: "general",
          supportingMoods: [],
          confidence: 0,
        },
      },
      { status: 500 }
    );
  }
}
