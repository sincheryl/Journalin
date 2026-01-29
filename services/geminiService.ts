
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, TripConfig, GenerationResult } from "../types.ts";

const sanitizeJson = (text: string): string => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

/**
 * Generate a travel plan using Gemini 2.5 Flash.
 * Explicitly instructs the model to use the googleMaps tool for real coordinates.
 * Strictly enforces English for all content including names and sources.
 */
export const generatePlan = async (profile: UserProfile, config: TripConfig): Promise<GenerationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const safety = [
    config.safetyToggles.filterShredder ? "avoid traps" : "",
    config.safetyToggles.bbGuard ? "high-quality stays" : "",
    config.safetyToggles.noQueueMode ? "short waits" : ""
  ].filter(Boolean).join(", ");

  const prompt = `
    Task: Create a detailed travel itinerary for ${config.destination} from ${config.startDate} to ${config.endDate}.
    User Profile: Pace ${profile.pace}%, Interests: ${profile.interests.join(', ')}.
    Preferences: ${config.accommodation} accommodation, ${config.transport} transport.
    Additional Notes: "${config.customNote}". Safety requirements: ${safety}.
    
    CRITICAL LANGUAGE REQUIREMENT: 
    - The entire response MUST be in English.
    - All place names (titles) MUST be provided in English (e.g., use "Forbidden City" instead of "故宫").
    - Descriptions and summaries MUST be in English.
    
    CRITICAL COORDINATE REQUIREMENT: 
    - You MUST use the googleMaps tool for EVERY itinerary item to find its REAL latitude and longitude. 
    
    Return the response strictly as JSON:
    {
      "summary": "A brief aesthetic overview of the trip in English.",
      "itinerary": [
        {
          "date": "YYYY-MM-DD",
          "items": [
            {
              "id": "unique-string-id",
              "time": "HH:MM",
              "title": "Full English Name of Place",
              "description": "Evocative 1-sentence description in English.",
              "visualPrompt": "Detailed photography prompt in English.",
              "type": "activity",
              "location": { "lat": number, "lng": number }
            }
          ]
        }
      ],
      "sources": [
        { "title": "English Name of Source/Website", "uri": "URL" }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        temperature: 0.1,
        systemInstruction: "You are a world-class travel curator. You always respond in English, regardless of the destination's native language. You translate all local names to their standard English equivalents."
      },
    });

    const text = response.text || "";
    let result: any = { summary: "", itinerary: [], sources: [] };
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        result = JSON.parse(sanitizeJson(jsonMatch[0]));
      } catch (e) {
        console.error("JSON Parse Error", e);
      }
    }

    // Merge or prioritize sources from JSON (which the model translated)
    const finalSources = result.sources || [];
    
    // If JSON sources are empty, attempt to fallback to grounding chunks (though these might be in local language)
    if (finalSources.length === 0) {
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.maps?.uri) {
            finalSources.push({ 
              uri: chunk.maps.uri, 
              title: chunk.maps.title || "Map Reference" 
            });
          }
        });
      }
    }

    return { ...result, sources: finalSources.length > 0 ? finalSources : undefined };
  } catch (error: any) {
    console.error("Generation Error:", error);
    throw error;
  }
};

export const generatePlaceImage = async (placeName: string, visualPrompt: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `A professional, minimalist travel photograph of ${placeName}. ${visualPrompt}. 
    Soft, diffuse morning light, muted pastel tones, Morandi color palette (sage, slate, mist, sunset). 
    Clean composition, high-end travel magazine quality, 8k resolution. No text, no watermarks.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [{ text: prompt }] 
      },
      config: {
        imageConfig: { aspectRatio: "16:9" },
      }
    });

    const part = response.candidates?.[0]?.content.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (e) {
    console.error("Image Generation Error for", placeName, e);
    return null;
  }
};

export const generateMoodImage = async (destination: string) => {
  return generatePlaceImage(destination, `An evocative, wide-angle cinematic overview of ${destination} landscape, peaceful atmosphere.`);
};
