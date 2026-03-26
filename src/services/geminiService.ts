import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const geminiService = {
  translateToEnglish: async (text: string): Promise<string> => {
    if (!text || !/[^\x00-\x7F]/.test(text)) return text; // If no non-ASCII characters, assume it's already English or similar

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following medical or personal text to English. Return ONLY the translated text, no explanations: "${text}"`,
      });
      return response.text?.trim() || text;
    } catch (error) {
      console.error("Translation error:", error);
      return text;
    }
  }
};
