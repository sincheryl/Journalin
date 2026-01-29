
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { UserProfile, TripConfig, GenerationResult, InquiryResult } from "../types.ts";

const sanitizeJson = (text: string): string => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

/**
 * Utility for retrying async functions with exponential backoff.
 * Primarily handles 503 (Overloaded) and 429 (Rate Limit) errors.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
  let delay = initialDelay;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      // Check for common retryable error codes
      const errorCode = error?.status || error?.error?.code;
      const isOverloaded = error?.message?.toLowerCase().includes('overloaded') || errorCode === 503;
      const isRateLimited = errorCode === 429;
      
      if ((isOverloaded || isRateLimited) && i < maxRetries - 1) {
        console.warn(`Gemini API busy (Status ${errorCode}). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries reached');
}

/**
 * Stage 1: Feasibility Check
 * Analyzes the trip for logical gaps or contradictions.
 */
export const checkPlanFeasibility = async (profile: UserProfile, config: TripConfig): Promise<InquiryResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    Role: Insightful "Journalin" Travel Curator. 
    Analyze User Profile and Trip Config for logical contradictions or missing experiential details.
    
    CRITICAL RULES:
    1. DO NOT ask for information already provided (e.g., Destination, Dates, Passengers, or Interests).
    2. ONLY set "needInquiry": true if there is a genuine contradiction (e.g., a very high pace for a very short trip, or interests that don't match the destination).
    3. If the plan is logically sound, return {"needInquiry": false}.
    4. Respond ONLY in JSON.
    
    Schema: { "needInquiry": boolean, "reason": "string", "questions": [{ "id": "string", "question": "string", "options": ["string"] }] }
  `;

  const userContent = `
    Destination: ${config.destination}
    Dates: ${config.startDate} to ${config.endDate}
    Passengers: ${config.passengers}
    Traveler Pace: ${profile.pace}%
    Interests: ${profile.interests.join(', ')}
    Accommodation: ${config.accommodation}
    Transport: ${config.transport}
    User Custom Note: "${config.customNote}"
  `;

  try {
    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userContent,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        }
      });
    });

    return JSON.parse(sanitizeJson(response.text || "{\"needInquiry\": false}"));
  } catch (e) {
    console.error("Feasibility check failed after retries:", e);
    // Graceful fallback: Proceed without inquiry if the check fails
    return { needInquiry: false };
  }
};

/**
 * Stage 2: Itinerary Generation
 * Using Gemini 3 with responseSchema for guaranteed JSON stability.
 */
export const generatePlan = async (profile: UserProfile, config: TripConfig, extraContext: string = ""): Promise<GenerationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const safety = [
    config.safetyToggles.filterShredder ? "avoid traps" : "",
    config.safetyToggles.bbGuard ? "high-quality stays" : "",
    config.safetyToggles.noQueueMode ? "short waits" : ""
  ].filter(Boolean).join(", ");

  const prompt = `
    Create a comprehensive travel plan for ${config.destination} from ${config.startDate} to ${config.endDate}.
    User Profile: Pace ${profile.pace}%, Interests: ${profile.interests.join(', ')}, Budget Style: ${profile.budget}.
    Config: ${config.accommodation}, ${config.transport}. Note: "${config.customNote}". ${safety}
    ${extraContext ? `Additional Insights: ${extraContext}` : ""}
    
    TASK: Generate a full itinerary with real lat/lng coordinates and survival info.
    
    CRITICAL REQUIREMENT FOR ACCOMMODATION: 
    Do NOT use generic names like "Hotel" or "Your Accommodation". 
    You MUST provide the name of a REAL, SPECIFIC hotel, hostel, or boutique stay that exists in ${config.destination} and matches the chosen style (${config.accommodation}).
    - If the user selected 'Budget' (Hostel or Budget Hotel), suggest a highly-rated, famous real hostel or top-value budget spot.
    - If the user selected 'Luxury/Boutique', suggest a 5-star landmark hotel, iconic luxury property, or high-end boutique stay.
    Include the check-in as the first item of the first day and check-out as an item on the last day.
    
    CRITICAL REQUIREMENT FOR ESSENTIAL APPS:
    For the 'icon' property of each app, use a SINGLE EMOJI that represents the app (e.g., "🚕" for Uber, "🗺️" for Maps, "🍱" for Yelp). 
    DO NOT provide image URLs or web links.

    Ensure 'openTime' and 'closeTime' are provided for all activities and restaurants (e.g. "09:00", "22:00").
  `;

  try {
    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              itinerary: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING },
                    items: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          time: { type: Type.STRING },
                          title: { type: Type.STRING, description: "Specific name of the place, e.g. 'The Ritz-Carlton' not 'Hotel'" },
                          description: { type: Type.STRING },
                          visualPrompt: { type: Type.STRING },
                          type: { type: Type.STRING },
                          costEstimate: { type: Type.STRING },
                          duration: { type: Type.STRING },
                          openTime: { type: Type.STRING },
                          closeTime: { type: Type.STRING },
                          location: {
                            type: Type.OBJECT,
                            properties: {
                              lat: { type: Type.NUMBER },
                              lng: { type: Type.NUMBER }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              survivalKit: {
                type: Type.OBJECT,
                properties: {
                  essentialApps: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        purpose: { type: Type.STRING },
                        icon: { type: Type.STRING, description: "A single emoji representing the app" }
                      }
                    }
                  },
                  packingList: { type: Type.ARRAY, items: { type: Type.STRING } },
                  localTips: { type: Type.ARRAY, items: { type: Type.STRING } },
                  budgetEstimate: {
                    type: Type.OBJECT,
                    properties: {
                      currency: { type: Type.STRING },
                      accommodation: { type: Type.STRING },
                      food: { type: Type.STRING },
                      transport: { type: Type.STRING },
                      totalEstimated: { type: Type.STRING }
                    }
                  }
                }
              }
            }
          },
          temperature: 0.1,
          systemInstruction: "You are an elite travel curator. Always provide real geographical coordinates, accurate operating hours, and SPECIFIC, REAL names for all venues and hotels. Use emojis for app icons. Tailor hotel quality strictly to the budget choice: high-rated hostels for budget, landmark 5-star properties for luxury."
        },
      });
    });

    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Plan generation error after retries:", error);
    throw error;
  }
};

export const generatePlaceImage = async (placeName: string, visualPrompt: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `Travel photo of ${placeName}. ${visualPrompt}. Morandi colors, professional composition.`;
    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: "16:9" } }
      });
    });
    const part = response.candidates?.[0]?.content.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (e) {
    console.error("Image generation failed:", e);
    return null;
  }
};

export const generateMoodImage = async (destination: string) => {
  return generatePlaceImage(destination, `Cinematic overview of ${destination}.`);
};
