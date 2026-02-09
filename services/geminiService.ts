
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { UserProfile, TripConfig, GenerationResult, InquiryResult, ItineraryItem, ItineraryRiskResult } from "../types.ts";

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

const parseTimeToMinutes = (rawTime?: string | null) => {
  if (!rawTime) return null;
  const cleaned = rawTime.trim().toLowerCase();
  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3];
  if (meridiem) {
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
  }
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const parseDurationMinutes = (raw?: string | null) => {
  if (!raw) return null;
  const cleaned = raw.toLowerCase();
  const hourMatch = cleaned.match(/(\d+)\s*(h|hr|hrs|hour|hours|小时)/);
  const minMatch = cleaned.match(/(\d+)\s*(m|min|mins|minute|minutes|分钟)/);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    const minutes = minMatch ? parseInt(minMatch[1], 10) : 0;
    return hours * 60 + minutes;
  }
  if (minMatch) {
    return parseInt(minMatch[1], 10);
  }
  const fallbackNumber = cleaned.match(/(\d+)/);
  return fallbackNumber ? parseInt(fallbackNumber[1], 10) : null;
};

const formatHHMM = (raw: string) => {
  if (!raw) return null;
  const cleaned = raw.trim();
  if (/^\d{4}$/.test(cleaned)) {
    return `${cleaned.slice(0, 2)}:${cleaned.slice(2)}`;
  }
  const minutes = parseTimeToMinutes(cleaned);
  if (minutes === null) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const mapWithConcurrency = async <T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>) => {
  const results: R[] = [];
  const executing: Promise<void>[] = [];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const p = fn(item, i).then((res) => {
      results[i] = res;
    });
    const e = p.then(() => {
      const idx = executing.indexOf(e);
      if (idx >= 0) executing.splice(idx, 1);
    });
    executing.push(e);
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
  return results;
};

const extractHoursFromPeriods = (periods: any[] | undefined, date: string) => {
  if (!periods || periods.length === 0) return null;
  const targetDay = new Date(date).getDay(); // 0 = Sunday
  const period = periods.find(p => p?.open?.day === targetDay);
  if (!period?.open?.time) return null;
  const openTime = formatHHMM(period.open.time);
  const closeTime = period.close?.time ? formatHHMM(period.close.time) : null;
  if (!openTime || !closeTime) return null;
  return { openTime, closeTime };
};

const resolvePlaceHours = async (title: string, destination: string, date: string) => {
  const query = `${title} ${destination}`.trim();
  const searchUrl = `/api/places/textsearch?query=${encodeURIComponent(query)}`;
  try {
    const searchRes = await fetch(searchUrl, { method: 'GET' });
    if (!searchRes.ok) {
      return null;
    }
    const searchData = await searchRes.json();
    const searchStatus = searchData?.status;
    if (searchStatus && searchStatus !== 'OK' && searchStatus !== 'ZERO_RESULTS') {
      return null;
    }
    const placeId = searchData?.results?.[0]?.place_id;
    if (!placeId) return null;

    const detailsUrl = `/api/places/details?place_id=${encodeURIComponent(placeId)}&fields=opening_hours,name`;
    const detailsRes = await fetch(detailsUrl, { method: 'GET' });
    if (!detailsRes.ok) {
      return null;
    }
    const detailsData = await detailsRes.json();
    const detailsStatus = detailsData?.status;
    if (detailsStatus && detailsStatus !== 'OK') {
      return null;
    }
    const openingHours = detailsData?.result?.opening_hours;
    const hoursFromPeriods = extractHoursFromPeriods(openingHours?.periods, date);
    if (hoursFromPeriods) {
      return { ...hoursFromPeriods, placeName: detailsData?.result?.name as string | undefined };
    }
    return null;
  } catch (e) {
    console.error("Google Places lookup failed:", e);
    return null;
  }
};

