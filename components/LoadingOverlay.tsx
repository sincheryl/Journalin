
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface Props {
  isVisible: boolean;
  destination: string;
  loadingImage: string | null;
}

const LOADING_MESSAGES = [
  "Mapping your journey...",
  "Finding hidden gems...",
  "Curating local flavors...",
  "Adjusting the pace...",
  "Drafting memories...",
  "Sketching the vibe...",
  "Polishing details...",
];

const TRIP_TIPS = [
  "Pack a universal adapter; you never know where the day might take you.",
  "Download offline maps before you land to navigate like a local immediately.",
  "Keep a digital scan of your passport in your email for absolute peace of mind.",
  "Roll your clothes instead of folding to save space and minimize wrinkles.",
  "Learn 'Thank you' in the local language; it opens more doors than a key.",
  "Always carry a portable charger; your camera will thank you at sunset.",
  "Notify your bank before traveling to avoid frozen cards in foreign lands.",
  "Pack a reusable water bottle to stay hydrated and reduce plastic waste.",
  "A small first-aid kit is the one thing you'll be glad you packed but didn't use.",
  "Wake up at dawn at least once to see the city before it wakes up."
];

const LoadingOverlay: React.FC<Props> = ({ isVisible, destination }) => {
  const [msgIdx, setMsgIdx] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);
  const [takingLong, setTakingLong] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setTakingLong(false);
      return;
    }
    
    // Status message rotation
    const msgInterval = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1200);

    // Trip tips rotation (slower, for readability)
    const tipInterval = setInterval(() => {
      setTipIdx((prev) => (prev + 1) % TRIP_TIPS.length);
    }, 4000);

    const longWaitTimeout = setTimeout(() => {
      setTakingLong(true);
    }, 12000); 

    return () => {
      clearInterval(msgInterval);
      clearInterval(tipInterval);
      clearTimeout(longWaitTimeout);
    };
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-morandi-slate/90 backdrop-blur-3xl flex items-center justify-center overflow-hidden"
        >
          {/* Background Mesh Decor */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-morandi-sage rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-morandi-sunset rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
          </div>

          <div className="relative z-10 flex flex-col items-center max-w-lg px-8 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-64 h-64 md:w-80 md:h-80 rounded-[48px] overflow-hidden shadow-2xl mb-12 border-[12px] border-white/40 bg-white/20 flex items-center justify-center"
            >
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-morandi-mist/20">
                <div className="w-12 h-12 border-4 border-morandi-forest border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-morandi-forest opacity-40">Journalin.</span>
              </div>
            </motion.div>

            <div className="h-12 overflow-hidden mb-2">
              <AnimatePresence mode="wait">
                <motion.h2 
                  key={msgIdx}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-3xl text-morandi-forest font-serif"
                >
                  {LOADING_MESSAGES[msgIdx]}
                </motion.h2>
              </AnimatePresence>
            </div>
            
            <p className="text-morandi-forest/60 font-medium tracking-widest uppercase text-xs mb-12">
              {destination || "Your next adventure"}
            </p>

            {/* Trip Tips Callout */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white/40 backdrop-blur-md border border-white/60 p-8 rounded-[32px] shadow-xl w-full"
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-morandi-sunset" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-morandi-forest/40">Traveler's Wisdom</span>
              </div>
              <div className="h-20 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={tipIdx}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    className="text-lg text-morandi-forest font-serif italic leading-snug"
                  >
                    "{TRIP_TIPS[tipIdx]}"
                  </motion.p>
                </AnimatePresence>
              </div>
            </motion.div>

            <AnimatePresence>
              {takingLong && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-8 text-morandi-sunset font-bold text-[10px] uppercase tracking-widest"
                >
                  Deep synthesis in progress, almost ready...
                </motion.p>
              )}
            </AnimatePresence>
            
            <div className="mt-8 flex gap-3">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.6, 0.2] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                  className="w-2 h-2 bg-morandi-forest rounded-full"
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingOverlay;
