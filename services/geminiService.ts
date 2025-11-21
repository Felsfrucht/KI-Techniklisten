import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedEvent } from "../types";

// Initialize Gemini Client
// NOTE: In a real production app, calls should go through a backend to protect the API KEY.
// For this demo architecture, we use the environment variable directly as requested.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-2.5-flash";

export const parseSeatingList = async (text: string): Promise<ExtractedEvent[]> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Extract event data from this 'Gebuchte Räume' (Seating List) PDF text. 
      The text is messy OCR. Look for patterns like dates (DD.MM.YY), time ranges (HH:MM - HH:MM), rooms, seating types, pax, and event names.
      Detect if the event is an "Auf-Abbau" (Setup/Teardown) or technical instruction and set isSetupOrTech to true.
      
      Text Content:
      ${text.substring(0, 30000)}`, // Truncate to avoid huge payloads, though Flash handles large context well.
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "Format DD.MM.YYYY" },
              startTime: { type: Type.STRING, description: "HH:MM" },
              endTime: { type: Type.STRING, description: "HH:MM" },
              room: { type: Type.STRING },
              bookingName: { type: Type.STRING, description: "Booking number and name" },
              eventName: { type: Type.STRING, description: "Detailed event name/occasion" },
              seating: { type: Type.STRING },
              pax: { type: Type.NUMBER },
              notes: { type: Type.STRING },
              isSetupOrTech: { type: Type.BOOLEAN },
            },
            required: ["date", "startTime", "endTime", "room", "bookingName"]
          }
        }
      }
    });

    const rawData = JSON.parse(response.text || "[]");
    return rawData.map((item: any) => ({ ...item, source: 'seating' }));
  } catch (e) {
    console.error("Gemini Seating Parse Error", e);
    return [];
  }
};

export const parseMediaList = async (text: string): Promise<ExtractedEvent[]> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Extract event data from this 'Gebuchte Artikel nach Anlass' (Media List) PDF text. 
      Identify the Date (usually at the top).
      For each event entry, extract time, room, event name.
      CRITICAL: Extract the list of media items/articles (like "Flipchart", "Beamer", "Mikrofon", "Stuhlreihen", "Tisch") listed under the event.
      Extract Client (Kunde) and Contact (Kontakt vor Ort).
      
      Text Content:
      ${text.substring(0, 30000)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              startTime: { type: Type.STRING },
              endTime: { type: Type.STRING },
              room: { type: Type.STRING },
              eventName: { type: Type.STRING },
              client: { type: Type.STRING },
              contact: { type: Type.STRING },
              mediaItems: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "List of equipment, furniture, or services"
              },
              isSetupOrTech: { type: Type.BOOLEAN, description: "True if this entry is purely for Setup/Teardown or Tech" }
            },
            required: ["startTime", "room"]
          }
        }
      }
    });

    const rawData = JSON.parse(response.text || "[]");
    return rawData.map((item: any) => ({ ...item, source: 'media' }));
  } catch (e) {
    console.error("Gemini Media Parse Error", e);
    return [];
  }
};