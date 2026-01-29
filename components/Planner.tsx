
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { UserProfile, TripConfig, DayPlan, ItineraryItem, InquiryResult, InquiryQuestion, SurvivalKit as SurvivalKitType } from '../types.ts';
import { generatePlan, generateMoodImage, generatePlaceImage, checkPlanFeasibility } from '../services/geminiService.ts';
import PastelMap from './PastelMap.tsx';
import LoadingOverlay from './LoadingOverlay.tsx';
import SurvivalKit from './SurvivalKit.tsx';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { ShieldAlert, Trash2, Clock, Home, Building, Sparkles, Train, Car, Navigation, HelpCircle, ChevronRight, DollarSign, Timer, MapPin, GripVertical, BookOpen, Compass, ArrowUpRight, Loader2, Wand2 } from 'lucide-react';

const PlaceThumbnail: React.FC<{ item: ItineraryItem }> = ({ item }) => {
  const [img, setImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasStarted) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
          setLoading(true);
          generatePlaceImage(item.title, item.visualPrompt).then(res => {
            setImg(res);
            setLoading(false);
          });
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [item.title, item.visualPrompt, hasStarted]);

  return (
    <div 
      ref={containerRef}
      className="w-full aspect-[16/9] rounded-[24px] md:rounded-[48px] overflow-hidden bg-morandi-forest/5 border-[8px] md:border-[12px] border-white shadow-xl md:shadow-2xl relative group"
    >
      <AnimatePresence mode="wait">
        {loading || !hasStarted ? (
          <motion.div 
            key="loader"
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-xl"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 md:w-10 md:h-10 border-2 border-morandi-forest/10 border-t-morandi-forest rounded-full animate-spin" />
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-morandi-forest/30">
                {hasStarted ? "SKETCHING..." : "WAITING..."}
              </span>
            </div>
          </motion.div>
        ) : img ? (
          <motion.div 
            key="image"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full h-full"
          >
            <img 
              src={img} 
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-[4s] group-hover:scale-110"
            />
          </motion.div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-morandi-forest/10 italic text-[10px] uppercase font-bold tracking-widest">
            Atmospheric data only
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface PlannerProps {
  profile: UserProfile;
}

export default function Planner({ profile }: PlannerProps) {
  const [config, setConfig] = useState<TripConfig>({
    destination: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    passengers: 2,
    safetyToggles: {
      filterShredder: false,
      bbGuard: false,
      noQueueMode: false
    },
    accommodation: 'Budget Hotel',
    transport: 'Public Transit',
    customNote: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [plan, setPlan] = useState<DayPlan[] | null>(null);
  const [summary, setSummary] = useState('');
  const [survivalKit, setSurvivalKit] = useState<SurvivalKitType | null>(null);
  const [moodImage, setMoodImage] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [isSetupView, setIsSetupView] = useState(true);
  const [activeView, setActiveView] = useState<'journal' | 'survival' | 'map'>('journal');

  const [inquiryData, setInquiryData] = useState<InquiryResult | null>(null);
  const [inquiryAnswers, setInquiryAnswers] = useState<Record<string, string>>({});

  const stayDuration = useMemo(() => {
    const start = new Date(config.startDate);
    const end = new Date(config.endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
  }, [config.startDate, config.endDate]);

  const handleDurationChange = (newDuration: number) => {
    const start = new Date(config.startDate);
    const end = new Date(start.getTime() + (newDuration - 1) * 86400000);
    setConfig({ ...config, endDate: end.toISOString().split('T')[0] });
  };

  const toggleSafety = (key: keyof typeof config.safetyToggles) => {
    setConfig({
      ...config,
      safetyToggles: {
        ...config.safetyToggles,
        [key]: !config.safetyToggles[key]
      }
    });
  };

  const isInquiryComplete = useMemo(() => {
    return Object.keys(inquiryAnswers).length >= (inquiryData?.questions?.length || 0);
  }, [inquiryAnswers, inquiryData]);

  const startAnalysis = async () => {
    if (!config.destination || isChecking) return;
    setIsChecking(true);
    try {
      const result = await checkPlanFeasibility(profile, config);
      if (result.needInquiry && result.questions && result.questions.length > 0) {
        setInquiryData(result);
        setIsChecking(false);
      } else {
        await handleGenerate();
      }
    } catch (e) {
      console.error(e);
      await handleGenerate();
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setIsChecking(false);
    setInquiryData(null);
    setMoodImage(null);
    setActiveView('journal');
    
    const extraContext = Object.entries(inquiryAnswers)
      .map(([id, ans]) => {
        const q = inquiryData?.questions?.find(q => q.id === id);
        return q ? `Question: ${q.question} Answer: ${ans}` : "";
      }).join(". ");

    try {
      const [result, heroImg] = await Promise.all([
        generatePlan(profile, config, extraContext),
        generateMoodImage(config.destination).catch(() => null)
      ]);

      setPlan(result.itinerary);
      setSummary(result.summary);
      setSurvivalKit(result.survivalKit);
      setMoodImage(heroImg);
      if (result.itinerary.length > 0) {
        setActiveDate(result.itinerary[0].date);
      }
      setIsSetupView(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      alert("Curation interrupted. The model might be busy. Please try again.");
      console.error("Generation error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = (newItems: ItineraryItem[]) => {
    if (!plan || !activeDate) return;
    setPlan(prev => prev ? prev.map(d => d.date === activeDate ? { ...d, items: newItems } : d) : null);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!plan || !activeDate) return;
    const currentDay = plan.find(d => d.date === activeDate);
    if (!currentDay) return;
    const filtered = currentDay.items.filter(i => i.id !== itemId);
    setPlan(prev => prev ? prev.map(d => d.date === activeDate ? { ...d, items: filtered } : d) : null);
  };

  const activeItems = useMemo(() => {
    if (!plan) return [];
    const dateToFind = activeDate || (plan.length > 0 ? plan[0].date : null);
    return plan.find(d => d.date === dateToFind)?.items || [];
  }, [plan, activeDate]);

  const paperBackgroundStyle = {
    backgroundImage: `linear-gradient(#cbd9c9 1px, transparent 1px)`,
    backgroundSize: '100% 3rem',
    backgroundColor: '#f7f9f8'
  };

  return (
    <div className="min-h-screen relative bg-transparent overflow-x-hidden">
      <LoadingOverlay isVisible={loading} destination={config.destination} loadingImage={null} />

      {/* Responsive Inquiry Modal/Sheet */}
      <AnimatePresence>
        {inquiryData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-6 bg-morandi-forest/40 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="glass-panel w-full md:max-w-xl p-8 md:p-16 rounded-t-5xl md:rounded-5xl shadow-5xl border-white/60 space-y-8 md:space-y-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="w-12 h-1 bg-morandi-forest/10 rounded-full mx-auto md:hidden" />
              <div className="flex items-center gap-4 text-morandi-forest">
                <div className="p-3 bg-morandi-forest/5 rounded-2xl">
                    <HelpCircle className="w-6 h-6 md:w-8 md:h-8 opacity-40" />
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-serif">Curator's Inquiry</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Ensuring Logical Harmony</p>
                </div>
              </div>
              
              <div className="p-5 md:p-8 bg-morandi-forest/[0.03] rounded-3xl border border-morandi-forest/5 italic text-morandi-forest/70 text-sm md:text-base leading-relaxed">
                "{inquiryData.reason}"
              </div>

              <div className="space-y-8 md:space-y-12">
                {inquiryData.questions?.map((q) => (
                  <div key={q.id} className="space-y-4 md:space-y-6">
                    <p className="text-lg md:text-xl font-serif text-morandi-forest leading-snug">{q.question}</p>
                    <div className="grid grid-cols-1 gap-3">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setInquiryAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          className={`flex items-center justify-between px-6 md:px-8 py-4 md:py-5 rounded-3xl border-2 transition-all ${inquiryAnswers[q.id] === opt ? 'bg-morandi-forest text-white border-morandi-forest shadow-lg scale-[1.01]' : 'bg-white/40 border-white/40 text-morandi-forest hover:bg-white hover:border-morandi-forest/10'}`}
                        >
                          <span className="font-bold text-sm">{opt}</span>
                          <AnimatePresence>
                            {inquiryAnswers[q.id] === opt && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                    <ChevronRight className="w-4 h-4" />
                                </motion.div>
                            )}
                          </AnimatePresence>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row gap-4 pt-4 md:pt-8 border-t border-morandi-forest/5">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setInquiryData(null)}
                  className="w-full py-4 md:py-6 rounded-3xl border border-morandi-forest/10 font-black text-[10px] uppercase tracking-[0.2em] text-morandi-forest/60 hover:text-morandi-forest transition-all glass-panel"
                >
                  Adjust Config
                </motion.button>
                <motion.button 
                  layout
                  onClick={handleGenerate}
                  disabled={!isInquiryComplete}
                  whileHover={isInquiryComplete ? { scale: 1.02, boxShadow: "0 20px 40px -10px rgba(9, 47, 38, 0.3)" } : {}}
                  whileTap={isInquiryComplete ? { scale: 0.98 } : {}}
                  className={`w-full md:flex-[2] py-4 md:py-6 rounded-3xl font-black text-[10px] md:text-xs uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center gap-3 overflow-hidden relative ${isInquiryComplete ? 'bg-morandi-forest text-white opacity-100' : 'bg-morandi-forest/10 text-morandi-forest/20 cursor-not-allowed shadow-none'}`}
                >
                  <AnimatePresence mode="wait">
                    {isInquiryComplete ? (
                      <motion.div 
                        key="ready"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="flex items-center gap-3"
                      >
                        <Wand2 className="w-4 h-4 animate-pulse text-morandi-sunset" />
                        <span>Commence Synthesis</span>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="pending"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3"
                      >
                        <Loader2 className="w-4 h-4 opacity-40 animate-spin" />
                        <span className="opacity-40 italic">Awaiting Input...</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Subtle highlight effect for ready state */}
                  {isInquiryComplete && (
                    <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"
                    />
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {isSetupView ? (
          <motion.div 
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center px-4 md:px-6 py-12 md:py-24"
          >
            <div className="max-w-3xl w-full space-y-8 md:space-y-12 pb-24">
              <header className="text-center space-y-2 md:space-y-4">
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.6em] md:tracking-[0.8em] text-morandi-forest opacity-30">CHAPTER TWO</span>
                <h1 className="text-5xl md:text-7xl font-serif text-morandi-forest tracking-tighter leading-none">Discovery.</h1>
                <p className="text-morandi-forest/60 font-medium text-base md:text-lg italic">Curating the bounds of your journey.</p>
              </header>

              <div 
                className={`glass-panel p-8 md:p-16 rounded-4xl md:rounded-[64px] shadow-2xl space-y-8 md:space-y-12 border-white/40 relative overflow-hidden transition-all duration-700 ${isChecking ? 'opacity-60 saturate-0 scale-[0.99]' : 'opacity-100'}`}
                style={paperBackgroundStyle}
              >
                <div className="absolute left-6 md:left-14 top-0 bottom-0 w-[1px] bg-red-200/50 z-0 pointer-events-none" />
                
                <div className="relative z-10 space-y-8 md:space-y-12">
                  <div className="space-y-6 md:space-y-10">
                    <div className="space-y-2 md:space-y-4">
                      <label className="text-[10px] md:text-[11px] font-black text-morandi-forest uppercase tracking-[0.3em] md:tracking-[0.4em] opacity-40">Destination</label>
                      <input 
                        type="text" 
                        value={config.destination}
                        onChange={(e) => setConfig({...config, destination: e.target.value})}
                        placeholder="Where to?"
                        className="w-full bg-transparent border-b-[2px] md:border-b-[3px] border-morandi-forest/10 py-2 md:py-4 text-3xl md:text-6xl font-serif text-morandi-forest focus:border-morandi-sunset outline-none transition-all placeholder:opacity-20 tracking-tight"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                      <div className="space-y-2 md:space-y-4">
                        <label className="text-[10px] md:text-[11px] font-black text-morandi-forest uppercase tracking-[0.3em] md:tracking-[0.4em] opacity-40">Start Date</label>
                        <input 
                          type="date" 
                          value={config.startDate}
                          onChange={(e) => setConfig({...config, startDate: e.target.value})}
                          className="w-full bg-white/40 border border-white/60 rounded-3xl px-6 md:px-8 py-4 md:py-6 font-bold text-sm text-morandi-forest outline-none focus:ring-4 ring-morandi-sunset/10"
                        />
                      </div>

                      <div className="space-y-2 md:space-y-4">
                        <label className="text-[10px] md:text-[11px] font-black text-morandi-forest uppercase tracking-[0.3em] md:tracking-[0.4em] opacity-40">Length of Stay</label>
                        <div className="flex items-center gap-4 md:gap-6 bg-white/40 border border-white/60 rounded-3xl px-4 md:px-6 py-3 md:py-4">
                          <button onClick={() => handleDurationChange(Math.max(1, stayDuration - 1))} className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-2xl bg-white text-morandi-forest active:scale-90 transition-all shadow-lg hover:bg-morandi-forest hover:text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 12H6" strokeWidth="4" strokeLinecap="round"/></svg>
                          </button>
                          <span className="flex-1 text-center font-black text-xl md:text-2xl text-morandi-forest">{stayDuration} <span className="text-[8px] md:text-[10px] uppercase opacity-40 ml-1">Days</span></span>
                          <button onClick={() => handleDurationChange(stayDuration + 1)} className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-2xl bg-white text-morandi-forest active:scale-90 transition-all shadow-lg hover:bg-morandi-forest hover:text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6v12M6 12h12" strokeWidth="4" strokeLinecap="round"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 md:space-y-6">
                    <label className="text-[10px] md:text-[11px] font-black text-morandi-forest uppercase tracking-[0.3em] md:tracking-[0.4em] opacity-40">Safety Toggles</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                      {[
                        { key: 'filterShredder', icon: Trash2, label: 'Filter Shredder', sub: 'Low-rated traps' },
                        { key: 'bbGuard', icon: ShieldAlert, label: 'B&B Guard', sub: 'Poor accommodations' },
                        { key: 'noQueueMode', icon: Clock, label: 'No-Queue Mode', sub: 'Spots < 30m wait' }
                      ].map((toggle) => (
                        <button
                          key={toggle.key}
                          onClick={() => toggleSafety(toggle.key as any)}
                          className={`flex items-center md:flex-col items-start md:items-start gap-4 md:gap-0 p-5 md:p-6 rounded-3xl border-2 transition-all duration-500 group ${config.safetyToggles[toggle.key as keyof typeof config.safetyToggles] ? 'bg-morandi-sunset text-white border-morandi-sunset shadow-xl' : 'bg-white/40 border-white/40 text-morandi-forest hover:bg-white'}`}
                        >
                          <toggle.icon className={`w-6 h-6 md:w-8 md:h-8 md:mb-4 transition-transform group-hover:scale-110 ${config.safetyToggles[toggle.key as keyof typeof config.safetyToggles] ? 'text-white' : 'text-morandi-sunset'}`} />
                          <div className="flex flex-col items-start">
                            <span className="font-bold text-xs md:text-sm tracking-tight">{toggle.label}</span>
                            <span className={`text-[8px] md:text-[10px] uppercase tracking-wider opacity-60 mt-0.5 md:mt-1 ${config.safetyToggles[toggle.key as keyof typeof config.safetyToggles] ? 'text-white' : 'text-morandi-forest'}`}>{toggle.sub}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    <div className="space-y-4 md:space-y-6">
                      <label className="text-[10px] md:text-[11px] font-black text-morandi-forest uppercase tracking-[0.3em] md:tracking-[0.4em] opacity-40">Accommodation</label>
                      <div className="space-y-3">
                        {[
                          { name: 'Hostel/Capsule', icon: Home, value: 'Hostel' },
                          { name: 'Budget Hotel', icon: Building, value: 'Budget Hotel' },
                          { name: 'Luxury/Boutique', icon: Sparkles, value: 'Luxury/Boutique' }
                        ].map((acc) => (
                          <button
                            key={acc.name}
                            onClick={() => setConfig({...config, accommodation: acc.value as any})}
                            className={`w-full flex items-center gap-4 p-4 rounded-3xl border-2 transition-all ${config.accommodation === acc.value ? 'bg-morandi-forest text-white border-morandi-forest shadow-lg scale-[1.02]' : 'bg-white/40 border-white/40 text-morandi-forest/60 hover:bg-white'}`}
                          >
                            <acc.icon className="w-5 h-5" />
                            <span className="font-bold text-sm tracking-tight">{acc.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 md:space-y-6">
                      <label className="text-[10px] md:text-[11px] font-black text-morandi-forest uppercase tracking-[0.3em] md:tracking-[0.4em] opacity-40">Transport</label>
                      <div className="space-y-3">
                        {[
                          { name: 'Public Transit', icon: Train, value: 'Public Transit' },
                          { name: 'Rental Car', icon: Car, value: 'Rental Car' },
                          { name: 'Ride-hailing', icon: Navigation, value: 'Ride-hailing' }
                        ].map((tr) => (
                          <button
                            key={tr.name}
                            onClick={() => setConfig({...config, transport: tr.value as any})}
                            className={`w-full flex items-center gap-4 p-4 rounded-3xl border-2 transition-all ${config.transport === tr.value ? 'bg-morandi-forest text-white border-morandi-forest shadow-lg scale-[1.02]' : 'bg-white/40 border-white/40 text-morandi-forest/60 hover:bg-white'}`}
                          >
                            <tr.icon className="w-5 h-5" />
                            <span className="font-bold text-sm tracking-tight">{tr.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 md:space-y-8">
                    <label className="text-[10px] md:text-[11px] font-black text-morandi-forest uppercase tracking-[0.3em] md:tracking-[0.4em] opacity-40">The Journal Note</label>
                    <textarea
                      value={config.customNote}
                      onChange={(e) => setConfig({...config, customNote: e.target.value})}
                      placeholder="Anything else? (e.g., Honeymoon, pet-friendly...)"
                      className="w-full h-32 md:h-40 bg-transparent border-2 border-morandi-forest/5 rounded-3xl md:rounded-[32px] p-6 md:p-8 font-serif text-lg text-morandi-forest focus:border-morandi-sunset outline-none transition-all resize-none shadow-inner italic"
                    />
                  </div>

                  <motion.button 
                    layout
                    onClick={startAnalysis}
                    disabled={loading || isChecking || !config.destination}
                    className={`w-full py-6 md:py-10 rounded-3xl md:rounded-[40px] font-black text-xl md:text-2xl shadow-2xl transition-all relative overflow-hidden flex items-center justify-center gap-4 ${isChecking ? 'bg-morandi-sunset text-white' : 'bg-morandi-forest text-morandi-mist hover:bg-morandi-forest/90'}`}
                  >
                    <AnimatePresence mode="wait">
                      {isChecking ? (
                        <motion.div 
                          key="checking"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.1 }}
                          className="flex items-center gap-4"
                        >
                          <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin" />
                          <span className="tracking-tight italic font-serif">Reading Config...</span>
                        </motion.div>
                      ) : (
                        <motion.span 
                          key="ready"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="tracking-tight"
                        >
                          Create Journal Entry
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {isChecking && (
                      <motion.div 
                        layoutId="btn-progress"
                        className="absolute bottom-0 left-0 h-1.5 bg-white/40"
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                      />
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="journal-main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col md:flex-row h-screen overflow-hidden relative"
          >
            {/* Main Content Area */}
            <div className={`flex-1 transition-all duration-700 ease-in-out overflow-y-auto custom-scrollbar p-6 md:p-12 lg:p-24 bg-morandi-mist pb-32 md:pb-40`}>
              <div className={`mx-auto space-y-16 md:space-y-24 max-w-2xl`}>
                
                <AnimatePresence mode="wait">
                  {activeView === 'journal' ? (
                    <motion.div
                      key="journal-view"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.5 }}
                      className="space-y-16 md:space-y-24"
                    >
                      <div className="flex items-center justify-between border-b border-morandi-forest/5 pb-8 md:pb-16">
                        <div className="space-y-1 md:space-y-3">
                          <h2 className="text-3xl md:text-5xl font-serif text-morandi-forest tracking-tighter leading-none">Discovery.</h2>
                          <p className="text-[8px] md:text-[11px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-morandi-forest/30 italic">CURATED ATMOSPHERE</p>
                        </div>
                        <button 
                          onClick={() => {
                            setLoading(false);
                            setIsSetupView(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }} 
                          className="px-6 md:px-10 py-3 md:py-4 glass-panel rounded-full text-[8px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-morandi-forest/60 hover:text-morandi-forest border-white/60 transition-all shadow-md"
                        >
                          Draft New
                        </button>
                      </div>

                      <div className="relative h-[240px] md:h-[420px] rounded-4xl md:rounded-[72px] overflow-hidden shadow-2xl border-[16px] md:border-[24px] border-white bg-white group">
                        {moodImage ? (
                          <img src={moodImage} alt={config.destination} className="w-full h-full object-cover transition-transform duration-[6s] group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-morandi-forest/5"><div className="w-8 h-8 md:w-12 md:h-12 border-4 border-morandi-forest/10 border-t-morandi-forest rounded-full animate-spin" /></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-morandi-forest/90 via-morandi-forest/30 to-transparent" />
                        <div className="absolute bottom-8 md:bottom-16 left-6 md:left-12 right-6 md:right-12 text-morandi-mist">
                          <span className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.5em] md:tracking-[0.7em] opacity-60 mb-2 md:mb-4 block">DESTINATION OVERVIEW</span>
                          <h2 className="text-4xl md:text-7xl lg:text-8xl font-serif mb-4 md:mb-6 leading-none tracking-tighter">{config.destination}</h2>
                        </div>
                      </div>

                      <div className="sticky top-4 z-40 flex justify-center w-full pointer-events-none">
                        <div className="bg-white/80 backdrop-blur-3xl px-2 py-1.5 md:px-3 md:py-2 rounded-full border border-white/60 shadow-xl flex gap-1 md:gap-2 pointer-events-auto overflow-x-auto no-scrollbar max-w-full">
                          {plan?.map((day, idx) => (
                            <button
                              key={day.date}
                              onClick={() => setActiveDate(day.date)}
                              className={`relative px-4 md:px-8 py-2 md:py-3 rounded-full transition-all duration-500 whitespace-nowrap ${activeDate === day.date ? 'shadow-lg scale-105' : 'opacity-40 hover:opacity-100'}`}
                            >
                              {activeDate === day.date && (
                                <motion.div layoutId="date-bg" className="absolute inset-0 bg-morandi-forest rounded-full z-0" />
                              )}
                              <div className="relative z-10 flex flex-col items-center min-w-[40px] md:min-w-[60px]">
                                <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] mb-0.5 transition-colors ${activeDate === day.date ? 'text-white/40' : 'text-morandi-forest/30'}`}>
                                  DAY 0{idx + 1}
                                </span>
                                <span className={`text-[10px] md:text-[12px] font-bold tracking-tight transition-colors ${activeDate === day.date ? 'text-white' : 'text-morandi-forest'}`}>
                                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-8 md:mt-20">
                        <Reorder.Group axis="y" values={activeItems} onReorder={handleReorder} className="space-y-24 md:space-y-40">
                          <AnimatePresence mode="popLayout">
                            {activeItems.map((item) => (
                              <Reorder.Item 
                                key={item.id} 
                                value={item}
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, x: -50 }}
                                transition={{ duration: 0.6 }}
                                className="flex flex-col gap-8 md:gap-12 cursor-grab active:cursor-grabbing bg-transparent relative group"
                              >
                                <div className="absolute -left-10 md:left-[-64px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-morandi-forest/20 hidden md:block">
                                  <GripVertical className="w-8 md:w-10 h-8 md:h-10" />
                                </div>

                                <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-morandi-forest/5 pb-4 md:pb-8 relative gap-4">
                                  <div className="relative shrink-0 flex items-center md:block">
                                     <span className="text-7xl md:text-[11rem] font-serif text-morandi-forest/5 md:absolute md:top-[-64px] md:left-[-48px] select-none group-hover:text-morandi-forest/10 transition-all duration-1000 pointer-events-none md:block hidden">{item.time}</span>
                                     <span className="text-5xl md:text-8xl font-serif text-morandi-forest relative z-10 drop-shadow-sm tracking-tighter leading-none">{item.time}</span>
                                  </div>
                                  
                                  <div className="flex flex-col md:items-end gap-1.5 md:gap-2 mb-1 md:mb-2 min-w-0 w-full overflow-hidden">
                                     <div className="flex items-center gap-1 flex-nowrap shrink-0 overflow-x-auto no-scrollbar md:justify-end w-full pb-1">
                                        {item.duration && (
                                          <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-0.5 md:py-1 bg-morandi-sage/5 text-morandi-sage rounded-full border border-morandi-sage/10 whitespace-nowrap shrink-0">
                                             <Timer className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                             <span className="text-[8px] md:text-[9px] font-black uppercase tracking-wider">{item.duration}</span>
                                          </div>
                                        )}
                                        {item.costEstimate && (
                                          <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-0.5 md:py-1 bg-morandi-sunset/5 text-morandi-sunset font-bold rounded-full border border-morandi-sunset/10 whitespace-nowrap shrink-0">
                                             <DollarSign className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                             <span className="text-[8px] md:text-[9px] font-black uppercase tracking-wider">{item.costEstimate}</span>
                                          </div>
                                        )}
                                        <a 
                                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.title}, ${config.destination}`)}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-0.5 md:py-1 bg-morandi-forest text-white rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest whitespace-nowrap shrink-0"
                                        >
                                          <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                          MAP
                                        </a>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteItem(item.id);
                                          }}
                                          className="p-1 md:p-1.5 text-morandi-forest/10 hover:text-red-400 rounded-full transition-all shrink-0"
                                        >
                                          <Trash2 className="w-3 md:w-3.5 h-3 md:h-3.5" />
                                        </button>
                                     </div>
                                     
                                     <div className="flex flex-col md:items-end w-full">
                                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-morandi-forest/40 mb-0.5">{item.type}</span>
                                        <h3 className="text-2xl md:text-4xl font-bold text-morandi-forest md:text-right leading-tight max-w-full tracking-tight w-full line-clamp-2">{item.title}</h3>
                                     </div>
                                  </div>
                                </div>

                                <PlaceThumbnail item={item} />

                                <div className="relative pl-6 md:pl-20 border-l-[4px] md:border-l-[8px] border-morandi-sage/30">
                                  <p className="text-morandi-forest/80 leading-relaxed font-medium text-lg md:text-2xl italic font-serif opacity-90 leading-snug">
                                    "{item.description}"
                                  </p>
                                </div>
                              </Reorder.Item>
                            ))}
                          </AnimatePresence>
                        </Reorder.Group>
                      </div>
                    </motion.div>
                  ) : activeView === 'survival' ? (
                    <motion.div
                      key="survival-view"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5 }}
                    >
                      {survivalKit && <SurvivalKit kit={survivalKit} />}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="map-view"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-[calc(100vh-160px)] md:h-[calc(100vh-200px)] relative rounded-4xl overflow-hidden shadow-2xl"
                    >
                      <PastelMap destination={config.destination} items={activeItems} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Desktop Side Map */}
            <AnimatePresence>
              {activeView === 'journal' && (
                <motion.div 
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: '50%', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.7, ease: [0.32, 0, 0.67, 0] }}
                  className="hidden md:block h-screen sticky top-0 border-l border-white/40 bg-white/5 backdrop-blur-xl"
                >
                   <PastelMap destination={config.destination} items={activeItems} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Navigation Bar */}
            <div className="fixed bottom-6 left-0 right-0 z-[100] flex justify-center pointer-events-none px-6">
              <div className="glass-panel p-2 rounded-full border-white/60 shadow-5xl flex gap-1 md:gap-2 pointer-events-auto items-center">
                <button 
                  onClick={() => setActiveView('journal')}
                  className={`relative flex items-center gap-2 md:gap-4 px-6 md:px-10 py-3 md:py-4 rounded-full transition-all duration-500 overflow-hidden ${activeView === 'journal' ? 'text-white' : 'text-morandi-forest/40 hover:text-morandi-forest'}`}
                >
                  {activeView === 'journal' && (
                    <motion.div layoutId="nav-bg" className="absolute inset-0 bg-morandi-forest rounded-full z-0" />
                  )}
                  <div className="relative z-10 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest hidden xs:block">Journal</span>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveView('survival')}
                  className={`relative flex items-center gap-2 md:gap-4 px-6 md:px-10 py-3 md:py-4 rounded-full transition-all duration-500 overflow-hidden ${activeView === 'survival' ? 'text-white' : 'text-morandi-forest/40 hover:text-morandi-forest'}`}
                >
                  {activeView === 'survival' && (
                    <motion.div layoutId="nav-bg" className="absolute inset-0 bg-morandi-forest z-0" />
                  )}
                  <div className="relative z-10 flex items-center gap-2">
                    <Compass className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest hidden xs:block">Survival</span>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveView('map')}
                  className={`md:hidden relative flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-500 overflow-hidden ${activeView === 'map' ? 'text-white' : 'text-morandi-forest/40 hover:text-morandi-forest'}`}
                >
                  {activeView === 'map' && (
                    <motion.div layoutId="nav-bg" className="absolute inset-0 bg-morandi-forest z-0" />
                  )}
                  <div className="relative z-10 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest hidden xs:block">Map</span>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
