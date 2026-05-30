import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { sendDifyMessage } from "@/lib/dify.functions";
import logo from "@/assets/form-finder-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Form Finder — Official Forms, Fast" },
      { name: "description", content: "Ask for any form and get the official link, instantly." },
      { property: "og:title", content: "Form Finder" },
      { property: "og:description", content: "Ask for any form and get the official link, instantly." },
    ],
  }),
  component: Index,
});

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  error?: boolean;
};

const STORAGE_KEY = "form-finder:state:v1";

function loadState(): { messages: ChatMessage[]; conversationId: string } {
  if (typeof window === "undefined") return { messages: [], conversationId: "" };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { messages: [], conversationId: "" };
    const parsed = JSON.parse(raw);
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      conversationId: typeof parsed.conversationId === "string" ? parsed.conversationId : "",
    };
  } catch {
    return { messages: [], conversationId: "" };
  }
}

function Index() {
  const sendMessage = useServerFn(sendDifyMessage);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [status, setStatus] = useState<"idle" | "submitted">("idle");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const { messages, conversationId } = loadState();
    setMessages(messages);
    setConversationId(conversationId);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ messages, conversationId }),
    );
  }, [messages, conversationId]);

  useEffect(() => {
    const el = document.querySelector<HTMLTextAreaElement>(
      'textarea[data-form-finder-input="true"]',
    );
    el?.focus();
    textareaRef.current = el;
  }, [status]);

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const text = message.text.trim();
      if (!text || status !== "idle") return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text,
      };
      setMessages((prev) => [...prev, userMsg]);
      setStatus("submitted");

      try {
        const result = await sendMessage({
          data: { query: text, conversationId },
        });
        if (result.conversationId) setConversationId(result.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: result.error
              ? result.error
              : result.answer || "I couldn't find an answer for that. Try rephrasing your request.",
            error: Boolean(result.error),
          },
        ]);
      } catch (err) {
        console.error(err);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: "Something went wrong. Please try again.",
            error: true,
          },
        ]);
      } finally {
        setStatus("idle");
      }
    },
    [conversationId, sendMessage, status],
  );

  const clearChat = () => {
    setMessages([]);
    setConversationId("");
  };

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
          <img
            src={logo}
            alt="Form Finder logo"
            width={40}
            height={40}
            className="h-10 w-10 rounded-xl object-contain"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Form Finder
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              Ask for any form and get the official link
            </p>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              className="rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              New chat
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-2 sm:px-4">
        <Conversation className="flex-1">
          <ConversationContent className="px-2 py-4 sm:px-4">
            {messages.length === 0 ? (
              <ConversationEmptyState
                icon={
                  <img
                    src={logo}
                    alt=""
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-2xl object-contain"
                  />
                }
                title="What form can I find for you?"
                description={
                  'Try: "give me the army recruitment form" or "passport renewal form".'
                }
              />
            ) : (
              messages.map((m) => (
                <Message from={m.role} key={m.id}>
                  {m.role === "assistant" ? (
                    <div className="flex w-full flex-col gap-1">
                      <MessageResponse
                        className={
                          m.error
                            ? "text-base leading-relaxed text-destructive"
                            : "text-base leading-relaxed"
                        }
                      >
                        {m.text}
                      </MessageResponse>
                    </div>
                  ) : (
                    <MessageContent variant="contained" className="text-base">
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    </MessageContent>
                  )}
                </Message>
              ))
            )}

            {status === "submitted" && (
              <Message from="assistant">
                <Shimmer className="text-base">Looking up the form…</Shimmer>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="sticky bottom-0 z-10 bg-gradient-to-t from-background via-background to-background/0 px-2 pb-4 pt-2 sm:px-4">
          <PromptInput
            onSubmit={handleSubmit}
            className="rounded-2xl border-border/70 shadow-sm"
          >
            <PromptInputTextarea
              data-form-finder-input="true"
              placeholder="Ask for a form, e.g. ‘army recruitment form’"
              className="min-h-[56px] text-base"
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit
                status={status === "submitted" ? "submitted" : undefined}
                disabled={status !== "idle"}
              />
            </PromptInputFooter>
          </PromptInput>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Always verify links open the official government source.
          </p>
        </div>
      </main>
    </div>
  );
}
