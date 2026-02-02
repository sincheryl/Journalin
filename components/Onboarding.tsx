import React, { useState, useEffect } from 'react';
import { UserProfile, Chronotype, BudgetType, Interest, FoodPreference } from '../types.ts';

interface OnboardingProps {
  onFinish: (profile: UserProfile) => void;
}

const INTEREST_ICONS: Record<Interest, string> = {
  'Urban': '🏙️',
  'Citywalk': '🚶',
  'Food': '🍜',
  'Culture': '🏛️',
  'Nature': '🌿',
  'Shopping': '🛍️'
};

const FOOD_ICONS: Record<FoodPreference, string> = {
  'Spicy': '🌶️',
  'Sweet': '🍰',
  'Vegetarian': '🥗',
  'Local': '🍲'
};

export default function Onboarding({ onFinish }: OnboardingProps) {
  const [chronotypeValue, setChronotypeValue] = useState<number>(1); 
  const [chronotype, setChronotype] = useState<Chronotype>(Chronotype.FLOW);
  
  const [budgetValue, setBudgetValue] = useState<number>(1); 
  const [budget, setBudget] = useState<BudgetType>(BudgetType.COST_EFFECTIVE);
  
  const [pace, setPace] = useState(50);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [foodScale, setFoodScale] = useState(0.5);
  const [foodTags, setFoodTags] = useState<FoodPreference[]>([]);

  useEffect(() => {
    const chronoMap: Record<number, Chronotype> = {
      0: Chronotype.EARLY_BIRD,
      1: Chronotype.FLOW,
      2: Chronotype.NIGHT_OWL
    };
    setChronotype(chronoMap[chronotypeValue]);
  }, [chronotypeValue]);

  useEffect(() => {
    const budgetMap: Record<number, BudgetType> = {
      0: BudgetType.BUDGET,
      1: BudgetType.COST_EFFECTIVE,
      2: BudgetType.EXPERIENCE_FIRST
    };
    setBudget(budgetMap[budgetValue]);
  }, [budgetValue]);

  const toggleInterest = (interest: Interest) => {
    setInterests(prev => prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]);
  };

  const toggleFoodTag = (tag: FoodPreference) => {
    setFoodTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = () => {
    onFinish({ chronotype, pace, interests, foodScale, foodTags, budget });
  };

  const mergedContent = () => {
    return (
      <div className="space-y-16 md:space-y-24">
        {/* Part 1: Chronotype */}
        <div className="space-y-8 md:space-y-12">
          <header className="space-y-2 md:space-y-4 text-center">
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-morandi-forest opacity-40">PART 1</span>
            <h2 className="text-3xl md:text-5xl text-morandi-forest font-serif leading-tight">What is your Chronotype?</h2>
          </header>
          <div className="glass-panel p-8 md:p-16 rounded-4xl md:rounded-[48px] shadow-inner space-y-8">
            <input
              type="range"
              min="0"
              max="2"
              step="1"
              value={chronotypeValue}
              onChange={(e) => setChronotypeValue(Number(e.target.value))}
              className="w-full h-3 bg-morandi-forest/10 rounded-full appearance-none cursor-pointer accent-morandi-sunset"
            />
            <div className="flex justify-between font-black text-[8px] md:text-[10px] uppercase tracking-widest text-morandi-forest opacity-40">
              <span>Early Bird</span>
              <span>Flow</span>
              <span>Night Owl</span>
            </div>
          </div>
        </div>

        {/* Part 2: Travel Pace */}
        <div className="space-y-8 md:space-y-12">
          <header className="space-y-2 md:space-y-4 text-center">
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-morandi-forest opacity-40">PART 2</span>
            <h2 className="text-3xl md:text-5xl text-morandi-forest font-serif leading-tight">Travel Pace</h2>
          </header>
          <div className="glass-panel p-8 md:p-16 rounded-4xl md:rounded-[48px] shadow-inner space-y-8">
            <input
              type="range"
              min="0"
              max="100"
              value={pace}
              onChange={(e) => setPace(Number(e.target.value))}
              className="w-full h-3 bg-morandi-forest/10 rounded-full appearance-none cursor-pointer accent-morandi-sunset"
            />
            <div className="flex justify-between font-black text-[8px] md:text-[10px] uppercase tracking-widest text-morandi-forest opacity-40">
              <span>Spartan (0%)</span>
              <span>Chill Cat (100%)</span>
            </div>
          </div>
        </div>

        {/* Part 3: Interest Radar */}
        <div className="space-y-8 md:space-y-12">
          <header className="space-y-2 md:space-y-4 text-center">
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-morandi-forest opacity-40">PART 3</span>
            <h2 className="text-3xl md:text-5xl text-morandi-forest font-serif leading-tight">Interest Radar</h2>
          </header>
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            {(Object.keys(INTEREST_ICONS) as Interest[]).map((interest) => (
              <div
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`flex flex-col items-center justify-center p-10 md:p-16 rounded-3xl md:rounded-[48px] border-2 cursor-pointer transition-all duration-500 gap-4 md:gap-6 ${interests.includes(interest) ? 'bg-morandi-forest text-morandi-mist border-morandi-forest shadow-2xl scale-[1.02]' : 'bg-morandi-mist/40 backdrop-blur-xl border-white/40 text-morandi-forest hover:bg-white hover:scale-[1.01]'}`}
              >
                <span className="text-4xl md:text-6xl mb-2 md:mb-4 transform transition-transform duration-500 group-hover:scale-110">
                  {INTEREST_ICONS[interest]}
                </span>
                <span className="text-lg md:text-2xl font-bold tracking-tight">{interest}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Part 4: Food Preferences */}
        <div className="space-y-8 md:space-y-12">
          <header className="space-y-2 md:space-y-4 text-center">
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-morandi-forest opacity-40">PART 4</span>
            <h2 className="text-3xl md:text-5xl text-morandi-forest font-serif leading-tight">Food Preferences</h2>
          </header>
          <div className="glass-panel p-8 md:p-16 rounded-4xl md:rounded-[48px] shadow-inner space-y-10 md:space-y-14">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={foodScale}
              onChange={(e) => setFoodScale(Number(e.target.value))}
              className="w-full h-3 bg-morandi-forest/10 rounded-full appearance-none cursor-pointer accent-morandi-sunset"
            />
            <div className="flex justify-between font-black text-[8px] md:text-[10px] uppercase tracking-widest text-morandi-forest opacity-40">
              <span>Fuel</span>
              <span>Foodie</span>
            </div>
            {/* Strict 2-column grid for food tags */}
            <div className="grid grid-cols-2 gap-4 md:gap-6 w-full">
              {(Object.keys(FOOD_ICONS) as FoodPreference[]).map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleFoodTag(tag)}
                  className={`w-full px-4 md:px-8 py-4 md:py-6 rounded-full border-2 transition-all duration-500 whitespace-nowrap flex items-center justify-center gap-2 md:gap-4 ${foodTags.includes(tag) ? 'bg-morandi-sunset text-white border-morandi-sunset shadow-lg scale-[1.03]' : 'bg-white/40 backdrop-blur-xl border-white/20 text-morandi-forest hover:bg-white'}`}
                >
                  <span className="text-xl md:text-2xl">{FOOD_ICONS[tag]}</span>
                  <span className="font-bold text-xs md:text-base tracking-tight">{tag}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Part 5: Budget Style */}
        <div className="space-y-8 md:space-y-12">
          <header className="space-y-2 md:space-y-4 text-center">
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-morandi-forest opacity-40">PART 5</span>
            <h2 className="text-3xl md:text-5xl text-morandi-forest font-serif leading-tight">Budget Style</h2>
          </header>
          <div className="glass-panel p-8 md:p-16 rounded-4xl md:rounded-[48px] shadow-inner space-y-8">
            <input
              type="range"
              min="0"
              max="2"
              step="1"
              value={budgetValue}
              onChange={(e) => setBudgetValue(Number(e.target.value))}
              className="w-full h-3 bg-morandi-forest/10 rounded-full appearance-none cursor-pointer accent-morandi-sunset"
            />
            <div className="flex justify-between font-black text-[8px] md:text-[10px] uppercase tracking-widest text-morandi-forest opacity-40">
              <span>Budget</span>
              <span>Balanced</span>
              <span>Experience-First</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto pt-20 md:pt-32 px-6 md:px-10 min-h-screen flex flex-col justify-between pb-24 relative">
      <div className="py-4 md:py-8">
        {mergedContent()}
      </div>

      <div className="mt-16 md:mt-24">
        <div className="flex justify-center">
          <button 
            onClick={handleSubmit}
            className="bg-morandi-forest text-morandi-mist px-16 md:px-20 py-5 md:py-7 rounded-full font-black text-xs md:text-sm uppercase tracking-widest shadow-2xl hover:scale-[1.05] active:scale-95 transition-all"
          >
            Synthesize
          </button>
        </div>
      </div>
    </div>
  );
}