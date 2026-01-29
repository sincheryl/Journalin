
import React, { useState, useEffect } from 'react';
import { UserProfile } from './types.ts';
import Onboarding from './components/Onboarding.tsx';
import Planner from './components/Planner.tsx';
import { motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  const [view, setView] = useState<'hero' | 'onboarding' | 'planner'>('hero');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync state with browser fullscreen changes (e.g., if user hits Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleFinishOnboarding = (data: UserProfile) => {
    setProfile(data);
    setView('planner');
  };

  return (
    <div className="min-h-screen relative font-sans">
      {/* Global Persistent Fullscreen Toggle */}
      <motion.button 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={toggleFullscreen}
        className="fixed top-10 right-10 z-[100] p-6 glass-panel rounded-[24px] shadow-2xl hover:scale-110 active:scale-95 transition-all text-morandi-forest/60 hover:text-morandi-forest border-white/40"
        title={isFullscreen ? "Exit Immersive Mode" : "Enter Immersive Mode"}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isFullscreen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          )}
        </svg>
      </motion.button>

      <AnimatePresence mode="wait">
        {view === 'hero' && (
          <motion.div 
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="h-screen flex flex-col items-center justify-center text-center px-6 relative"
          >
            <div className="space-y-10 max-w-2xl relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 0.3, y: 0 }}
                transition={{ duration: 1.5 }}
                className="flex items-center justify-center gap-4"
              >
                <div className="h-[1px] w-12 bg-morandi-forest" />
                <span className="text-[10px] font-black uppercase tracking-[0.8em] text-morandi-forest">
                  AI CURATED JOURNEYS
                </span>
                <div className="h-[1px] w-12 bg-morandi-forest" />
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 1.2, ease: "easeOut" }}
                className="text-8xl md:text-[12rem] font-serif text-morandi-forest tracking-tighter leading-none"
              >
                Journalin.
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
                className="text-xl text-morandi-forest/60 max-w-sm mx-auto font-medium leading-relaxed italic"
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
                className="mt-16 px-16 py-6 bg-morandi-forest text-morandi-mist rounded-full font-bold text-xl shadow-2xl transition-all"
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
