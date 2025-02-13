"use client";

import { useEffect, useRef, useState } from "react";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { ChatRequestBody } from "@/lib/types";

interface ChatInterfaceProps {
  chatId: Id<"chats">;
  initialMessages: Doc<"messages">[];
}

const ChatInterface = ({ chatId, initialMessages }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Doc<"messages">[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState<string>("");
  const [currentTool, setCurrentTool] = useState<{
    name: string;
    description: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedResponse]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    // Reset UI state for new message
    setInput("");
    setStreamedResponse("");
    setCurrentTool(null);
    setIsLoading(true);

    // Add user's message immediately for better UX
    const optimisticUserMessage: Doc<"messages"> = {
      _id: `temp_${Date.now()}`,
      chatId,
      content: trimmedInput,
      role: "user",
      createdAt: Date.now(),
    } as Doc<"messages">;

    setMessages((prevMessages) => [...prevMessages, optimisticUserMessage]);

    // Track complete response for saving database
    let fullResponse = "";

    // Start streaming response
    try {
      const requestBody: ChatRequestBody = {
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        newMessage: trimmedInput,
        chatId,
      };

      // Initialize SSE connection
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error("Failed to connect to SSE");
      if (!response.body) throw new Error("No response body");

      // --- Handle the stream ---
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove the optimistic user message if there was an error
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg._id !== optimisticUserMessage._id)
      );
      setStreamedResponse("error");
    }
  };

  return (
    <main className="flex flex-col h-[calc(100vh-theme(spacing.14))]">
      {/* Messages */}
      <section className="flex-1">
        <div>
          {/* Messages */}
          {messages.map((message) => (
            <div key={message._id}>{message.content}</div>
          ))}

          {/* LastMessage */}
          <div ref={messagesEndRef} />
        </div>
      </section>

      {/* footer input */}
      <footer className="border-t bg-white p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message AI Agent..."
              className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 bg-gray-50 placeholder:text-gray-500"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`absolute right-1.5 rounded-xl h-9 w-9 p-0 flex items-center justify-center transition-all ${input.trim() ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm" : "bg-gray-100 text-gray-400"}`}
            >
              <ArrowRight />
            </Button>
          </div>
        </form>
      </footer>
    </main>
  );
};

export default ChatInterface;
