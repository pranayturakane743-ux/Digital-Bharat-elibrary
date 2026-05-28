import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "Say 'Hello World!' in JSON: {\"message\": \"Hello World!\"}"
    });
    console.log(result.text);
  } catch (err) {
    console.error("ERROR:", err);
  }
}
run();
