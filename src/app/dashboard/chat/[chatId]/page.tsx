import { auth } from "@clerk/nextjs/server";
import { Id } from "../../../../../convex/_generated/dataModel";
import { redirect } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import ChatInterface from "@/components/ChatInterface";

interface ChatPageProps {
  params: Promise<{
    chatId: Id<"chats">;
  }>;
}

const ChatPage = async ({ params }: ChatPageProps) => {
  const { chatId } = await params;

  // Get user authentication
  const { userId } = await auth();

  if (!userId) {
    return redirect("/");
  }

  try {
    // Get Convex client and fetch chat and messages
    const convex = getConvexClient();

    const initialMessages = await convex.query(api.message.list, { chatId });

    return (
      <div className="flex-1 overflow-hidden">
        <ChatInterface chatId={chatId} initialMessages={initialMessages} />
      </div>
    );
  } catch (error) {
    console.error("Error fetching chat or messages:", error);
    redirect("/dashboard");
  }
};

export default ChatPage;
