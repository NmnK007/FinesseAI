import { GoogleGenerativeAI } from "@google/generative-ai";
import type { HealthCard } from "./scoreEngine";

const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const GEMINI_TIMEOUT_MS = 2800;

export type Language = "en" | "hi" | "te";

const langLabel: Record<Language, string> = {
  en: "English",
  hi: "Hindi (Devanagari script)",
  te: "Telugu",
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race<T | null>([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export async function explainScore(card: HealthCard, lang: Language = "en"): Promise<string> {
  if (!API_KEY) return offlineExplanation(card, lang);

  try {
    const bestLender = [...card.quotes].sort((a, b) => b.confidence - a.confidence)[0];
    const prompt = `You are a senior credit advisor at a bank writing a note to a small-business owner in ${langLabel[lang]}. Direct tone. No jargon. No preamble. Do not say "AI", "score card", "analysis". Speak to them, not about them. 3 short sentences maximum.

Sentence 1: State their score and the single biggest reason.
Sentence 2: State the one thing they should do this month, with the point gain.
Sentence 3: Explain that this is synthetic demonstration data, not a lender offer or validated default prediction. Never recommend a bank or give an approval probability. Point gains are illustrative heuristics, not guaranteed effects.

Facts:
- Business: ${card.profile.tradeName}, ${card.profile.city}
- Score: ${card.overall} / 1000 (${card.band})
- Biggest drag: ${card.topDrags[0]?.title ?? "none"} (costs ~${card.topDrags[0]?.impact ?? 0} points)
- Highest-impact action: ${card.topLifts[0]?.title ?? "keep filing on time"} (+${card.topLifts[0]?.impact ?? 0})
- Best lender: ${bestLender.lender} at ${Math.round(bestLender.confidence * 100)}% confidence

Return only the 3 sentences. No lists, no headers, no line breaks.`;

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await withTimeout(model.generateContent(prompt), GEMINI_TIMEOUT_MS);
    if (!result) return offlineExplanation(card, lang);
    return result.response.text().trim();
  } catch {
    return offlineExplanation(card, lang);
  }
}

function offlineExplanation(card: HealthCard, lang: Language): string {
  if (lang === "hi") {
    return `${card.profile.tradeName} का उदाहरण स्कोर ${card.overall} है। यह काल्पनिक डेटा है, वास्तविक क्रेडिट स्कोर या ऋण स्वीकृति नहीं। मुख्य संकेत: ${card.topDrags[0]?.title ?? "स्थिर रिकॉर्ड"}।`;
  }
  if (lang === "te") {
    return `${card.profile.tradeName} ఉదాహరణ స్కోర్ ${card.overall}. ఇది కల్పిత డేటా; నిజమైన క్రెడిట్ స్కోర్ లేదా రుణ ఆమోదం కాదు. ప్రధాన సూచన: ${card.topDrags[0]?.title ?? "స్థిర రికార్డ్"}.`;
  }
  return `${card.profile.tradeName} has an illustrative health index of ${card.overall}. The largest displayed signal is ${card.topDrags[0]?.title.toLowerCase() ?? "a steady baseline"}. These are synthetic records and heuristic suggestions, not a bureau score, validated default prediction or lender offer.`;
}
