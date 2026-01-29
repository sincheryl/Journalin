import React, { useState, useMemo, useEffect, useRef } from 'react';
import { UserProfile, TripConfig, DayPlan, ItineraryItem, InquiryResult, InquiryQuestion, SurvivalKit as SurvivalKitType } from '../types.ts';
import { generatePlan, generateMoodImage, generatePlaceImage, checkPlanFeasibility } from '../services/geminiService.ts';
import PastelMap from './PastelMap.tsx';
import LoadingOverlay from './LoadingOverlay.tsx';
import SurvivalKit from './SurvivalKit.tsx';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { ShieldAlert, Trash2, Clock, Home, Building, Sparkles, Train, Car, Navigation, HelpCircle, ChevronRight, DollarSign, Timer, MapPin, GripVertical, BookOpen, Compass, ArrowUpRight, ExternalLink } from 'lucide-react';

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
      className="w-full aspect-[16/9] rounded-[48px] overflow-hidden bg-morandi-forest/5 border-[12px] border-white shadow-2xl relative group"
    >
      <AnimatePresence mode="wait">
        {loading || !hasStarted ? (
          <motion.div 
            key="loader"
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-xl"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-morandi-forest/10 border-t-morandi-forest rounded-full animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-morandi-forest/30">
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
  const [plan, setPlan] = useState<DayPlan[] | null>(null);
  const [summary, setSummary] = useState('');
  const [survivalKit, setSurvivalKit] = useState<SurvivalKitType | null>(null);
  const [moodImage, setMoodImage] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [isSetupView, setIsSetupView] = useState(true);
  const [activeView, setActiveView] = useState<'journal' | 'survival'>('journal');

  // Inquiry State
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
      if (result.itinerary.length > 0) setActiveDate(result.itinerary[0].date);
      setIsSetupView(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      alert("Curation interrupted. The model might be busy. Please try again.");
      console.error("Generation error:", error);
    } finally {
      setLoading(false);
    }
  };

  const recalculateTimeline = (items: ItineraryItem[]): ItineraryItem[] => {
    if (items.length === 0) return items;

    const parseTime = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const formatTime = (minutes: number) => {
      const h = Math.floor(minutes / 60) % 24;
      const m = minutes % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const parseDuration = (d: string) => {
      if (!d) return 60; 
      const matches = d.match(/(\d+(\.\d+)?)\s*(h|m|min|hour)/i);
      if (!matches) return 60;
      const val = parseFloat(matches[1]);
      const unit = matches[3].toLowerCase();
      if (unit.startsWith('h')) return val * 60;
      return val;
    };

    let currentTime = parseTime(items[0].time);
    return items.map((item, idx) => {
      if (idx === 0) return item;
      const prev = items[idx - 1];
      const duration = parseDuration(prev.duration || "1h");
      currentTime += duration + 15; 
      return { ...item, time: formatTime(currentTime) };
    });
  };

  const handleReorder = (newItems: ItineraryItem[]) => {
    if (!plan || !activeDate) return;
    const adjustedItems = recalculateTimeline(newItems);
    setPlan(prev => prev ? prev.map(d => d.date === activeDate ? { ...d, items: adjustedItems } : d) : null);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!plan || !activeDate) return;
    const currentDay = plan.find(d => d.date === activeDate);
    if (!currentDay) return;
    const filtered = currentDay.items.filter(i => i.id !== itemId);
    const adjusted = recalculateTimeline(filtered);
    setPlan(prev => prev ? prev.map(d => d.date === activeDate ? { ...d, items: adjusted } : d) : null);
  };

  const activeItems = useMemo(() => plan?.find(d => d.date === activeDate)?.items || [], [plan, activeDate]);

  const paperBackgroundStyle = {
    backgroundImage: `linear-gradient(#cbd9c9 1px, transparent 1px)`,
    backgroundSize: '100% 3rem',
    backgroundColor: '#f7f9f8'
  };

  return (
    <div className="min-h-screen relative bg-transparent">
      <LoadingOverlay isVisible={loading} destination={config.destination} loadingImage={null} />

      <AnimatePresence>
        {inquiryData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-morandi-forest/40 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-panel max-w-xl w-full p-10 md:p-16 rounded-[48px] shadow-5xl border-white/60 space-y-10"
            >
              <div className="flex items-center gap-4 text-morandi-forest">
                <HelpCircle className="w-8 h-8 opacity-40" />
                <div>
                  <h3 className="text-3xl font-serif">Curator's Inquiry</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Ensuring Logical Harmony</p>
                </div>
              </div>
              
              <div className="p-6 bg-morandi-forest/5 rounded-[32px] border border-morandi-forest/5 italic text-morandi-forest/70 text-sm">
                "{inquiryData.reason}"
              </div>

              <div className="space-y-10 overflow-y-auto max-h-[50vh] pr-4 custom-scrollbar">
                {inquiryData.questions?.map((q) => (
                  <div key={q.id} className="space-y-6">
                    <p className="text-xl font-serif text-morandi-forest leading-snug">{q.question}</p>
                    <div className="grid grid-cols-1 gap-3">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setInquiryAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          className={`flex items-center justify-between px-8 py-5 rounded-[24px] border-2 transition-all ${inquiryAnswers[q.id] === opt ? 'bg-morandi-forest text-white border-morandi-forest shadow-lg' : 'bg-white/40 border-white/40 text-morandi-forest hover:bg-white'}`}
                        >
                          <span className="font-bold text-sm">{opt}</span>
                          {inquiryAnswers[q.id] === opt && <ChevronRight className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setInquiryData(null)}
                  className="flex-1 py-6 rounded-[24px] border border-morandi-forest/10 font-black text-xs uppercase tracking-widest text-morandi-forest opacity-40 hover:opacity-100 transition-all"
                >
                  Adjust Config
                </button>
                <button 
                  onClick={handleGenerate}
                  disabled={Object.keys(inquiryAnswers).length < (inquiryData.questions?.length || 0)}
                  className="flex-[2] py-6 bg-morandi-forest text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-2xl disabled:opacity-20 transition-all"
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
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center px-6 py-12 md:py-24"
          >
            <div className="max-w-3xl w-full space-y-12 pb-24">
              <header className="text-center space-y-4">
                <span className="text-[10px] font-black uppercase tracking-[0.8em] text-morandi-forest opacity-30">CHAPTER TWO</span>
                <h1 className="text-7xl font-serif text-morandi-forest tracking-tighter leading-none">Discovery.</h1>
                <p className="text-morandi-forest/60 font-medium text-lg italic">Curating the bounds of your journey.</p>
              </header>

              <div 
                className="glass-panel p-10 md:p-16 rounded-[64px] shadow-2xl space-y-12 border-white/40 relative overflow-hidden"
                style={paperBackgroundStyle}
              >
                <div className="absolute left-10 md:left-14 top-0 bottom-0 w-[1px] bg-red-200/50 z-0 pointer-events-none" />
                
                <div className="relative z-10 space-y-12">
                  <div className="space-y-10">
                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-morandi-forest uppercase tracking-[0.4em] opacity-40">Destination</label>
                      <input 
                        type="text" 
                        value={config.destination}
                        onChange={(e) => setConfig({...config, destination: e.target.value})}
                        placeholder="Where to?"
                        className="w-full bg-transparent border-b-[3px] border-morandi-forest/10 py-4 text-6xl font-serif text-morandi-forest focus:border-morandi-sunset outline-none transition-all placeholder:opacity-20 tracking-tight"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-4">
                        <label className="text-[11px] font-black text-morandi-forest uppercase tracking-[0.4em] opacity-40">Start Date</label>
                        <input 
                          type="date" 
                          value={config.startDate}
                          onChange={(e) => setConfig({...config, startDate: e.target.value})}
                          className="w-full bg-white/40 border border-white/60 rounded-[24px] px-8 py-6 font-bold text-sm text-morandi-forest outline-none focus:ring-4 ring-morandi-sunset/10"
                        />
                      </div>

                      <div className="space-y-4">
                        <label className="text-[11px] font-black text-morandi-forest uppercase tracking-[0.4em] opacity-40">Length of Stay</label>
                        <div className="flex items-center gap-6 bg-white/40 border border-white/60 rounded-[24px] px-6 py-4">
                          <button onClick={() => handleDurationChange(Math.max(1, stayDuration - 1))} className="w-14 h-14 flex items-center justify-center rounded-[20px] bg-white text-morandi-forest active:scale-90 transition-all shadow-lg hover:bg-morandi-forest hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 12H6" strokeWidth="4" strokeLinecap="round"/></svg>
                          </button>
                          <span className="flex-1 text-center font-black text-2xl text-morandi-forest">{stayDuration} <span className="text-[10px] uppercase opacity-40 ml-1">Days</span></span>
                          <button onClick={() => handleDurationChange(stayDuration + 1)} className="w-14 h-14 flex items-center justify-center rounded-[20px] bg-white text-morandi-forest active:scale-90 transition-all shadow-lg hover:bg-morandi-forest hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6v12M6 12h12" strokeWidth="4" strokeLinecap="round"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <label className="text-[11px] font-black text-morandi-forest uppercase tracking-[0.4em] opacity-40">Safety Toggles</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { key: 'filterShredder', icon: Trash2, label: 'Filter Shredder', sub: 'Low-rated traps' },
                        { key: 'bbGuard', icon: ShieldAlert, label: 'B&B Guard', sub: 'Poor accommodations' },
                        { key: 'noQueueMode', icon: Clock, label: 'No-Queue Mode', sub: 'Spots < 30m wait' }
                      ].map((toggle) => (
                        <button
                          key={toggle.key}
                          onClick={() => toggleSafety(toggle.key as any)}
                          className={`flex flex-col items-start p-6 rounded-[32px] border-2 transition-all duration-500 group ${config.safetyToggles[toggle.key as keyof typeof config.safetyToggles] ? 'bg-morandi-sunset text-white border-morandi-sunset shadow-xl' : 'bg-white/40 border-white/40 text-morandi-forest hover:bg-white'}`}
                        >
                          <toggle.icon className={`w-8 h-8 mb-4 transition-transform group-hover:scale-110 ${config.safetyToggles[toggle.key as keyof typeof config.safetyToggles] ? 'text-white' : 'text-morandi-sunset'}`} />
                          <span className="font-bold text-sm tracking-tight">{toggle.label}</span>
                          <span className={`text-[10px] uppercase tracking-wider opacity-60 mt-1 ${config.safetyToggles[toggle.key as keyof typeof config.safetyToggles] ? 'text-white' : 'text-morandi-forest'}`}>{toggle.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <label className="text-[11px] font-black text-morandi-forest uppercase tracking-[0.4em] opacity-40">Accommodation</label>
                      <div className="space-y-4">
                        {[
                          { name: 'Hostel/Capsule', icon: Home, value: 'Hostel' },
                          { name: 'Budget Hotel', icon: Building, value: 'Budget Hotel' },
                          { name: 'Luxury/Boutique', icon: Sparkles, value: 'Luxury/Boutique' }
                        ].map((acc) => (
                          <button
                            key={acc.name}
                            onClick={() => setConfig({...config, accommodation: acc.value as any})}
                            className={`w-full flex items-center gap-4 p-5 rounded-[24px] border-2 transition-all hover:scale-[1.02] ${config.accommodation === acc.value ? 'bg-morandi-forest text-white border-morandi-forest shadow-xl' : 'bg-white/40 border-white/40 text-morandi-forest/60'}`}
                          >
                            <acc.icon className="w-5 h-5" />
                            <span className="font-bold text-sm tracking-tight">{acc.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <label className="text-[11px] font-black text-morandi-forest uppercase tracking-[0.4em] opacity-40">Transport</label>
                      <div className="space-y-4">
                        {[
                          { name: 'Public Transit', icon: Train, value: 'Public Transit' },
                          { name: 'Rental Car', icon: Car, value: 'Rental Car' },
                          { name: 'Ride-hailing', icon: Navigation, value: 'Ride-hailing' }
                        ].map((tr) => (
                          <button
                            key={tr.name}
                            onClick={() => setConfig({...config, transport: tr.value as any})}
                            className={`w-full flex items-center gap-4 p-5 rounded-[24px] border-2 transition-all hover:scale-[1.02] ${config.transport === tr.value ? 'bg-morandi-forest text-white border-morandi-forest shadow-xl' : 'bg-white/40 border-white/40 text-morandi-forest/60'}`}
                          >
                            <tr.icon className="w-5 h-5" />
                            <span className="font-bold text-sm tracking-tight">{tr.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <label className="text-[11px] font-black text-morandi-forest uppercase tracking-[0.4em] opacity-40">The Journal Note</label>
                    <textarea
                      value={config.customNote}
                      onChange={(e) => setConfig({...config, customNote: e.target.value})}
                      placeholder="Anything else for your journey? (e.g., Honeymoon, pet-friendly...)"
                      className="w-full h-40 bg-transparent border-2 border-morandi-forest/5 rounded-[32px] p-8 font-serif text-lg text-morandi-forest focus:border-morandi-sunset outline-none transition-all resize-none shadow-inner italic"
                    />
                  </div>

                  <button 
                    onClick={startAnalysis}
                    disabled={loading || !config.destination}
                    className="w-full py-10 bg-morandi-forest text-morandi-mist rounded-[40px] font-black text-2xl shadow-2xl hover:bg-morandi-forest/90 transition-all disabled:opacity-20 tracking-tight"
                  >
                    Create Journal Entry
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="journal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col md:flex-row h-screen overflow-hidden relative"
          >
            {/* Main Content Area - Dynamic Width */}
            <div className={`transition-all duration-700 ease-in-out overflow-y-auto custom-scrollbar p-8 md:p-24 bg-morandi-mist pb-40 ${activeView === 'survival' ? 'w-full' : 'w-full md:w-1/2'}`}>
              <div className={`mx-auto space-y-24 transition-all duration-700 ${activeView === 'survival' ? 'max-w-6xl' : 'max-w-2xl'}`}>
                <div className="flex items-center justify-between border-b border-morandi-forest/5 pb-16">
                  <div className="space-y-3">
                    <h2 className="text-5xl font-serif text-morandi-forest tracking-tighter leading-none">Discovery.</h2>
                    <p className="text-[11px] font-black uppercase tracking-[0.6em] text-morandi-forest/30 italic">CURATED ATMOSPHERE</p>
                  </div>
                  <button 
                    onClick={() => {
                      setLoading(false);
                      setIsSetupView(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} 
                    className="px-10 py-4 glass-panel rounded-full text-[11px] font-black uppercase tracking-[0.3em] text-morandi-forest/60 hover:text-morandi-forest border-white/60 transition-all shadow-md"
                  >
                    Draft New
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {activeView === 'journal' ? (
                    <motion.div
                      key="journal-view"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.5 }}
                      className="space-y-24"
                    >
                      <div className="relative h-[420px] rounded-[72px] overflow-hidden shadow-2xl border-[24px] border-white bg-white group">
                        {moodImage ? (
                          <img src={moodImage} alt={config.destination} className="w-full h-full object-cover transition-transform duration-[6s] group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-morandi-forest/5"><div className="w-12 h-12 border-4 border-morandi-forest/10 border-t-morandi-forest rounded-full animate-spin" /></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-morandi-forest/90 via-morandi-forest/30 to-transparent" />
                        <div className="absolute bottom-16 left-12 right-12 text-morandi-mist">
                          <span className="text-[11px] font-black uppercase tracking-[0.7em] opacity-60 mb-4 block">DESTINATION OVERVIEW</span>
                          <h2 className="text-7xl md:text-8xl font-serif mb-6 leading-none tracking-tighter">{config.destination}</h2>
                        </div>
                      </div>

                      <div className="sticky top-4 z-50 flex justify-center w-full pointer-events-none">
                        <div className="bg-white/80 backdrop-blur-3xl px-3 py-2 rounded-full border border-white/60 shadow-5xl flex gap-2 pointer-events-auto">
                          {plan?.map((day, idx) => (
                            <button
                              key={day.date}
                              onClick={() => setActiveDate(day.date)}
                              className={`relative px-8 py-3 rounded-full transition-all duration-500 overflow-hidden ${activeDate === day.date ? 'shadow-lg scale-105' : 'hover:scale-105 opacity-50 hover:opacity-100'}`}
                            >
                              <div className={`absolute inset-0 transition-opacity duration-500 ${activeDate === day.date ? 'bg-morandi-forest opacity-100' : 'bg-transparent'}`} />
                              <div className="relative z-10 flex flex-col items-center min-w-[60px]">
                                <span className={`text-[8px] font-black uppercase tracking-[0.2em] mb-0.5 transition-colors ${activeDate === day.date ? 'text-white/40' : 'text-morandi-forest/30'}`}>
                                  DAY 0{idx + 1}
                                </span>
                                <span className={`text-[12px] font-bold tracking-tight transition-colors ${activeDate === day.date ? 'text-white' : 'text-morandi-forest'}`}>
                                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-20">
                        <Reorder.Group axis="y" values={activeItems} onReorder={handleReorder} className="space-y-40">
                          <AnimatePresence mode="popLayout">
                            {activeItems.map((item) => (
                              <Reorder.Item 
                                key={item.id} 
                                value={item}
                                initial={{ opacity: 0, y: 80 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, x: -50 }}
                                transition={{ duration: 0.8 }}
                                className="flex flex-col gap-12 cursor-grab active:cursor-grabbing bg-transparent relative group"
                              >
                                <div className="absolute -left-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-morandi-forest/20 hidden md:block">
                                  <GripVertical className="w-10 h-10" />
                                </div>

                                <div className="flex items-end justify-between border-b border-morandi-forest/5 pb-8 relative">
                                  <div className="relative shrink-0">
                                     <span className="text-[11rem] font-serif text-morandi-forest/5 absolute -top-16 -left-12 select-none group-hover:text-morandi-forest/10 transition-all duration-1000 pointer-events-none">{item.time}</span>
                                     <span className="text-8xl font-serif text-morandi-forest relative z-10 drop-shadow-sm tracking-tighter leading-none">{item.time}</span>
                                  </div>
                                  
                                  <div className="flex flex-col items-end gap-2 mb-2 min-w-0 w-full overflow-hidden">
                                     {/* Metadata Row: Forced Single Line */}
                                     <div className="flex items-center gap-2 flex-nowrap shrink-0 overflow-x-auto no-scrollbar justify-end w-full pb-1">
                                        {item.duration && (
                                          <div className="flex items-center gap-2 text-morandi-sage px-3 py-1.5 bg-morandi-sage/5 rounded-full border border-morandi-sage/10 whitespace-nowrap shrink-0">
                                             <Timer className="w-3 h-3" />
                                             <span className="text-[9px] font-black uppercase tracking-widest">{item.duration}</span>
                                          </div>
                                        )}
                                        {item.costEstimate && (
                                          <div className="flex items-center gap-2 text-morandi-sunset font-bold px-3 py-1.5 bg-morandi-sunset/5 rounded-full border border-morandi-sunset/10 whitespace-nowrap shrink-0">
                                             <DollarSign className="w-3 h-3" />
                                             <span className="text-[9px] font-black uppercase tracking-widest">{item.costEstimate}</span>
                                          </div>
                                        )}
                                        {(item.openTime || item.closeTime) && (
                                          <div className="flex items-center gap-2 text-morandi-forest px-3 py-1.5 bg-white/50 rounded-full border border-white shadow-sm whitespace-nowrap shrink-0">
                                             <Clock className="w-3 h-3 opacity-40" />
                                             <span className="text-[9px] font-black uppercase tracking-widest">
                                               {item.openTime || '--'} - {item.closeTime || '--'}
                                             </span>
                                          </div>
                                        )}
                                        <a 
                                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.title}, ${config.destination}`)}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="flex items-center gap-2 px-3 py-1.5 bg-morandi-forest text-white rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap shrink-0 hover:bg-morandi-forest/80 transition-colors shadow-sm"
                                        >
                                          <MapPin className="w-3 h-3" />
                                          MAP
                                        </a>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteItem(item.id);
                                          }}
                                          className="p-2 text-morandi-forest/10 hover:text-red-400 hover:bg-red-50/50 rounded-full transition-all shrink-0"
                                          title="Remove from itinerary"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                     </div>
                                     
                                     <div className="flex flex-col items-end w-full">
                                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-morandi-forest/40 mb-0.5">{item.type}</span>
                                        <h3 className="text-4xl font-bold text-morandi-forest text-right leading-tight max-w-full tracking-tight w-full line-clamp-2">{item.title}</h3>
                                     </div>
                                  </div>
                                </div>

                                <PlaceThumbnail item={item} />

                                <div className="relative pl-20 border-l-[8px] border-morandi-sage/30">
                                  <p className="text-morandi-forest/80 leading-relaxed font-medium text-2xl italic font-serif opacity-90 leading-snug">
                                    "{item.description}"
                                  </p>
                                </div>
                              </Reorder.Item>
                            ))}
                          </AnimatePresence>
                        </Reorder.Group>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="survival-view"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5 }}
                    >
                      {survivalKit && <SurvivalKit kit={survivalKit} />}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Floating Navigation Bar */}
            <div className="fixed bottom-10 left-0 right-0 z-[100] flex justify-center pointer-events-none px-6">
              <div className="glass-panel p-2 rounded-full border-white/60 shadow-5xl flex gap-2 pointer-events-auto items-center">
                <button 
                  onClick={() => setActiveView('journal')}
                  className={`relative flex items-center gap-4 px-10 py-4 rounded-full transition-all duration-500 overflow-hidden ${activeView === 'journal' ? 'text-white' : 'text-morandi-forest/40 hover:text-morandi-forest'}`}
                >
                  {activeView === 'journal' && (
                    <motion.div layoutId="nav-bg" className="absolute inset-0 bg-morandi-forest z-0" />
                  )}
                  <div className="relative z-10 flex items-center gap-3">
                    <BookOpen className="w-5 h-5" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Journal</span>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveView('survival')}
                  className={`relative flex items-center gap-4 px-10 py-4 rounded-full transition-all duration-500 overflow-hidden ${activeView === 'survival' ? 'text-white' : 'text-morandi-forest/40 hover:text-morandi-forest'}`}
                >
                  {activeView === 'survival' && (
                    <motion.div layoutId="nav-bg" className="absolute inset-0 bg-morandi-forest z-0" />
                  )}
                  <div className="relative z-10 flex items-center gap-3">
                    <Compass className="w-5 h-5" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Survival</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Map Area - Conditional Visibility */}
            <AnimatePresence mode="popLayout">
              {activeView === 'journal' && (
                <motion.div 
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: '50%', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.7, ease: [0.32, 0, 0.67, 0] }}
                  className="hidden md:block h-full relative border-l border-white/40 bg-white/5 backdrop-blur-xl"
                >
                   <PastelMap destination={config.destination} items={activeItems} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile Map - Conditional Visibility */}
            {activeView === 'journal' && (
              <div className="md:hidden w-full h-[50vh] relative border-t border-white/40 bg-white/5 backdrop-blur-xl">
                 <PastelMap destination={config.destination} items={activeItems} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
