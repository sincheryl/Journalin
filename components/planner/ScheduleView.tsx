import React from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { GripVertical, Plus, Timer, Trash2 } from 'lucide-react';
import { DayPlan, ItineraryItem } from '../../types.ts';

interface ScheduleDay extends DayPlan {
  dayStart: string;
  conflicts: string[];
}

interface ScheduleViewProps {
  scheduleDays: ScheduleDay[];
  magicCommand: string;
  magicFeedback: string | null;
  onMagicCommandChange: (value: string) => void;
  onApplyMagicCommand: () => void;
  onScheduleReorder: (date: string, items: ItineraryItem[]) => void;
  onScheduleDelete: (date: string, itemId: string) => void;
  onScheduleInsert: (date: string, index: number) => void;
  onUpdateDayStart: (date: string, minutesDelta: number) => void;
  editingTitleId: string | null;
  editingTitleValue: string;
  onStartEditTitle: (itemId: string, currentTitle: string) => void;
  onSetEditingTitleValue: (value: string) => void;
  onFinishEditTitle: (date: string, item: ItineraryItem, value: string) => void;
  editingDurationId: string | null;
  durationDraft: string;
  onSetDurationDraft: (value: string) => void;
  onStartEditDuration: (itemId: string, currentMinutes: number) => void;
  onFinishEditDuration: (date: string, itemId: string, minutes: number) => void;
  parseDurationMinutes: (raw?: string | null) => number | null;
}

