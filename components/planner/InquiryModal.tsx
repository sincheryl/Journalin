import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronRight } from 'lucide-react';
import { InquiryResult } from '../../types.ts';

interface InquiryModalProps {
  inquiryData: InquiryResult | null;
  inquiryAnswers: Record<string, string>;
  onSelectOption: (questionId: string, option: string) => void;
  onClose: () => void;
  onProceed: () => void;
  isProceedDisabled: boolean;
}

export default function InquiryModal({
  inquiryData,
  inquiryAnswers,
  onSelectOption,
  onClose,
  onProceed,
  isProceedDisabled
}: InquiryModalProps) {
  return (
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
                        onClick={() => onSelectOption(q.id, opt)}
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
                onClick={onClose}
                className="w-full md:flex-1 py-6 rounded-3xl border border-morandi-forest/10 font-black text-xs uppercase tracking-widest text-morandi-forest opacity-40 hover:opacity-100 transition-all"
              >
                Adjust Config
              </button>
              <button 
                onClick={onProceed}
                disabled={isProceedDisabled}
                className="w-full md:flex-1 py-6 bg-morandi-forest text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl disabled:opacity-20 transition-all"
              >
                Proceed to Generation
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
