
import React, { useState, useLayoutEffect } from 'react';
import { UserProfile } from './types.ts';
import Onboarding from './components/Onboarding.tsx';
import Planner from './components/Planner.tsx';
import { motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  const [view, setView] = useState<'hero' | 'onboarding' | 'planner'>('hero');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Global scroll reset on major view changes
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const handleFinishOnboarding = (data: UserProfile) => {
    setProfile(data);
    setView('planner');
  };

  return (
    <div className="min-h-screen relative font-sans overflow-x-hidden">
      <AnimatePresence mode="wait">
        {view === 'hero' && (
          <motion.div 
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="h-screen flex flex-col items-center justify-center text-center px-6 relative"
          >
            <div className="space-y-6 md:space-y-10 max-w-2xl relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 0.3, y: 0 }}
                transition={{ duration: 1.5 }}
                className="flex items-center justify-center gap-4"
              >
                <div className="h-[1px] w-8 md:w-12 bg-morandi-forest" />
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.6em] md:tracking-[0.8em] text-morandi-forest">
                  AI CURATED JOURNEYS
                </span>
                <div className="h-[1px] w-8 md:w-12 bg-morandi-forest" />
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 1.2, ease: "easeOut" }}
                className="text-6xl md:text-8xl lg:text-[12rem] font-serif text-morandi-forest tracking-tighter leading-none"
              >
                Journalin.
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
                className="text-lg md:text-xl text-morandi-forest/60 max-w-sm mx-auto font-medium leading-relaxed italic"
              >
                A serene digital sanctuary where intelligence meets the art of travel.
              </motion.p>
              
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                whileHover={{ scale: 1.05, boxShadow: "0 25px 50px -12px rgba(9, 47, 38, 0.25)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setView('onboarding')}
                className="mt-8 md:mt-16 w-full md:w-auto px-12 md:px-16 py-5 md:py-6 bg-morandi-forest text-morandi-mist rounded-full font-bold text-lg md:text-xl shadow-2xl transition-all"
              >
                Begin Discovery
              </motion.button>
            </div>
          </motion.div>
        )}

        {view === 'onboarding' && (
          <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Onboarding onFinish={handleFinishOnboarding} />
          </motion.div>
        )}

        {view === 'planner' && profile && (
          <motion.div key="planner" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Planner profile={profile} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