export default function ScheduleView({
  scheduleDays,
  magicCommand,
  magicFeedback,
  onMagicCommandChange,
  onApplyMagicCommand,
  onScheduleReorder,
  onScheduleDelete,
  onScheduleInsert,
  onUpdateDayStart,
  editingTitleId,
  editingTitleValue,
  onStartEditTitle,
  onSetEditingTitleValue,
  onFinishEditTitle,
  editingDurationId,
  durationDraft,
  onSetDurationDraft,
  onStartEditDuration,
  onFinishEditDuration,
  parseDurationMinutes
}: ScheduleViewProps) {
  return (
    <motion.div
      key="schedule-view"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="space-y-10 md:space-y-14"
    >
      <div className="space-y-2">
        <h2 className="text-3xl md:text-5xl font-serif text-morandi-forest tracking-tighter leading-none">Schedule Snapshot.</h2>
        <p className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-morandi-forest/30 italic">Manual Control, Automatic Flow</p>
      </div>

      <div className="glass-panel rounded-4xl p-5 md:p-8 border-white/60 shadow-xl space-y-3">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-morandi-forest/40">Magic Command Bar</div>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={magicCommand}
            onChange={(e) => onMagicCommandChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onApplyMagicCommand();
            }}
            placeholder="例如：把午饭时间改成 2 小时"
            className="flex-1 bg-white/70 border border-white/70 rounded-3xl px-4 py-3 text-sm text-morandi-forest outline-none focus:ring-4 ring-morandi-sunset/10"
          />
          <button
            onClick={onApplyMagicCommand}
            className="px-6 py-3 rounded-3xl bg-morandi-forest text-white text-xs font-black uppercase tracking-widest shadow-xl"
          >
            Apply
          </button>
        </div>
        {magicFeedback && (
          <div className="text-xs text-morandi-forest/60 italic">{magicFeedback}</div>
        )}
      </div>

      <div className="space-y-12">
        {scheduleDays.map((day, dayIdx) => (
          <div key={day.date} className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded-full bg-morandi-forest text-white text-[10px] font-black uppercase tracking-widest">
                  Day {String(dayIdx + 1).padStart(2, '0')}
                </div>
                <div className="text-sm font-bold text-morandi-forest">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-morandi-forest/60">
                <span className="uppercase tracking-[0.2em] font-black">Day Start</span>
                <span className="px-2 py-1 rounded-full border border-morandi-forest/10 bg-white/70 font-black">{day.dayStart}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateDayStart(day.date, -15)}
                    className="px-2 py-1 rounded-full border border-morandi-forest/10 text-morandi-forest/70 hover:text-morandi-forest"
                  >
                    -15m
                  </button>
                  <button
                    onClick={() => onUpdateDayStart(day.date, 15)}
                    className="px-2 py-1 rounded-full border border-morandi-forest/10 text-morandi-forest/70 hover:text-morandi-forest"
                  >
                    +15m
                  </button>
                </div>
              </div>
            </div>

            <Reorder.Group axis="y" values={day.items} onReorder={(items) => onScheduleReorder(day.date, items)} className="space-y-4">
              <AnimatePresence mode="popLayout">
                {day.items.map((item, idx) => (
                  <Reorder.Item
                    key={item.id}
                    value={item}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-3"
                  >
                    <div className={`rounded-4xl border-2 p-5 md:p-6 bg-white/70 shadow-lg transition-all ${item.conflict ? 'border-red-300 bg-red-50/60' : 'border-white/70'}`}>
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-start">
                            <span className="text-[10px] uppercase tracking-[0.3em] font-black text-morandi-forest/40">Time</span>
                            <div className="text-lg font-bold text-morandi-forest">
                              {item.startTime || item.time} - {item.endTime || ''}
                            </div>
                          </div>
                          <div className="h-10 w-px bg-morandi-forest/10 hidden md:block" />
                          <button
                            onClick={() => {
                              const currentMinutes = parseDurationMinutes(item.duration) ?? 60;
                              onStartEditDuration(item.id, currentMinutes);
                            }}
                            className="flex items-center gap-2 px-3 py-1 rounded-full bg-morandi-sage/10 text-morandi-sage text-xs font-black uppercase tracking-widest"
                          >
                            <Timer className="w-3 h-3" />
                            {item.duration || '60 min'}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-morandi-forest/20" />
                          <button
                            onClick={() => onScheduleDelete(day.date, item.id)}
                            className="p-2 rounded-full text-morandi-forest/30 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4">
                        {editingTitleId === item.id ? (
                          <input
                            value={editingTitleValue}
                            onChange={(e) => onSetEditingTitleValue(e.target.value)}
                            onBlur={() => onFinishEditTitle(day.date, item, editingTitleValue.trim() || item.title)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onFinishEditTitle(day.date, item, editingTitleValue.trim() || item.title);
                              }
                              if (e.key === 'Escape') {
                                onFinishEditTitle(day.date, item, item.title);
                              }
                            }}
                            className="w-full bg-white/80 border border-white/70 rounded-2xl px-4 py-3 text-lg font-bold text-morandi-forest outline-none"
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => onStartEditTitle(item.id, item.title)}
                            className="text-left text-xl md:text-2xl font-bold text-morandi-forest w-full"
                          >
                            {item.title}
                          </button>
                        )}
                        <div className="text-sm text-morandi-forest/60 italic mt-2">
                          {item.description}
                        </div>
                      </div>

                      {editingDurationId === item.id && (
                        <div className="mt-4 flex flex-col md:flex-row items-start md:items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const next = Math.max(15, (parseInt(durationDraft, 10) || 60) - 15);
                                onSetDurationDraft(String(next));
                              }}
                              className="px-3 py-1 rounded-full border border-morandi-forest/10 text-xs font-black uppercase tracking-widest"
                            >
                              -15m
                            </button>
                            <input
                              value={durationDraft}
                              onChange={(e) => onSetDurationDraft(e.target.value.replace(/[^\d]/g, ''))}
                              className="w-20 text-center bg-white/80 border border-white/70 rounded-full py-1 text-sm font-bold text-morandi-forest"
                            />
                            <button
                              onClick={() => {
                                const next = Math.min(600, (parseInt(durationDraft, 10) || 60) + 15);
                                onSetDurationDraft(String(next));
                              }}
                              className="px-3 py-1 rounded-full border border-morandi-forest/10 text-xs font-black uppercase tracking-widest"
                            >
                              +15m
                            </button>
                          </div>
                          <button
                            onClick={() => {
                              const minutes = parseInt(durationDraft, 10);
                              if (minutes) {
                                onFinishEditDuration(day.date, item.id, minutes);
                              }
                            }}
                            className="px-4 py-2 rounded-full bg-morandi-forest text-white text-xs font-black uppercase tracking-widest"
                          >
                            Update Duration
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => onScheduleInsert(day.date, idx)}
                      className="w-full flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-morandi-forest/40 hover:text-morandi-forest transition-all"
                    >
                      <div className="h-px flex-1 bg-morandi-forest/10" />
                      <span className="flex items-center gap-1">
                        <Plus className="w-3 h-3" />
                        Insert
                      </span>
                      <div className="h-px flex-1 bg-morandi-forest/10" />
                    </button>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