const resolveOperatingHoursForItems = async (items: ItineraryItem[], destination: string, date: string) => {
  const filtered = items.map((item, index) => ({ item, index }));
  const resolved = await mapWithConcurrency(filtered, 3, async ({ item }) => {
    if (!item?.title || item.type === 'transit') return item;
    try {
      const hours = await resolvePlaceHours(item.title, destination, date);
      if (!hours) return item;
      return {
        ...item,
        openTime: hours.openTime ?? item.openTime,
        closeTime: hours.closeTime ?? item.closeTime
      };
    } catch (e) {
      return item;
    }
  });
  return { items: resolved };
};

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
          systemInstruction: "You are an elite travel curator. Always provide real geographical coordinates, accurate operating hours, and SPECIFIC, REAL names for all venues and hotels. Use emojis for app icons. Tailor hotel quality strictly to the budget choice: high-rated hostels for budget, landmark 5-star properties for luxury. Ensure the final schedule respects each venue’s opening/closing window, keeping at least a 15 minute buffer before close. If operating hours are uncertain, proactively shorten earlier activities or pick a realistic alternative so no item ends after close or starts before opening."
        },
      });
    });

    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Plan generation error after retries:", error);
    throw error;
  }
};

/**
 * Stage 3: Post-edit Risk Analysis
 * Uses real operating hours (Google Places) + AI to assess fatigue and conflicts.
 */
export const analyzeItineraryRisks = async (
  profile: UserProfile,
  config: TripConfig,
  date: string,
  dayStart: string,
  items: ItineraryItem[],
  travelBufferMinutes = 15
): Promise<ItineraryRiskResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const { items: updatedItems } = await resolveOperatingHoursForItems(items, config.destination, date);
  const totalActiveMinutes = updatedItems.reduce((sum, item) => {
    const minutes = item.durationMinutes ?? parseDurationMinutes(item.duration) ?? 60;
    return sum + minutes;
  }, 0);
  const totalBufferMinutes = Math.max(0, updatedItems.length - 1) * travelBufferMinutes;

  const itemLines = updatedItems.map((item, idx) => {
    const start = item.startTime || item.time || '';
    const end = item.endTime || '';
    const duration = item.durationMinutes ?? parseDurationMinutes(item.duration) ?? 60;
    const openTime = item.openTime || '';
    const closeTime = item.closeTime || '';
    return `${idx + 1}. [${item.id}] ${item.title} (${item.type}) ${start}-${end} duration=${duration}min open=${openTime} close=${closeTime}`;
  }).join("\n");

  const systemInstruction = `
    Role: Travel safety and feasibility analyst.
    Evaluate time conflicts, unrealistic transitions, and fatigue risk based on user pace.
    If opening hours are missing, DO NOT claim closure conflicts. Focus on fatigue and flow.
    Be concise and actionable. Respond ONLY in JSON.
    
    Schema:
    {
      "shouldWarn": boolean,
      "summary": "string",
      "fatigueScore": number,
      "itemRisks": [{ "itemId": "string", "title": "string", "severity": "low|medium|high", "reason": "string", "type": "time_conflict|fatigue|travel|closure|other" }],
      "suggestions": ["string"]
    }
  `;

  const userContent = `
    Destination: ${config.destination}
    Date: ${date}
    Day Start: ${dayStart}
    Transport: ${config.transport}
    Traveler Pace: ${profile.pace}%
    Total Active Minutes: ${totalActiveMinutes}
    Transit Buffer Minutes: ${totalBufferMinutes}
    Items:
    ${itemLines}
  `;

  try {
    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userContent,
        config: {
          systemInstruction,
          responseMimeType: "application/json"
        }
      });
    });

    const parsed = JSON.parse(sanitizeJson(response.text || "{}"));
    return {
      ...parsed,
      totalActiveMinutes,
      updatedItems
    } as ItineraryRiskResult;
  } catch (error: any) {
    console.error("Risk analysis error after retries:", error);
    return {
      shouldWarn: true,
      summary: "AI 分析暂不可用，请具体去 Google 地点查询。",
      totalActiveMinutes,
      updatedItems
    };
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
