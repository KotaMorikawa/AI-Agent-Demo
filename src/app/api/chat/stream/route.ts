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
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { submitQuestion } from "@/lib/langgraph";

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

        // Convert messages to LangChain format
        const langChainMessages = [
          ...messages.map((msg) =>
            msg.role === "user"
              ? new HumanMessage(msg.content)
              : new AIMessage(msg.content)
          ),
          new HumanMessage(newMessage),
        ];

        try {
          const eventStream = await submitQuestion(langChainMessages, chatId);

          // Process the events
          for await (const event of eventStream) {
            if (event.event === "on_chat_model_stream") {
              const token = event.data.chunk;
              if (token) {
                // AIMessageChunkからテキストを取得（形式に応じて処理を分ける）
                let text;

                // 配列形式のcontentの場合
                if (Array.isArray(token.content) && token.content.length > 0) {
                  const content = token.content[0];
                  text =
                    typeof content === "object" && "text" in content
                      ? content.text
                      : content;
                }
                // 文字列形式のcontentの場合
                else if (typeof token.content === "string") {
                  text = token.content;
                }

                if (text) {
                  await sendSSEMessage(writer, {
                    type: StreamMessageType.Token,
                    token: text,
                  });
                }
              }
            } else if (event.event === "on_tool_start") {
              await sendSSEMessage(writer, {
                type: StreamMessageType.ToolStart,
                tool: event.name || "unknown",
                input: event.data.input,
              });
            } else if (event.event === "on_tool_end") {
              let toolName = "unknown";
              const toolOutput = event.data.output;

              // ToolMessageの作成を試みる
              try {
                const toolMessage = new ToolMessage(event.data.output);
                if (toolMessage.lc_kwargs?.name) {
                  toolName = toolMessage.lc_kwargs.name;
                } else if (event.name) {
                  toolName = event.name;
                }
              } catch {
                // エラー時はevent.nameを使用
                if (event.name) {
                  toolName = event.name;
                }
              }

              // ツール実行結果を送信
              await sendSSEMessage(writer, {
                type: StreamMessageType.ToolEnd,
                tool: toolName,
                output:
                  typeof toolOutput === "object"
                    ? JSON.stringify(toolOutput, null, 2)
                    : String(toolOutput),
              });
            }
          }

          // Send completion message without storing the response
          await sendSSEMessage(writer, {
            type: StreamMessageType.Done,
          });
        } catch (streamError) {
          console.error("Error in event stream:", streamError);
          await sendSSEMessage(writer, {
            type: StreamMessageType.Error,
            error:
              streamError instanceof Error
                ? streamError.message
                : "Stream processing failed",
          });
        }
      } catch (error) {
        console.error("Error in stream:", error);
        await sendSSEMessage(writer, {
          type: StreamMessageType.Error,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        try {
          await writer.close();
        } catch (closeError) {
          console.error("Error closing writer:", closeError);
        }
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
