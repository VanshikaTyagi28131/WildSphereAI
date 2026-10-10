import type { Express } from "express";

export const GEMMA_MODEL =
  process.env.OPENROUTER_GEMMA_MODEL || "google/gemma-3-4b-it";

type ChatContent = string | Array<{ type?: string; text?: string }>;
type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: ChatContent } }>;
  error?: { message?: string };
};

export function isGemmaConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function parseModelJson(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first < 0 || last <= first) throw new Error("Model response was not JSON");
  return JSON.parse(trimmed.slice(first, last + 1)) as unknown;
}

export async function askGemma(messages: unknown[]): Promise<unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Gemma is not configured");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "WildSphere AI",
    },
    body: JSON.stringify({
      model: GEMMA_MODEL,
      messages,
      max_tokens: 8192,
      temperature: 0.25,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const status = response.status;
    throw Object.assign(new Error(`OpenRouter returned HTTP ${status}`), {
      providerStatus: status,
    });
  }
  const payload = (await response.json()) as OpenRouterResponse;
  const message = payload.choices?.[0]?.message?.content;
  const content =
    typeof message === "string"
      ? message
      : Array.isArray(message)
        ? message.map((part) => part.text || "").join("\n")
        : "";
  if (!content) throw new Error("Gemma returned an empty response");
  return parseModelJson(content);
}

export function getImageMimeType(file: Express.Multer.File): string | null {
  const bytes = file.buffer;
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return file.mimetype === "image/jpeg" || file.mimetype === "image/jpg"
      ? "image/jpeg"
      : null;
  }
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return file.mimetype === "image/png" ? "image/png" : null;
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return file.mimetype === "image/webp" ? "image/webp" : null;
  }
  return null;
}
