// Use your own AI app. No API keys, no cost to anyone.
// Shrink my day writes the question, opens your AI with it, and you paste the answer back.

import type { Settings } from "./tasks";

export const AI_NAME: Record<Settings["ai"], string> = { chatgpt: "ChatGPT", claude: "Claude", gemini: "Gemini", grok: "Grok" };

export function breakdownPrompt(title: string, context = "") {
  return [
    `Break this task into 3 to 6 tiny steps for someone with ADHD.`,
    `Each step should take under 10 minutes and start with a verb.`,
    `Reply with only the steps, one per line, no numbers, no extra words.`,
    ``,
    `Task: ${title}`,
    context ? `Notes: ${context}` : "",
  ]
    .filter((l, i, a) => l || a[i - 1])
    .join("\n");
}

/** A link that opens the AI app with the question filled in, where the app allows it. */
export function aiLink(ai: Settings["ai"], prompt: string): { url: string; prefilled: boolean } {
  const q = encodeURIComponent(prompt);
  switch (ai) {
    case "chatgpt":
      return { url: `https://chatgpt.com/?q=${q}`, prefilled: true };
    case "claude":
      return { url: `https://claude.ai/new?q=${q}`, prefilled: true };
    case "grok":
      return { url: `https://grok.com/?q=${q}`, prefilled: true };
    case "gemini":
      return { url: "https://gemini.google.com/app", prefilled: false };
  }
}

export async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
