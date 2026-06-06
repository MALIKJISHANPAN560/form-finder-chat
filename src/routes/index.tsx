import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileText,
  Briefcase,
  GraduationCap,
  School,
  Trophy,
  Search,
  Sparkles,
} from "lucide-react";
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
      { title: "Shan Form Finder — Smart Student Information Assistant" },
      {
        name: "description",
        content:
          "Find Government Forms, Jobs, Scholarships, Admissions, Results and Exam Information instantly.",
      },
      { property: "og:title", content: "Shan Form Finder" },
      {
        property: "og:description",
        content: "Your Smart Student Information Assistant.",
      },
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
      conversationId:
        typeof parsed.conversationId === "string" ? parsed.conversationId : "",
    };
  } catch {
    return { messages: [], conversationId: "" };
  }
}

const FEATURES = [
  { icon: FileText, title: "Government Forms", desc: "Official application forms" },
  { icon: Briefcase, title: "Government Jobs", desc: "Latest job notifications" },
  { icon: GraduationCap, title: "Scholarships", desc: "Financial aid & grants" },
  { icon: School, title: "College Admissions", desc: "Entrance & enrolment info" },
  { icon: Trophy, title: "Results & Exams", desc: "Exam dates and results" },
];

const POPULAR = [
  "Aadhaar Card",
  "PAN Card",
  "Scholarship",
  "Army Agniveer",
  "SSC CGL",
];

function Index() {
  const sendMessage = useServerFn(sendDifyMessage);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [status, setStatus] = useState<"idle" | "submitted">("idle");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const s = loadState();
    setMessages(s.messages);
    setConversationId(s.conversationId);
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
    textareaRef.current = el;
  }, [status]);

  const submitText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || status !== "idle") return;
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setStatus("submitted");
      try {
        const result = await sendMessage({
          data: { query: trimmed, conversationId },
        });
        if (result.conversationId) setConversationId(result.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: result.error
              ? result.error
              : result.answer ||
                "I couldn't find an answer for that. Try rephrasing your request.",
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

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      void submitText(message.text);
    },
    [submitText],
  );

  const handleQuickQuery = useCallback(
    (q: string) => {
      chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      void submitText(q);
    },
    [submitText],
  );

  const clearChat = () => {
    setMessages([]);
    setConversationId("");
  };

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3">
          <img
            src={logo}
            alt="Shan Form Finder logo"
            width={40}
            height={40}
            className="h-10 w-10 rounded-xl object-contain"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              Shan Form Finder
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              Smart Student Information Assistant
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

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 sm:px-6">
        <section
          className="relative mt-5 overflow-hidden rounded-3xl px-5 py-10 text-center sm:px-10 sm:py-16"
          style={{
            background: "var(--gradient-hero)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_60%)]" />
          <div className="relative mx-auto max-w-2xl text-primary-foreground">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> AI-powered Student Helper
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
              Shan Form Finder
            </h2>
            <p className="mt-3 text-lg font-medium text-white/95 sm:text-xl">
              Your Smart Student Information Assistant
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/85 sm:text-base">
              Find Government Forms, Jobs, Scholarships, Admissions, Results
              and Exam Information instantly.
            </p>
            <button
              type="button"
              onClick={() => {
                chatRef.current?.scrollIntoView({ behavior: "smooth" });
                setTimeout(() => textareaRef.current?.focus(), 400);
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-md transition-transform hover:scale-[1.03]"
            >
              <Search className="h-4 w-4" /> Start searching
            </button>
          </div>
        </section>

        <section className="mt-8">
          <h3 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            What you can find
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {title}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h3 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Popular searches
          </h3>
          <div className="flex flex-wrap gap-2">
            {POPULAR.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleQuickQuery(q)}
                disabled={status !== "idle"}
                className="rounded-full border border-primary/25 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </section>

        <section
          ref={chatRef}
          className="mt-8 flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm"
        >
          <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Search className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Ask Shan</div>
              <div className="text-xs text-muted-foreground">
                Type your question below to get the official link
              </div>
            </div>
          </div>

          <Conversation className="min-h-[360px] flex-1">
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
                      <MessageContent className="text-base">
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

          <div className="border-t border-border/60 bg-background/40 px-3 pb-3 pt-3 sm:px-4">
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
        </section>

        <footer className="mt-8 mb-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Shan Form Finder — Built for students.
        </footer>
      </main>
    </div>
  );
}