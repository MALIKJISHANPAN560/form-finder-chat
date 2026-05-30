import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  query: z.string().min(1).max(4000),
  conversationId: z.string().max(200).optional().default(""),
});

export const sendDifyMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.DIFY_API_KEY;
    if (!apiKey) {
      return {
        answer: "",
        conversationId: "",
        error: "Server is not configured. Please add the DIFY_API_KEY secret.",
      };
    }

    try {
      const res = await fetch("https://api.dify.ai/v1/chat-messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: {},
          query: data.query,
          response_mode: "blocking",
          user: "shop-user",
          conversation_id: data.conversationId ?? "",
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Dify error", res.status, text);
        return {
          answer: "",
          conversationId: data.conversationId ?? "",
          error: `Assistant unavailable (${res.status}).`,
        };
      }

      const json = (await res.json()) as {
        answer?: string;
        conversation_id?: string;
      };

      return {
        answer: json.answer ?? "",
        conversationId: json.conversation_id ?? data.conversationId ?? "",
        error: null as string | null,
      };
    } catch (err) {
      console.error("Dify request failed", err);
      return {
        answer: "",
        conversationId: data.conversationId ?? "",
        error: "Network error reaching the assistant. Please try again.",
      };
    }
  });