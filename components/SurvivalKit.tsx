
import React from 'react';
import { SurvivalKit as SurvivalKitType } from '../types';
import { motion } from 'framer-motion';
import { AppWindow, Package, Lightbulb, Wallet, CheckCircle2 } from 'lucide-react';

interface Props {
  kit: SurvivalKitType;
}

const SurvivalKit: React.FC<Props> = ({ kit }) => {
  return (
    <div className="space-y-12 md:space-y-24">
      <header className="space-y-2 md:space-y-4">
        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.6em] md:tracking-[0.8em] text-morandi-forest opacity-30 italic">CHAPTER THREE</span>
        <h2 className="text-4xl md:text-6xl font-serif text-morandi-forest tracking-tighter leading-tight">The Survival Kit.</h2>
        <p className="text-morandi-forest/60 font-medium text-base md:text-lg italic">Essential wisdom for your destination.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 pb-16 md:pb-0">
        {/* Local Apps - Swiper on Mobile */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-panel p-8 md:p-12 rounded-4xl md:rounded-[48px] border-white/60 space-y-6 md:space-y-8 flex flex-col"
        >
          <div className="flex items-center gap-4 text-morandi-forest">
            <AppWindow className="w-5 h-5 md:w-6 md:h-6 opacity-40" />
            <h3 className="text-xl md:text-2xl font-serif">Essential Apps</h3>
          </div>
          <div className="flex md:flex-col gap-6 md:gap-8 overflow-x-auto md:overflow-x-visible no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 scroll-snap-x mandatory">
            {kit.essentialApps.map((app, i) => {
              const isUrl = app.icon.startsWith('http');
              return (
                <div key={i} className="flex gap-4 md:gap-6 group items-center min-w-[240px] md:min-w-0 bg-white/20 md:bg-transparent p-4 md:p-0 rounded-2xl md:rounded-none shrink-0 scroll-snap-align-start">
                  <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center text-3xl md:text-5xl filter grayscale group-hover:grayscale-0 transition-all duration-700 transform group-hover:scale-110 shrink-0">
                    {isUrl ? (
                      <img src={app.icon} alt={app.name} className="w-full h-full object-contain" />
                    ) : (
                      <span>{app.icon}</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-morandi-forest text-base md:text-lg tracking-tight">{app.name}</h4>
                    <p className="text-xs text-morandi-forest/60 italic leading-snug max-w-[180px]">{app.purpose}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Packing List */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-8 md:p-12 rounded-4xl md:rounded-[48px] border-white/60 space-y-6 md:space-y-8"
        >
          <div className="flex items-center gap-4 text-morandi-forest">
            <Package className="w-5 h-5 md:w-6 md:h-6 opacity-40" />
            <h3 className="text-xl md:text-2xl font-serif">Survival Packing</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 md:gap-4">
            {kit.packingList.map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 md:p-5 bg-white/30 rounded-2xl md:rounded-[28px] border border-white/40 group hover:bg-white/50 transition-all">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-morandi-sage/10 flex items-center justify-center text-morandi-sage group-hover:bg-morandi-sage group-hover:text-white transition-all">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-xs md:text-sm font-bold text-morandi-forest/80 italic leading-none">{item}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Local Wisdom */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-8 md:p-12 rounded-4xl md:rounded-[48px] border-white/60 space-y-6 md:space-y-8"
        >
          <div className="flex items-center gap-4 text-morandi-forest">
            <Lightbulb className="w-5 h-5 md:w-6 md:h-6 opacity-40 text-morandi-sunset" />
            <h3 className="text-xl md:text-2xl font-serif">Local Wisdom</h3>
          </div>
          <div className="space-y-6 md:space-y-8">
            {kit.localTips.map((tip, i) => (
              <div key={i} className="relative pl-6 md:pl-10 border-l-[2px] md:border-l-[3px] border-morandi-sunset/10 group">
                <div className="absolute -left-[2px] md:-left-[3px] top-0 h-0 w-[2px] md:w-[3px] bg-morandi-sunset group-hover:h-full transition-all duration-700" />
                <p className="text-morandi-forest/80 text-sm md:text-base leading-relaxed italic">"{tip}"</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Budget Estimate */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="relative bg-morandi-forest p-10 md:p-14 rounded-5xl shadow-5xl text-morandi-mist overflow-hidden flex flex-col justify-between min-h-[360px] md:min-h-[400px]"
        >
          <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-morandi-sunset/10 rounded-full blur-[80px] md:blur-[100px] -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8 md:mb-12">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/5 flex items-center justify-center">
                  <Wallet className="w-5 h-5 md:w-6 md:h-6 text-morandi-sunset opacity-80" />
                </div>
                <div>
                  <h3 className="text-lg md:text-2xl font-serif">Spending Forecast</h3>
                  <p className="text-[7px] md:text-[9px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] opacity-30">DAILY ESTIMATES</p>
                </div>
              </div>
              <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-white/10 text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-40">
                {kit.budgetEstimate.currency}
              </div>
            </div>

            <div className="space-y-6 md:space-y-10">
              {[
                { label: 'Accommodation', val: kit.budgetEstimate.accommodation },
                { label: 'Dining & Food', val: kit.budgetEstimate.food },
                { label: 'Local Transport', val: kit.budgetEstimate.transport }
              ].map((item, idx) => (
                <div key={idx} className="group cursor-default">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] opacity-40">{item.label}</span>
                    <span className="font-serif text-lg md:text-xl tracking-tight text-white/90">{item.val}</span>
                  </div>
                  <div className="h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 pt-10 md:pt-16">
            <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-white/10 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-morandi-sunset block">ESTIMATED TOTAL</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl md:text-5xl font-serif tracking-tighter text-white">{kit.budgetEstimate.totalEstimated}</span>
                  <span className="text-[8px] md:text-xs font-bold opacity-30">/ DAY</span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default SurvivalKit;
