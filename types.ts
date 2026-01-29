
export enum Chronotype {
  EARLY_BIRD = 'EARLY_BIRD',
  FLOW = 'FLOW',
  NIGHT_OWL = 'NIGHT_OWL'
}

export enum BudgetType {
  BUDGET = 'BUDGET',
  COST_EFFECTIVE = 'COST_EFFECTIVE',
  EXPERIENCE_FIRST = 'EXPERIENCE_FIRST'
}

export type Interest = 'Urban' | 'Citywalk' | 'Food' | 'Culture' | 'Nature' | 'Shopping';
export type FoodPreference = 'Spicy' | 'Sweet' | 'Vegetarian';

export interface UserProfile {
  chronotype: Chronotype;
  pace: number; // 0 to 100
  interests: Interest[];
  foodScale: number; // 0 to 1
  foodTags: FoodPreference[];
  budget: BudgetType;
}

export interface SafetyToggles {
  filterShredder: boolean;
  bbGuard: boolean;
  noQueueMode: boolean;
}

export interface TripConfig {
  destination: string;
  startDate: string;
  endDate: string;
  passengers: number;
  safetyToggles: SafetyToggles;
  accommodation: 'Hostel' | 'Budget Hotel' | 'Luxury/Boutique';
  transport: 'Public Transit' | 'Rental Car' | 'Ride-hailing';
  customNote: string;
}

export interface InquiryQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface InquiryResult {
  needInquiry: boolean;
  reason?: string;
  questions?: InquiryQuestion[];
}

export interface ItineraryItem {
  id: string;
  time: string;
  title: string;
  description: string;
  visualPrompt: string;
  location?: { lat: number; lng: number };
  type: 'hotel' | 'food' | 'activity' | 'transit';
  costEstimate?: string;
  duration?: string;
  openTime?: string;
  closeTime?: string;
  url?: string;
  imageUrl?: string;
}

export interface DayPlan {
  date: string;
  items: ItineraryItem[];
}

export interface EssentialApp {
  name: string;
  purpose: string;
  icon: string;
}

export interface BudgetEstimate {
  currency: string;
  accommodation: string;
  food: string;
  transport: string;
  totalEstimated: string;
}

export interface SurvivalKit {
  essentialApps: EssentialApp[];
  packingList: string[];
  localTips: string[];
  budgetEstimate: BudgetEstimate;
}

export interface GenerationResult {
  itinerary: DayPlan[];
  summary: string;
  survivalKit: SurvivalKit;
  sources?: { uri: string; title: string }[];
}
