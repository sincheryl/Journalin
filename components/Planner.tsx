
import React, { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { UserProfile, TripConfig, DayPlan, ItineraryItem, InquiryResult, InquiryQuestion, SurvivalKit as SurvivalKitType } from '../types.ts';
import { generatePlan, generateMoodImage, generatePlaceImage, checkPlanFeasibility } from '../services/geminiService.ts';
import PastelMap from './PastelMap.tsx';
import LoadingOverlay from './LoadingOverlay.tsx';
import SurvivalKit from './SurvivalKit.tsx';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { ShieldAlert, StarHalf, Clock, Home, Building, Sparkles, Train, Car, Navigation, HelpCircle, ChevronRight, DollarSign, Timer, MapPin, GripVertical, BookOpen, Compass, Footprints, Trash2, Search, Loader2 } from 'lucide-react';

const PlaceThumbnail = React.memo(({ 
  item, 
  cachedImage, 
  onImageGenerated 
}: { 
  item: ItineraryItem; 
  cachedImage?: string;
  onImageGenerated: (itemId: string, url: string) => void;
}) => {
  const [localLoading, setLocalLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    // Persistence Check: If we already have a cached image, do nothing.
    if (cachedImage || hasTriggeredRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
          setLocalLoading(true);
          generatePlaceImage(item.title, item.visualPrompt).then(res => {
            if (res) {
              onImageGenerated(item.id, res);
            }
            setLocalLoading(false);
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
  }, [item.id, item.title, item.visualPrompt, cachedImage, onImageGenerated]);

  return (
    <div 
      ref={containerRef}
      className="w-full aspect-[16/9] rounded-[24px] md:rounded-[48px] overflow-hidden bg-morandi-forest/5 border-[8px] md:border-[12px] border-white shadow-xl md:shadow-2xl relative group"
    >
      <AnimatePresence mode="wait">
        {localLoading && !cachedImage ? (
          <motion.div 
            key="loader"
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-xl"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 md:w-10 md:h-10 border-2 border-morandi-forest/10 border-t-morandi-forest rounded-full animate-spin" />
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-morandi-forest/30">
                SKETCHING...
              </span>
            </div>
          </motion.div>
        ) : cachedImage ? (
          <motion.div 
            key="image"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full h-full"
          >
            <img 
              src={cachedImage} 
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-[4s] group-hover:scale-110"
            />
          </motion.div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-morandi-forest/10 italic text-[10px] uppercase font-bold tracking-widest">
            Waiting to sketch...
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});

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
  const [plan, setPlan] = useState<DayPlan[] | null>(null);
  const [summary, setSummary] = useState('');
  const [survivalKit, setSurvivalKit] = useState<SurvivalKitType | null>(null);
  const [moodImage, setMoodImage] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [isSetupView, setIsSetupView] = useState(true);
  const [activeView, setActiveView] = useState<'journal' | 'survival' | 'map'>('journal');

  // Session-wide image cache to persist sketches across tab switches
  const [imageCache, setImageCache] = useState<Record<string, string>>({});

  const [inquiryData, setInquiryData] = useState<InquiryResult | null>(null);
  const [inquiryAnswers, setInquiryAnswers] = useState<Record<string, string>>({});

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  // Robust internal navigation scroll reset
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [isSetupView, activeView, activeDate]);

  const stayDuration = useMemo(() => {
    const start = new Date(config.startDate);
    const end = new Date(config.endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
  }, [config.startDate, config.endDate]);

  const toggleSafety = (key: keyof typeof config.safetyToggles) => {
    setConfig({
      ...config,
      safetyToggles: {
        ...config.safetyToggles,
        [key]: !config.safetyToggles[key]
      }
    });
  };

  const handleImageGenerated = useCallback((itemId: string, url: string) => {
    setImageCache(prev => ({
      ...prev,
      [itemId]: url
    }));
  }, []);

  const startAnalysis = async () => {
    if (!config.destination) return;
    setLoading(true);
    try {
      const result = await checkPlanFeasibility(profile, config);
      if (result.needInquiry && result.questions && result.questions.length > 0) {
        setInquiryData(result);
        setLoading(false);
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
    setInquiryData(null);
    setMoodImage(null);
    setImageCache({}); // Clear old session images when a new plan is created
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

  // Autocomplete Logic
  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    setIsSearchingSuggestions(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&featuretype=city,country&accept-language=en`);
      const data = await response.json();
      setSuggestions(data);
    } catch (err) {
      console.error("Autocomplete fetch failed:", err);
    } finally {
      setIsSearchingSuggestions(false);
    }
  };

  const handleDestinationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setConfig({...config, destination: val});
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (val.trim()) {
      setShowSuggestions(true);
      searchTimeoutRef.current = window.setTimeout(() => {
        fetchSuggestions(val);
      }, 400);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  const selectSuggestion = (display_name: string) => {
    setConfig({...config, destination: display_name});
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowSuggestions(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
                <HelpCircle className="w-8 h-8 opacity-40" />
                <div>
                  <h3 className="text-2xl md:text-3xl font-serif">Curator's Inquiry</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Ensuring Logical Harmony</p>
                </div>
              </div>
              
              <div className="p-4 md:p-6 bg-morandi-forest/5 rounded-3xl border border-morandi-forest/5 italic text-morandi-forest/70 text-sm">
                "{inquiryData.reason}"
              </div>

              <div className="space-y-8 md:space-y-10">
                {inquiryData.questions?.map((q) => (
                  <div key={q.id} className="space-y-4 md:space-y-6">
                    <p className="text-lg md:text-xl font-serif text-morandi-forest leading-snug">{q.question}</p>
                    <div className="grid grid-cols-1 gap-3">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setInquiryAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          className={`flex items-center justify-between px-6 md:px-8 py-4 md:py-5 rounded-3xl border-2 transition-all ${inquiryAnswers[q.id] === opt ? 'bg-morandi-forest text-white border-morandi-forest shadow-lg' : 'bg-white/40 border-white/40 text-morandi-forest hover:bg-white'}`}
                        >
                          <span className="font-bold text-sm">{opt}</span>
                          {inquiryAnswers[q.id] === opt && <ChevronRight className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row gap-4 pt-4">
                <button 
                  onClick={() => setInquiryData(null)}
                  className="w-full md:flex-1 py-6 rounded-3xl border border-morandi-forest/10 font-black text-xs uppercase tracking-widest text-morandi-forest opacity-40 hover:opacity-100 transition-all"
                >
                  Adjust Config
                </button>
                <button 
                  onClick={handleGenerate}
                  disabled={Object.keys(inquiryAnswers).length < (inquiryData.questions?.length || 0)}
                  className="w-full md:flex-1 py-6 bg-morandi-forest text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl disabled:opacity-20 transition-all"
                >
                  Proceed to Generation
                </button>
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
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center px-4 md:px-6 py-12 md:py-24"
          >
            <div className="max-w-3xl w-full space-y-8 md:space-y-12 pb-24">
              <header className="text-center space-y-2 md:space-y-4">
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.6em] md:tracking-[0.8em] text-morandi-forest/50">CHAPTER TWO</span>
                <h1 className="text-5xl md:text-7xl font-serif text-morandi-forest tracking-tighter leading-none">Discovery.</h1>
                <p className="text-morandi-forest/70 font-medium text-base md:text-lg italic">Curating the bounds of your journey.</p>
              </header>

              <div 
                className="glass-panel p-8 md:p-16 rounded-4xl md:rounded-[64px] shadow-2xl space-y-8 md:space-y-12 border-white/60 relative overflow-hidden"
                style={paperBackgroundStyle}
              >
                <div className="absolute left-6 md:left-14 top-0 bottom-0 w-[1px] bg-red-200/50 z-0 pointer-events-none" />
                
                <div className="relative z-10 space-y-8 md:space-y-12">
                  <div className="space-y-6 md:space-y-10">
                    <div className="flex flex-row gap-4 md:gap-12 w-full">
                      <div className="space-y-2 md:space-y-4 flex-[3] relative">
                        <div className="bg-white/40 backdrop-blur-sm rounded-xl px-3 py-1 w-max inline-block mb-1">
                          <label className="text-[10px] md:text-[11px] font-black text-morandi-forest uppercase tracking-[0.3em] md:tracking-[0.4em] opacity-80">Destination</label>
                        </div>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={config.destination}
                            onChange={handleDestinationChange}
                            onFocus={() => config.destination && setShowSuggestions(true)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Where to?"
                            className="w-full bg-transparent border-b-[2px] md:border-b-[3px] border-morandi-forest/20 py-2 md:py-4 text-2xl md:text-6xl font-serif text-morandi-forest focus:border-morandi-sunset outline-none transition-all placeholder:opacity-30 tracking-tight"
                          />
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 text-morandi-forest/20 pointer-events-none">
                            {isSearchingSuggestions ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
                          </div>

                          {/* Autocomplete Dropdown */}
                          <AnimatePresence>
                            {showSuggestions && (suggestions.length > 0 || isSearchingSuggestions) && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute left-0 right-0 top-full mt-4 z-[100] glass-panel bg-white/70 backdrop-blur-2xl rounded-3xl shadow-5xl border border-white/60 overflow-hidden max-h-[300px] md:max-h-[400px] overflow-y-auto no-scrollbar w-full max-w-[calc(100vw-2rem)]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {isSearchingSuggestions && suggestions.length === 0 ? (
                                  <div className="p-8 text-center text-morandi-forest/40 italic flex items-center justify-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span className="text-sm font-bold uppercase tracking-widest">Searching...</span>
                                  </div>
                                ) : (
                                  <div className="py-2">
                                    {suggestions.map((s, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => selectSuggestion(s.display_name)}
                                        className="w-full px-4 md:px-8 py-5 text-left hover:bg-morandi-forest/5 flex items-center gap-4 transition-colors group border-b border-morandi-forest/5 last:border-none"
                                      >
                                        <div className="w-10 h-10 rounded-full bg-morandi-forest/5 flex items-center justify-center shrink-0 group-hover:bg-morandi-forest/10">
                                          <MapPin className="w-4 h-4 text-morandi-forest opacity-40 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1">
                                          <span className="text-morandi-forest font-bold text-sm md:text-base whitespace-normal break-words">{s.display_name}</span>
                                          <span className="text-[10px] text-morandi-forest/40 uppercase font-black tracking-widest mt-0.5">{s.type || 'place'}</span>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <div className="space-y-2 md:space-y-4 flex-[1.2] md:flex-[1]">
                        <div className="bg-white/40 backdrop-blur-sm rounded-xl px-3 py-1 w-full text-center mb-1">
                          <label className="text-[10px] md:text-[11px] font-black text-morandi-forest uppercase tracking-[0.3em] md:tracking-[0.4em] opacity-80 block">Passengers</label>
                        </div>
                        <input 
                          type="number" 
                          min="1"
                          max="20"
                          value={config.passengers}
                          onChange={(e) => setConfig({...config, passengers: parseInt(e.target.value) || 1})}
                          className="w-full bg-transparent border-b-[2px] md:border-b-[3px] border-morandi-forest/20 py-2 md:py-4 text-2xl md:text-6xl font-serif text-morandi-forest focus:border-morandi-sunset outline-none transition-all text-center"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-6 md:gap-10">
                        <div className="space-y-2 md:space-y-4">
                          <div className="bg-white/40 backdrop-blur-sm rounded-xl px-3 py-1 w-max inline-block mb-1">
                            <label className="text-[10px] md:text-[11px] font-black text-morandi-forest uppercase tracking-[0.3em] md:tracking-[0.4em] opacity-80">Start Date</label>
                          </div>
                          <input 
                            type="date" 
                            value={config.startDate}
                            onChange={(e) => setConfig({...config, startDate: e.target.value})}
                            className="w-full bg-white/60 backdrop-blur-md border border-white/80 rounded-3xl px-4 md:px-8 py-4 md:py-6 font-bold text-sm text-morandi-forest outline-none focus:ring-4 ring-morandi-sunset/10 shadow-sm"
                          />
                        </div>

                        <div className="space-y-2 md:space-y-4">
                          <div className="bg-white/40 backdrop-blur-sm rounded-xl px-3 py-1 w-max inline-block mb-1">
                            <label className="text-[10px] md:text-[11px] font-black text-morandi-forest uppercase tracking-[0.3em] md:tracking-[0.4em] opacity-80">End Date</label>
                          </div>
                          <input 
                            type="date" 
                            value={config.endDate}
                            onChange={(e) => setConfig({...config, endDate: e.target.value})}
                            className="w-full bg-white/60 backdrop-blur-md border border-white/80 rounded-3xl px-4 md:px-8 py-4 md:py-6 font-bold text-sm text-morandi-forest outline-none focus:ring-4 ring-morandi-sunset/10 shadow-sm"
                          />
                        </div>
                      </div>
                      <div className="pl-2">
                        <div className="bg-white/40 backdrop-blur-sm rounded-full px-4 py-2 w-max shadow-sm border border-white/40">
                          <span className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] text-morandi-forest opacity-60 flex items-center gap-1.5">
                            Length of stay: <span className="text-morandi-forest font-black text-sm md:text-base opacity-100">{stayDuration}</span> Days
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 pb-4">
                    <h2 className="text-3xl md:text-5xl font-serif text-morandi-forest tracking-tighter leading-tight drop-shadow-sm">
                      What are your travel preferences for this trip?
                    </h2>
                  </div>

                  <div className="space-y-4 md:space-y-6">
                    <div className="bg-white/40 backdrop-blur-sm rounded-xl px-3 py-1 w-max inline-block">
                      <label className="text-[10px] md:text-[11px] font-black text-morandi-forest uppercase tracking-[0.3em] md:tracking-[0.4em] opacity-80">Scam Shield</label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                      {[
                        { key: 'filterShredder', icon: StarHalf, label: 'Filter Shredder', sub: 'Low-rated traps' },
                        { key: 'bbGuard', icon: ShieldAlert, label: 'B&B Guard', sub: 'Poor accommodations' },
                        { key: 'noQueueMode', icon: Clock, label: 'No-Queue Mode', sub: 'Spots < 30m wait' }
                      ].map((toggle) => (
                        <button
                          key={toggle.key}
                          onClick={() => toggleSafety(toggle.key as any)}
                          className={`flex items-center md:flex-col items-start md:items-start gap-4 md:gap-0 p-5 md:p-6 rounded-3xl border-2 transition-all duration-500 group backdrop-blur-sm ${config.safetyToggles[toggle.key as keyof typeof config.safetyToggles] ? 'bg-morandi-sunset text-white border-morandi-sunset shadow-xl' : 'bg-white/50 border-white/60 text-morandi-forest hover:bg-white shadow-sm'}`}
                        >
                          <toggle.icon className={`w-6 h-6 md:w-8 md:h-8 md:mb-4 transition-transform group-hover:scale-110 ${config.safetyToggles[toggle.key as keyof typeof config.safetyToggles] ? 'text-white' : 'text-morandi-sunset'}`} />
                          <div className="flex flex-col items-start">
                            <span className="font-bold text-xs md:text-sm tracking-tight">{toggle.label}</span>
                            <span className={`text-[8px] md:text-[10px] uppercase tracking-wider opacity-70 mt-0.5 md:mt-1 ${config.safetyToggles[toggle.key as keyof typeof config.safetyToggles] ? 'text-white' : 'text-morandi-forest'}`}>{toggle.sub}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    <div className="space-y-4 md:space-y-6">
                      <div className="bg-white/40 backdrop-blur-sm rounded-xl px-3 py-1 w-max inline-block">
                        <label className="text-[10px] md:text-[11px] font-black text-morandi-forest uppercase tracking-[0.3em] md:tracking-[0.4em] opacity-80">Accommodation</label>
                      </div>
                      <div className="relative bg-white/60 backdrop-blur-md p-1 rounded-full border-2 border-white/80 flex items-center h-14 md:h-16 overflow-hidden shadow-sm">
                         {[
                          { name: 'Hostel', icon: Home, value: 'Hostel' },
                          { name: 'Budget', icon: Building, value: 'Budget Hotel' },
                          { name: 'Luxury', icon: Sparkles, value: 'Luxury/Boutique' }
                        ].map((acc) => (
                          <button
                            key={acc.name}
                            onClick={() => setConfig({...config, accommodation: acc.value as any})}
                            className={`relative flex-1 h-full z-10 flex items-center justify-center gap-2 transition-colors duration-500 ${config.accommodation === acc.value ? 'text-white' : 'text-morandi-forest/70'}`}
                          >
                            {config.accommodation === acc.value && (
                              <motion.div 
                                layoutId="acc-slider-bg" 
                                className="absolute inset-0 bg-morandi-forest rounded-full -z-10"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                              />
                            )}
                            <acc.icon className="w-4 h-4" />
                            <span className="font-bold text-[10px] md:text-xs tracking-tight uppercase">{acc.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 md:space-y-6">
                      <div className="bg-white/40 backdrop-blur-sm rounded-xl px-3 py-1 w-max inline-block">
                        <label className="text-[10px] md:text-[11px] font-black text-morandi-forest uppercase tracking-[0.3em] md:tracking-[0.4em] opacity-80">Transport</label>
                      </div>
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                        {[
                          { name: 'Transit', icon: Train, value: 'Public Transit' },
                          { name: 'Rental', icon: Car, value: 'Rental Car' },
                          { name: 'Ride', icon: Navigation, value: 'Ride-hailing' },
                          { name: 'Walking', icon: Footprints, value: 'Walk-Friendly' }
                        ].map((tr) => (
                          <button
                            key={tr.name}
                            onClick={() => setConfig({...config, transport: tr.value as any})}
                            className={`flex items-center gap-3 p-4 rounded-3xl border-2 transition-all backdrop-blur-sm ${config.transport === tr.value ? 'bg-morandi-forest text-white border-morandi-forest shadow-lg' : 'bg-white/60 border-white/80 text-morandi-forest/70 hover:bg-white shadow-sm'}`}
                          >
                            <tr.icon className="w-4 h-4 shrink-0" />
                            <span className="font-bold text-[10px] md:text-xs tracking-tight uppercase whitespace-nowrap">{tr.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 md:space-y-8">
                    <div className="bg-white/40 backdrop-blur-sm rounded-xl px-3 py-1 w-max inline-block">
                      <label className="text-[10px] md:text-[11px] font-black text-morandi-forest uppercase tracking-[0.3em] md:tracking-[0.4em] opacity-80">The Journal Note</label>
                    </div>
                    <textarea
                      value={config.customNote}
                      onChange={(e) => setConfig({...config, customNote: e.target.value})}
                      placeholder="Anything else? (e.g., Honeymoon, pet-friendly...)"
                      className="w-full h-32 md:h-40 bg-white/40 backdrop-blur-md border-2 border-morandi-forest/10 rounded-3xl md:rounded-[32px] p-6 md:p-8 font-serif text-lg text-morandi-forest focus:border-morandi-sunset outline-none transition-all resize-none shadow-inner italic placeholder:opacity-40"
                    />
                  </div>

                  <button 
                    onClick={startAnalysis}
                    disabled={loading || !config.destination}
                    className="w-full py-6 md:py-10 bg-morandi-forest text-morandi-mist rounded-3xl md:rounded-[40px] font-black text-xl md:text-2xl shadow-2xl hover:bg-morandi-forest/90 transition-all disabled:opacity-20 tracking-tight"
                  >
                    Create Journal Entry
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="journal-main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex flex-col md:flex-row h-screen overflow-hidden relative"
          >
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
                          <h2 className="text-3xl md:text-5xl font-serif text-morandi-forest tracking-tighter leading-none">The Journal.</h2>
                          <p className="text-[8px] md:text-[11px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-morandi-forest/30 italic">CURATED ATMOSPHERE</p>
                        </div>
                        <button 
                          onClick={() => {
                            setLoading(false);
                            setActiveView('journal');
                            setIsSetupView(true);
                          }} 
                          className="px-6 md:px-10 py-3 md:py-4 glass-panel rounded-full text-[8px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-morandi-forest/60 hover:text-morandi-forest border-white/60 transition-all shadow-md pointer-events-auto relative z-[50]"
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

                      <div className="sticky top-4 z-40 flex justify-center w-full pointer-events-none px-4">
                        <div className="bg-white/80 backdrop-blur-3xl px-2 py-1.5 md:px-3 md:py-2 rounded-full border border-white/60 shadow-xl flex gap-1 md:gap-2 pointer-events-auto overflow-x-auto no-scrollbar max-w-full snap-x snap-mandatory scroll-smooth">
                          {plan?.map((day, idx) => (
                            <button
                              key={day.date}
                              onClick={() => setActiveDate(day.date)}
                              className={`relative px-4 md:px-8 py-2 md:py-3 rounded-full transition-all duration-500 whitespace-nowrap flex-shrink-0 snap-center ${activeDate === day.date ? 'shadow-lg scale-105' : 'opacity-40 hover:opacity-100'}`}
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

                                <PlaceThumbnail 
                                  item={item} 
                                  cachedImage={imageCache[item.id]} 
                                  onImageGenerated={handleImageGenerated} 
                                />

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
