import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { DayPlan, ItineraryRiskItem } from '../../types.ts';

interface ConflictModalState {
  date: string;
  conflicts: string[];
  previousPlan: DayPlan[];
  aiSummary?: string;
  aiItems?: ItineraryRiskItem[];
  fatigueScore?: number;
  suggestions?: string[];
}

interface ConflictModalProps {
  conflictModal: ConflictModalState | null;
  plan: DayPlan[] | null;
  isRiskAnalyzing: boolean;
  onUndo: () => void;
  onKeep: () => void;
}

export default function ConflictModal({
  conflictModal,
  plan,
  isRiskAnalyzing,
  onUndo,
  onKeep
}: ConflictModalProps) {
  return (
    <AnimatePresence>
      {conflictModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-end md:items-center justify-center p-0 md:p-6 bg-morandi-forest/50 backdrop-blur-xl"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="glass-panel w-full md:max-w-lg p-8 md:p-12 rounded-t-5xl md:rounded-5xl shadow-5xl border-white/60 space-y-6"
          >
            <div className="flex items-center gap-4 text-morandi-forest">
              <ShieldAlert className="w-7 h-7 opacity-60" />
              <div>
                <h3 className="text-2xl font-serif">Conflict Detected</h3>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">AI SAFETY CHECK</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-morandi-forest/70">
              <p>检测到潜在风险：可能涉及营业时间、交通衔接或体力负荷。</p>
              <p className="italic">你的编辑已保留，但建议根据提示调整时间或顺序。</p>
            </div>
            {isRiskAnalyzing && (
              <div className="text-[10px] uppercase tracking-widest text-morandi-forest/40 font-black">
                AI 正在分析真实营业时间与体力负荷...
              </div>
            )}
            {conflictModal.aiSummary && (
              <div className="bg-white/60 rounded-3xl p-4 border border-white/70 space-y-3">
                <div className="text-[10px] uppercase tracking-widest text-morandi-forest/40 font-black">
                  AI 风险说明
                </div>
                <p className="text-sm text-morandi-forest/80">{conflictModal.aiSummary}</p>
                {typeof conflictModal.fatigueScore === 'number' && (
                  <div className="text-xs text-morandi-forest/60">
                    体力负荷评分：{Math.round(conflictModal.fatigueScore)} / 100
                  </div>
                )}
                {conflictModal.aiItems && conflictModal.aiItems.length > 0 && (
                  <div className="space-y-2">
                    {conflictModal.aiItems.map((risk) => (
                      <div key={risk.itemId} className="text-xs text-morandi-forest/70 space-y-1">
                        <div className="flex items-start justify-between gap-4">
                          <span className="font-semibold">{risk.title}</span>
                          <span className="text-[10px] uppercase tracking-wider opacity-60">{risk.severity}</span>
                        </div>
                        <div className="text-[11px] text-morandi-forest/60">{risk.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
                {conflictModal.suggestions && conflictModal.suggestions.length > 0 && (
                  <div className="space-y-1 text-xs text-morandi-forest/70">
                    {conflictModal.suggestions.map((tip, idx) => (
                      <div key={`${tip}-${idx}`}>• {tip}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {conflictModal.conflicts.length > 0 && (
              <div className="bg-white/50 rounded-3xl p-4 border border-white/60 space-y-2">
                {conflictModal.conflicts.map((id) => {
                  const day = plan?.find(d => d.date === conflictModal.date);
                  const item = day?.items.find(it => it.id === id);
                  if (!item) return null;
                  return (
                    <div key={id} className="flex items-center justify-between text-morandi-forest text-sm">
                      <span className="font-semibold">{item.title}</span>
                      <span className="text-xs uppercase tracking-wider text-red-400">Conflict</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex flex-col md:flex-row gap-3">
              <button
                onClick={onUndo}
                className="w-full md:flex-1 py-4 rounded-3xl border border-morandi-forest/20 font-black text-xs uppercase tracking-widest text-morandi-forest/70 hover:text-morandi-forest transition-all"
              >
                Undo Changes
              </button>
              <button
                onClick={onKeep}
                className="w-full md:flex-1 py-4 bg-morandi-forest text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all"
              >
                Keep & Review
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
