
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { UserProfile, TripConfig, DayPlan, ItineraryItem } from '../types.ts';
import { generatePlan, generateMoodImage, generatePlaceImage } from '../services/geminiService.ts';
import PastelMap from './PastelMap.tsx';
import LoadingOverlay from './LoadingOverlay.tsx';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Trash2, Clock, Home, Building, Sparkles, Train, Car, Navigation } from 'lucide-react';

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
  const [sources, setSources] = useState<{ uri: string; title: string }[] | undefined>(undefined);
  const [moodImage, setMoodImage] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [isSetupView, setIsSetupView] = useState(true);

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

  const handleGenerate = async () => {
    if (!config.destination) return;
    setLoading(true);
    setMoodImage(null);
    setSources(undefined);
    
    try {
      const [result, heroImg] = await Promise.all([
        generatePlan(profile, config),
        generateMoodImage(config.destination).catch(() => null)
      ]);

      setPlan(result.itinerary);
      setSummary(result.summary);
      setSources(result.sources);
      setMoodImage(heroImg);
      if (result.itinerary.length > 0) setActiveDate(result.itinerary[0].date);
      setIsSetupView(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      alert("Curation interrupted. Please try again.");
      console.error("Generation error:", error);
    } finally {
      setLoading(false);
    }
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
                    onClick={handleGenerate}
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
            className="flex flex-col md:flex-row h-screen overflow-hidden"
          >
            <div className="w-full md:w-1/2 overflow-y-auto custom-scrollbar p-8 md:p-24 bg-morandi-mist">
              <div className="space-y-24 pb-64 max-w-2xl mx-auto">
                <div className="flex items-center justify-between border-b border-morandi-forest/5 pb-16">
                  <div className="space-y-3">
                    <h2 className="text-5xl font-serif text-morandi-forest tracking-tighter leading-none">Journalin.</h2>
                    <p className="text-[11px] font-black uppercase tracking-[0.6em] text-morandi-forest/30 italic">DOCUMENTING THE EXTRAORDINARY</p>
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

                <div className="sticky top-0 z-10 py-10 -mx-10 px-10 bg-morandi-mist/95 backdrop-blur-3xl border-b border-morandi-forest/5">
                  <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4">
                    {plan?.map((day, idx) => (
                      <button
                        key={day.date}
                        onClick={() => setActiveDate(day.date)}
                        className={`px-12 py-6 rounded-[28px] font-black text-xs tracking-widest whitespace-nowrap transition-all duration-700 border-2 ${activeDate === day.date ? 'bg-morandi-forest text-morandi-mist border-morandi-forest shadow-2xl scale-110' : 'bg-white/40 text-morandi-forest/30 border-white/60 hover:bg-white hover:text-morandi-forest'}`}
                      >
                        DAY {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-40">
                  <AnimatePresence mode="popLayout">
                    {activeItems.map((item, idx) => (
                      <motion.div 
                        key={item.id || idx}
                        initial={{ opacity: 0, y: 80 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.1, duration: 0.8 }}
                        className="flex flex-col gap-16"
                      >
                        <div className="flex items-center gap-12 group">
                          <div className="relative">
                             <span className="text-[11rem] font-serif text-morandi-forest/5 absolute -top-16 -left-12 select-none group-hover:text-morandi-forest/10 transition-all duration-1000 pointer-events-none">{item.time}</span>
                             <span className="text-8xl font-serif text-morandi-forest relative z-10 drop-shadow-sm tracking-tighter leading-none">{item.time}</span>
                          </div>
                          <div className="h-[2px] flex-1 bg-morandi-forest/10" />
                          <div className="flex flex-col items-end">
                            <span className="text-[11px] font-black uppercase tracking-[0.5em] text-morandi-sunset mb-3">{item.type}</span>
                            <h3 className="text-5xl font-bold text-morandi-forest text-right leading-tight max-w-lg tracking-tight">{item.title}</h3>
                          </div>
                        </div>

                        <PlaceThumbnail item={item} />

                        <div className="relative pl-20 border-l-[8px] border-morandi-sage/30">
                          <p className="text-morandi-forest/80 leading-relaxed font-medium text-3xl italic font-serif opacity-90 leading-snug">
                            "{item.description}"
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {sources && (
                  <div className="mt-48 p-20 glass-panel rounded-[80px] shadow-inner border-white/60">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.6em] text-morandi-forest opacity-30 mb-12">BIBLIOGRAPHY & SOURCES</h4>
                    <div className="flex flex-wrap gap-6">
                      {sources.map((source, i) => (
                        <a 
                          key={i} 
                          href={source.uri} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="bg-white/80 px-12 py-6 rounded-[32px] text-xs font-bold text-morandi-forest hover:bg-morandi-forest hover:text-white transition-all shadow-xl flex items-center gap-4 group border border-white/40"
                        >
                          <svg className="w-5 h-5 transition-transform group-hover:rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          {source.title.toUpperCase()}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full h-[50vh] md:w-1/2 md:h-full relative border-t md:border-t-0 md:border-l border-white/40 bg-white/5 backdrop-blur-xl">
               <PastelMap destination={config.destination} items={activeItems} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
