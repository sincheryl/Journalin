
import React, { useState } from 'react';
import { UserProfile, Chronotype, BudgetType, Interest, FoodPreference } from '../types.ts';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingProps {
  onFinish: (profile: UserProfile) => void;
}

export default function Onboarding({ onFinish }: OnboardingProps) {
  const [step, setStep] = useState(1);

  const [chronotype, setChronotype] = useState<Chronotype>(Chronotype.FLOW);
  const [pace, setPace] = useState(50);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [foodScale, setFoodScale] = useState(0.5);
  const [foodTags, setFoodTags] = useState<FoodPreference[]>([]);
  const [budget, setBudget] = useState<BudgetType>(BudgetType.COST_EFFECTIVE);

  const toggleInterest = (interest: Interest) => {
    setInterests(prev => prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]);
  };

  const toggleFoodTag = (tag: FoodPreference) => {
    setFoodTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onFinish({ chronotype, pace, interests, foodScale, foodTags, budget });
    }
  };

  const stepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-8 md:space-y-12">
            <header className="space-y-2 md:space-y-4 text-center">
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-morandi-forest opacity-40">CHAPTER ONE</span>
              <h2 className="text-3xl md:text-5xl text-morandi-forest font-serif leading-tight">What is your Chronotype?</h2>
            </header>
            <div className="flex flex-col gap-4 md:gap-6">
              {[
                { type: Chronotype.EARLY_BIRD, label: 'Early Bird' },
                { type: Chronotype.FLOW, label: 'Flow' },
                { type: Chronotype.NIGHT_OWL, label: 'Night Owl' }
              ].map((c) => (
                <button
                  key={c.type}
                  onClick={() => setChronotype(c.type)}
                  className={`p-6 md:p-8 rounded-3xl md:rounded-[32px] text-center border-2 transition-all duration-500 ${chronotype === c.type ? 'bg-morandi-forest text-morandi-mist border-morandi-forest shadow-2xl scale-[1.02]' : 'bg-morandi-mist/40 backdrop-blur-xl border-white/40 text-morandi-forest hover:bg-white'}`}
                >
                  <span className="text-xl md:text-2xl font-bold tracking-tight italic">
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-8 md:space-y-12">
            <header className="space-y-2 md:space-y-4 text-center">
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-morandi-forest opacity-40">CHAPTER ONE</span>
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
        );
      case 3:
        return (
          <div className="space-y-8 md:space-y-12">
            <header className="space-y-2 md:space-y-4 text-center">
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-morandi-forest opacity-40">CHAPTER ONE</span>
              <h2 className="text-3xl md:text-5xl text-morandi-forest font-serif leading-tight">Interest Radar</h2>
            </header>
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              {['Urban', 'Citywalk', 'Food', 'Culture', 'Nature', 'Shopping'].map((interest) => (
                <div
                  key={interest}
                  onClick={() => toggleInterest(interest as Interest)}
                  className={`flex items-center justify-center p-6 md:p-8 rounded-3xl md:rounded-[32px] border-2 cursor-pointer transition-all duration-500 ${interests.includes(interest as Interest) ? 'bg-morandi-forest text-morandi-mist border-morandi-forest shadow-2xl' : 'bg-morandi-mist/40 backdrop-blur-xl border-white/40 text-morandi-forest hover:bg-white'}`}
                >
                  <span className="text-base md:text-lg font-bold tracking-tight">{interest}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-8 md:space-y-12">
            <header className="space-y-2 md:space-y-4 text-center">
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-morandi-forest opacity-40">CHAPTER ONE</span>
              <h2 className="text-3xl md:text-5xl text-morandi-forest font-serif leading-tight">Food Preferences</h2>
            </header>
            <div className="glass-panel p-8 md:p-16 rounded-4xl md:rounded-[48px] shadow-inner space-y-10 md:space-y-12">
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
              <div className="flex flex-wrap justify-center gap-3 md:gap-4">
                {['Spicy', 'Sweet', 'Vegetarian'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleFoodTag(tag as FoodPreference)}
                    className={`px-6 md:px-10 py-3 md:py-5 rounded-full border-2 transition-all duration-500 ${foodTags.includes(tag as FoodPreference) ? 'bg-morandi-sunset text-white border-morandi-sunset shadow-lg scale-105' : 'bg-white/40 backdrop-blur-xl border-white/20 text-morandi-forest'}`}
                  >
                    <span className="font-bold text-xs md:text-sm tracking-tight">{tag}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-8 md:space-y-12">
            <header className="space-y-2 md:space-y-4 text-center">
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-morandi-forest opacity-40">CHAPTER ONE</span>
              <h2 className="text-3xl md:text-5xl text-morandi-forest font-serif leading-tight">Budget Style</h2>
            </header>
            <div className="flex flex-col gap-4 md:gap-6">
              {[
                { type: BudgetType.BUDGET, label: 'Budget' },
                { type: BudgetType.COST_EFFECTIVE, label: 'Balanced' },
                { type: BudgetType.EXPERIENCE_FIRST, label: 'Experience-First' }
              ].map((b) => (
                <button
                  key={b.type}
                  onClick={() => setBudget(b.type)}
                  className={`p-6 md:p-8 rounded-3xl md:rounded-[32px] text-center border-2 transition-all duration-500 ${budget === b.type ? 'bg-morandi-forest text-morandi-mist border-morandi-forest shadow-2xl scale-[1.02]' : 'bg-morandi-mist/40 backdrop-blur-xl border-white/40 text-morandi-forest hover:bg-white'}`}
                >
                  <span className="text-xl md:text-2xl font-bold tracking-tight italic">
                    {b.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto pt-20 md:pt-32 px-6 md:px-10 min-h-screen flex flex-col justify-between pb-24 relative">
      <div className="py-4 md:py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {stepContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 md:mt-16">
        <div className="flex items-center justify-between gap-4 md:gap-8">
          {step > 1 ? (
            <button 
              onClick={() => {
                setStep(step - 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-morandi-forest/60 font-black text-[8px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.4em] px-6 md:px-10 py-4 md:py-6 bg-white/20 backdrop-blur-xl rounded-full hover:bg-white hover:text-morandi-forest transition-all border border-white/40"
            >
              Back
            </button>
          ) : <div className="hidden md:block" />}
          
          <button 
            onClick={handleNext}
            className="flex-1 md:flex-none bg-morandi-forest text-morandi-mist px-12 md:px-16 py-4 md:py-6 rounded-full font-black text-xs md:text-sm uppercase tracking-widest shadow-2xl hover:scale-[1.05] active:scale-95 transition-all"
          >
            {step === 5 ? 'Synthesize' : 'Next'}
          </button>
        </div>
        
        <div className="flex justify-center gap-3 md:gap-4 mt-10 md:mt-12">
          {[1,2,3,4,5].map(i => (
            <div 
              key={i} 
              className={`h-1 rounded-full transition-all duration-700 ${i === step ? 'w-12 md:w-16 bg-morandi-forest' : 'w-3 md:w-4 bg-morandi-forest/10'}`} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}
