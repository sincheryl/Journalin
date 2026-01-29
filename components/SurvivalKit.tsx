
import React from 'react';
import { SurvivalKit as SurvivalKitType } from '../types';
import { motion } from 'framer-motion';
import { AppWindow, Package, Lightbulb, Wallet, CheckCircle2 } from 'lucide-react';

interface Props {
  kit: SurvivalKitType;
}

const SurvivalKit: React.FC<Props> = ({ kit }) => {
  return (
    <div className="space-y-24">
      <header className="space-y-4">
        <span className="text-[10px] font-black uppercase tracking-[0.8em] text-morandi-forest opacity-30 italic">CHAPTER THREE</span>
        <h2 className="text-6xl font-serif text-morandi-forest tracking-tighter leading-tight">The Survival Kit.</h2>
        <p className="text-morandi-forest/60 font-medium text-lg italic">Essential wisdom for your destination.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Local Apps */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-panel p-12 rounded-[48px] border-white/60 space-y-8 flex flex-col"
        >
          <div className="flex items-center gap-4 text-morandi-forest">
            <AppWindow className="w-6 h-6 opacity-40" />
            <h3 className="text-2xl font-serif">Essential Apps</h3>
          </div>
          <div className="space-y-8 flex-1">
            {kit.essentialApps.map((app, i) => {
              const isUrl = app.icon.startsWith('http');
              return (
                <div key={i} className="flex gap-6 group items-center">
                  <div className="w-16 h-16 flex items-center justify-center text-5xl filter grayscale group-hover:grayscale-0 transition-all duration-700 transform group-hover:scale-110 shrink-0">
                    {isUrl ? (
                      <img src={app.icon} alt={app.name} className="w-full h-full object-contain" />
                    ) : (
                      <span>{app.icon}</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-morandi-forest text-lg tracking-tight">{app.name}</h4>
                    <p className="text-sm text-morandi-forest/60 italic leading-snug max-w-[200px]">{app.purpose}</p>
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
          className="glass-panel p-12 rounded-[48px] border-white/60 space-y-8"
        >
          <div className="flex items-center gap-4 text-morandi-forest">
            <Package className="w-6 h-6 opacity-40" />
            <h3 className="text-2xl font-serif">Survival Packing</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {kit.packingList.map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-5 bg-white/30 rounded-[28px] border border-white/40 group hover:bg-white/50 transition-all">
                <div className="w-8 h-8 rounded-full bg-morandi-sage/10 flex items-center justify-center text-morandi-sage group-hover:bg-morandi-sage group-hover:text-white transition-all">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-morandi-forest/80 italic leading-none">{item}</span>
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
          className="glass-panel p-12 rounded-[48px] border-white/60 space-y-8"
        >
          <div className="flex items-center gap-4 text-morandi-forest">
            <Lightbulb className="w-6 h-6 opacity-40 text-morandi-sunset" />
            <h3 className="text-2xl font-serif">Local Wisdom</h3>
          </div>
          <div className="space-y-8">
            {kit.localTips.map((tip, i) => (
              <div key={i} className="relative pl-10 border-l-[3px] border-morandi-sunset/10 group">
                <div className="absolute -left-[3px] top-0 h-0 w-[3px] bg-morandi-sunset group-hover:h-full transition-all duration-700" />
                <p className="text-morandi-forest/80 text-base leading-relaxed italic">"{tip}"</p>
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
          className="relative bg-morandi-forest p-14 rounded-[56px] shadow-5xl text-morandi-mist overflow-hidden flex flex-col justify-between min-h-[400px]"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-morandi-sunset/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-morandi-sunset opacity-80" />
                </div>
                <div>
                  <h3 className="text-2xl font-serif">Spending Forecast</h3>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30">DAILY CURATED ESTIMATES</p>
                </div>
              </div>
              <div className="px-4 py-2 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest opacity-40">
                {kit.budgetEstimate.currency}
              </div>
            </div>

            <div className="space-y-10">
              {[
                { label: 'Accommodation', val: kit.budgetEstimate.accommodation },
                { label: 'Dining & Food', val: kit.budgetEstimate.food },
                { label: 'Local Transport', val: kit.budgetEstimate.transport }
              ].map((item, idx) => (
                <div key={idx} className="group cursor-default">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40 group-hover:opacity-60 transition-opacity">{item.label}</span>
                    <span className="font-serif text-xl tracking-tight text-white/90">{item.val}</span>
                  </div>
                  <div className="h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 pt-16">
            <div className="bg-white/5 backdrop-blur-md rounded-[32px] p-8 border border-white/10 flex items-center justify-between transition-all duration-500">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-morandi-sunset block">ESTIMATED TOTAL</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-serif tracking-tighter text-white">{kit.budgetEstimate.totalEstimated}</span>
                  <span className="text-xs font-bold opacity-30">/ DAY</span>
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
