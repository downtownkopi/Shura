import { routing } from "@/i18n/routing";

type IdeaText = { title: string; description: string | null };
type Translations = Record<string, IdeaText>;

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ms: "Malay",
  bn: "Bengali",
  ta: "Tamil",
  hi: "Hindi",
  ur: "Urdu",
};

// Picks the right title/description for a viewer's locale: original text if it
// matches the source language (or none is recorded), otherwise the stored translation
// if one exists, otherwise falls back to the original — translation is best-effort.
export function pickLocalizedText<
  T extends { title: string; description: string | null; sourceLocale: string | null; translations: unknown },
>(idea: T, viewerLocale: string): { title: string; description: string | null } {
  if (!idea.sourceLocale || idea.sourceLocale === viewerLocale) {
    return { title: idea.title, description: idea.description };
  }
  const translations = idea.translations as Translations | null;
  const translated = translations?.[viewerLocale];
  return translated ?? { title: idea.title, description: idea.description };
}

// Translates an idea's title/description into every other supported locale.
// Returns null on any failure (missing key, network error, bad response) so
// callers can fall back to showing the original text — translation is a nice-to-have,
// never a submission blocker.
export async function translateIdea(text: IdeaText, sourceLocale: string): Promise<Translations | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const targets = routing.locales.filter((l) => l !== sourceLocale);
  if (targets.length === 0) return null;

  const targetList = targets.map((l) => `"${l}" (${LANGUAGE_NAMES[l]})`).join(", ");

  const prompt = `Translate this mosque donation idea from ${LANGUAGE_NAMES[sourceLocale] ?? sourceLocale} into each of these languages: ${targetList}.

Title: ${text.title}
Description: ${text.description ?? ""}

Respond with ONLY a JSON object, no markdown fences, shaped exactly like:
{"<locale-code>": {"title": "...", "description": "..."}, ...}

Use an empty string for description if there was no description. Keep translations natural and concise, matching the tone of a short community suggestion.`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;

    const parsed = JSON.parse(content) as Translations;

    // Sanity check the shape before trusting it.
    const result: Translations = {};
    for (const locale of targets) {
      const entry = parsed[locale];
      if (entry && typeof entry.title === "string") {
        result[locale] = {
          title: entry.title.slice(0, 200),
          description: typeof entry.description === "string" ? entry.description.slice(0, 2000) || null : null,
        };
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}
