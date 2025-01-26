import { getConvexClient } from "@/lib/convex";
import {
  ChatRequestBody,
  SSE_DATA_PREFIX,
  SSE_LINE_DELIMITER,
  StreamMessage,
  StreamMessageType,
} from "@/lib/types";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Response("Unauthorized", { status: 401 });

    const { messages, newMessage, chatId } =
      (await req.json()) as ChatRequestBody;

    const convex = getConvexClient();

    // Create stream with large queue strategy for better performance
    const stream = new TransformStream({}, { highWaterMark: 1024 });
    const writer = stream.writable.getWriter();

    const response = new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });

    const startStream = async () => {
      try {
        // Stream will be implemented here

        // Send initial connection established message
        await sendSSEMessage(writer, { type: StreamMessageType.Connected });

        // Send user message to Convex
        await convex.mutation(api.message.send, {
          chatId,
          content: newMessage,
        });
      } catch (error) {
        console.error("Error in chat API:", error);
        return NextResponse.json(
          { error: "Failed to process chat request" } as const,
          { status: 500 }
        );
      }
    };

    startStream();

    return response;
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      {
        error: "Failed to process chat request",
      } as const,
      { status: 500 }
    );
  }
}

const sendSSEMessage = async (
  writer: WritableStreamDefaultWriter<Uint8Array>,
  data: StreamMessage
) => {
  const encoder = new TextEncoder();
  return writer.write(
    encoder.encode(
      `${SSE_DATA_PREFIX}${JSON.stringify(data)}${SSE_LINE_DELIMITER}`
    )
  );
};
