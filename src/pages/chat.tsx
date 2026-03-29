import { useCallback, useRef, useState } from "react";
import { Sidebar, type SidebarHandle } from "@/components/sidebar";
import { ChatView } from "@/components/chat/chat-view";

export function ChatPage() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const sidebarRef = useRef<SidebarHandle>(null);

  const handleTitleGenerated = useCallback((conversationId: string, title: string) => {
    sidebarRef.current?.updateTitle(conversationId, title);
  }, []);

  return (
    <>
      <Sidebar
        ref={sidebarRef}
        activeId={activeConversationId}
        onSelect={(id) => setActiveConversationId(id || null)}
      />
      <main className="flex-1 flex flex-col min-w-0">
        {activeConversationId ? (
          <ChatView
            conversationId={activeConversationId}
            onTitleGenerated={handleTitleGenerated}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Volund</h2>
              <p className="text-sm">
                Select a conversation or create a new one to get started.
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
