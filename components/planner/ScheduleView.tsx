import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { GripVertical, Plus, Trash2, X, Check, Edit3, Clock, Calendar } from 'lucide-react';
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
  onCrossDayReorder: (fromDate: string, toDate: string, item: ItineraryItem, index: number) => void;
  onScheduleDelete: (date: string, itemId: string) => void;
  onScheduleInsert: (date: string, index: number) => void;
  onUpdateDayStart: (date: string, newTime: string) => void;
  onUpdateItemTime: (date: string, itemId: string, newStartTime: string, newEndTime: string) => void;
  showConflicts: boolean;
  onBeginEdit: () => void;
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
  formatTimeForDisplay: (timeStr: string) => string;
  parseTimeToMinutes: (timeStr: string) => number;
  formatMinutesToTime: (minutes: number) => string;
  analyzeScheduleChanges: () => Promise<any[]>;
  applyScheduleChanges: (changes: any) => Promise<void>;
  cancelScheduleChanges: () => void;
}

interface TimeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (startTime: string, endTime: string) => void;
  initialStartTime: string;
  initialEndTime: string;
  formatTimeForDisplay: (timeStr: string) => string;
  parseTimeToMinutes: (timeStr: string) => number;
  formatMinutesToTime: (minutes: number) => string;
  title?: string;
}

interface DayStartEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newTime: string) => void;
  initialTime: string;
  formatTimeForDisplay: (timeStr: string) => string;
  parseTimeToMinutes: (timeStr: string) => number;
  formatMinutesToTime: (minutes: number) => string;
}

// 时间编辑弹窗组件
const TimeEditModal: React.FC<TimeEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialStartTime,
  initialEndTime,
  formatTimeForDisplay,
  parseTimeToMinutes,
  formatMinutesToTime,
  title = "Edit Time"
}) => {
  const [startMinutes, setStartMinutes] = useState(parseTimeToMinutes(initialStartTime));
  const [endMinutes, setEndMinutes] = useState(parseTimeToMinutes(initialEndTime) || parseTimeToMinutes(initialStartTime) + 60);
  
  const totalMinutesInDay = 24 * 60; // 1440分钟
  const step = 15; // 15分钟一格
  
  // 当弹窗打开时更新状态
  useEffect(() => {
    if (isOpen) {
      setStartMinutes(parseTimeToMinutes(initialStartTime));
      setEndMinutes(parseTimeToMinutes(initialEndTime) || parseTimeToMinutes(initialStartTime) + 60);
    }
  }, [isOpen, initialStartTime, initialEndTime, parseTimeToMinutes]);
  
  if (!isOpen) return null;
  
  const handleStartChange = (minutes: number) => {
    if (minutes < 0) minutes = 0;
    if (minutes > totalMinutesInDay - step) minutes = totalMinutesInDay - step;
    if (minutes >= endMinutes) minutes = endMinutes - step;
    setStartMinutes(minutes);
  };
  
  const handleEndChange = (minutes: number) => {
    if (minutes < step) minutes = step;
    if (minutes > totalMinutesInDay) minutes = totalMinutesInDay;
    if (minutes <= startMinutes) minutes = startMinutes + step;
    setEndMinutes(minutes);
  };
  
  const handleSave = () => {
    onSave(formatMinutesToTime(startMinutes), formatMinutesToTime(endMinutes));
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        className="glass-panel rounded-4xl p-8 border-white/60 shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-morandi-forest" />
            <h3 className="text-xl font-bold text-morandi-forest">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-morandi-forest/40 hover:text-morandi-forest transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-6 mb-8">
          {/* 开始时间滑块 */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-morandi-forest/60">Start Time</span>
              <span className="text-lg font-bold text-morandi-forest">
                {formatMinutesToTime(startMinutes)}
              </span>
            </div>
            <div className="relative h-2 bg-morandi-forest/10 rounded-full">
              <input
                type="range"
                min="0"
                max={totalMinutesInDay - step}
                step={step}
                value={startMinutes}
                onChange={(e) => handleStartChange(parseInt(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="absolute h-full bg-morandi-forest/20 rounded-full"
                style={{ width: `${(startMinutes / totalMinutesInDay) * 100}%` }}
              />
              <div 
                className="absolute w-6 h-6 -top-2 rounded-full bg-morandi-forest border-4 border-white shadow-lg"
                style={{ left: `calc(${(startMinutes / totalMinutesInDay) * 100}% - 12px)` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-morandi-forest/40">
              <span>00:00</span>
              <span>12:00</span>
              <span>24:00</span>
            </div>
          </div>
          
          {/* 结束时间滑块 */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-morandi-forest/60">End Time</span>
              <span className="text-lg font-bold text-morandi-forest">
                {formatMinutesToTime(endMinutes)}
              </span>
            </div>
            <div className="relative h-2 bg-morandi-forest/10 rounded-full">
              <input
                type="range"
                min={step}
                max={totalMinutesInDay}
                step={step}
                value={endMinutes}
                onChange={(e) => handleEndChange(parseInt(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="absolute h-full bg-morandi-forest/20 rounded-full"
                style={{ width: `${(endMinutes / totalMinutesInDay) * 100}%` }}
              />
              <div 
                className="absolute w-6 h-6 -top-2 rounded-full bg-morandi-forest border-4 border-white shadow-lg"
                style={{ left: `calc(${(endMinutes / totalMinutesInDay) * 100}% - 12px)` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-morandi-forest/40">
              <span>00:00</span>
              <span>12:00</span>
              <span>24:00</span>
            </div>
          </div>
          
          {/* 持续时间显示 */}
          <div className="rounded-2xl bg-morandi-forest/5 p-4 text-center">
            <div className="text-sm text-morandi-forest/60 mb-1">Duration</div>
            <div className="text-xl font-bold text-morandi-forest">
              {Math.floor((endMinutes - startMinutes) / 60)}h {((endMinutes - startMinutes) % 60).toString().padStart(2, '0')}m
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-3xl border-2 border-morandi-forest/20 text-morandi-forest text-sm font-bold hover:bg-morandi-forest/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 rounded-3xl bg-morandi-forest text-white text-sm font-bold shadow-xl hover:shadow-2xl transition-all"
          >
            Apply
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Day Start 时间编辑弹窗组件
const DayStartEditModal: React.FC<DayStartEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTime,
  formatTimeForDisplay,
  parseTimeToMinutes,
  formatMinutesToTime
}) => {
  const [timeMinutes, setTimeMinutes] = useState(parseTimeToMinutes(initialTime));
  
  const totalMinutesInDay = 24 * 60; // 1440分钟
  const step = 15; // 15分钟一格
  
  // 当弹窗打开时更新状态
  useEffect(() => {
    if (isOpen) {
      setTimeMinutes(parseTimeToMinutes(initialTime));
    }
  }, [isOpen, initialTime, parseTimeToMinutes]);
  
  if (!isOpen) return null;
  
  const handleTimeChange = (minutes: number) => {
    if (minutes < 0) minutes = 0;
    if (minutes > totalMinutesInDay) minutes = totalMinutesInDay;
    setTimeMinutes(minutes);
  };
  
  const handleSave = () => {
    onSave(formatMinutesToTime(timeMinutes));
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        className="glass-panel rounded-4xl p-8 border-white/60 shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-morandi-forest" />
            <h3 className="text-xl font-bold text-morandi-forest">Edit Day Start Time</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-morandi-forest/40 hover:text-morandi-forest transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-6 mb-8">
          {/* 时间滑块 */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-morandi-forest/60">Day Start Time</span>
              <span className="text-lg font-bold text-morandi-forest">
                {formatMinutesToTime(timeMinutes)}
              </span>
            </div>
            <div className="relative h-2 bg-morandi-forest/10 rounded-full">
              <input
                type="range"
                min="0"
                max={totalMinutesInDay}
                step={step}
                value={timeMinutes}
                onChange={(e) => handleTimeChange(parseInt(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="absolute h-full bg-morandi-forest/20 rounded-full"
                style={{ width: `${(timeMinutes / totalMinutesInDay) * 100}%` }}
              />
              <div 
                className="absolute w-6 h-6 -top-2 rounded-full bg-morandi-forest border-4 border-white shadow-lg"
                style={{ left: `calc(${(timeMinutes / totalMinutesInDay) * 100}% - 12px)` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-morandi-forest/40">
              <span>00:00</span>
              <span>12:00</span>
              <span>24:00</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-3xl border-2 border-morandi-forest/20 text-morandi-forest text-sm font-bold hover:bg-morandi-forest/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 rounded-3xl bg-morandi-forest text-white text-sm font-bold shadow-xl hover:shadow-2xl transition-all"
          >
            Apply
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// 行程变更确认弹窗组件
const ChangesImpactModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  changes: Array<{
    date: string;
    before: { dayStart: string; items: ItineraryItem[] };
    after: { dayStart: string; items: ItineraryItem[] };
    summary?: string;
    fatigueScore?: number;
    itemRisks?: any[];
    suggestions?: string[];
  }>;
}> = ({ isOpen, onClose, onConfirm, changes }) => {
  if (!isOpen) return null;

  const renderTimeline = (label: string, dayStart: string, items: ItineraryItem[]) => (
    <div className="rounded-2xl bg-white/70 border border-white/60 p-4 space-y-2">
      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-morandi-forest/40 mb-1">{label}</div>
      <div className="text-xs text-morandi-forest/50 mb-2">Day Start · {dayStart}</div>
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="text-sm text-morandi-forest/40 italic">No activities</div>
        ) : (
          items.map(item => (
            <div key={item.id} className="rounded-xl bg-morandi-forest/5 p-3">
              <div className="text-xs font-black text-morandi-forest/60">
                {(item.startTime || item.time || '--')} — {item.endTime || ''}
              </div>
              <div className="text-sm font-semibold text-morandi-forest">{item.title}</div>
              {item.duration && (
                <div className="text-[11px] text-morandi-forest/50">Duration: {item.duration}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        className="glass-panel rounded-4xl p-8 border-white/60 shadow-2xl w-full max-w-6xl mx-4 space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-morandi-forest" />
            <h3 className="text-xl font-bold text-morandi-forest">AI Itinerary Review</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-morandi-forest/40 hover:text-morandi-forest transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {changes.length === 0 ? (
          <div className="rounded-3xl bg-morandi-sage/10 border border-morandi-sage/30 p-6 text-center text-morandi-forest/70">
            No changes detected in the schedule.
          </div>
        ) : (
          <div className="space-y-6">
            {changes.map(change => (
              <div key={change.date} className="space-y-4 rounded-4xl border border-white/60 bg-white/70 p-5 shadow-inner">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="text-sm font-black uppercase tracking-[0.3em] text-morandi-forest/60">
                    {new Date(change.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderTimeline('Original Schedule', change.before.dayStart, change.before.items)}
                  {renderTimeline('Modified Schedule', change.after.dayStart, change.after.items)}
                </div>
                <div className="rounded-3xl bg-morandi-forest/5 border border-morandi-forest/10 p-4 space-y-3">
                  {change.summary && (
                    <p className="text-sm text-morandi-forest/80">{change.summary}</p>
                  )}
                  {change.itemRisks && change.itemRisks.length > 0 && (
                    <div className="space-y-2">
                      {change.itemRisks.map((risk, idx) => (
                        <div key={`${risk.itemId}-${idx}`} className="text-[13px] text-morandi-forest/70">
                          <span className="font-semibold">{risk.title}</span> · {risk.reason}
                        </div>
                      ))}
                    </div>
                  )}
                  {change.suggestions && change.suggestions.length > 0 && (
                    <div className="text-xs text-morandi-forest/60 space-y-1">
                      {change.suggestions.map((tip, idx) => (
                        <div key={`${tip}-${idx}`}>• {tip}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-3xl border-2 border-morandi-forest/20 text-morandi-forest text-sm font-bold hover:bg-morandi-forest/5 transition-all"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 rounded-3xl bg-morandi-forest text-white text-sm font-bold shadow-xl hover:shadow-2xl transition-all"
          >
            Accept Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};


export default function ScheduleView({
  scheduleDays,
  magicCommand,
  magicFeedback,
  onMagicCommandChange,
  onApplyMagicCommand,
  onScheduleReorder,
  onCrossDayReorder,
  onScheduleDelete,
  onScheduleInsert,
  onUpdateDayStart,
  onUpdateItemTime,
  showConflicts,
  onBeginEdit,
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
  parseDurationMinutes,
  formatTimeForDisplay = (timeStr) => timeStr,
  parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 540; // 默认9:00
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  },
  formatMinutesToTime = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  },
  analyzeScheduleChanges,
  applyScheduleChanges,
  cancelScheduleChanges
}: ScheduleViewProps) {
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [timeEditModal, setTimeEditModal] = useState<{
    isOpen: boolean;
    date: string;
    itemId: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [dayStartEditModal, setDayStartEditModal] = useState<{
    isOpen: boolean;
    date: string;
    currentTime: string;
  } | null>(null);
  const [changesImpactModal, setChangesImpactModal] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<any[]>([]);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  
  // 进入编辑模式
  const handleEnterEditMode = () => {
    setIsEditingMode(true);
    onBeginEdit();
  };
  
  // 退出编辑模式
  const handleCancelEditMode = () => {
    setIsEditingMode(false);
    if (cancelScheduleChanges) {
      cancelScheduleChanges();
    }
  };
  
  // 保存编辑模式 - 先分析变更，再显示弹窗
  const handleSaveEditMode = async () => {
    if (analyzeScheduleChanges) {
      try {
        const changes = await analyzeScheduleChanges();
        if (!changes || changes.length === 0) {
          if (applyScheduleChanges) {
            await applyScheduleChanges({ changes: [] });
          }
          setIsEditingMode(false);
          return;
        }
        setPendingChanges(changes);
        setChangesImpactModal(true);
      } catch (error) {
        console.error("Failed to analyze schedule changes:", error);
        // 如果分析失败，直接应用变更
        if (applyScheduleChanges) {
          await applyScheduleChanges({ changes: [] });
          setIsEditingMode(false);
        }
      }
    } else {
      // 如果没有分析函数，直接应用变更
      if (applyScheduleChanges) {
        await applyScheduleChanges({ changes: [] });
        setIsEditingMode(false);
      }
    }
  };
  
  // 确认应用变更
  const handleConfirmChanges = async () => {
    if (applyScheduleChanges) {
      await applyScheduleChanges({ changes: pendingChanges });
    }
    setIsEditingMode(false);
    setChangesImpactModal(false);
    setPendingChanges([]);
  };
  
  // 打开时间编辑弹窗
  const handleOpenTimeEdit = (date: string, itemId: string, startTime: string, endTime: string) => {
    if (!isEditingMode) return; // 非编辑模式下不能编辑时间
    setTimeEditModal({
      isOpen: true,
      date,
      itemId,
      startTime,
      endTime: endTime || formatMinutesToTime(parseTimeToMinutes(startTime) + 60)
    });
  };
  
  // 保存时间修改
  const handleSaveTimeEdit = (startTime: string, endTime: string) => {
    if (timeEditModal && onUpdateItemTime) {
      onUpdateItemTime(timeEditModal.date, timeEditModal.itemId, startTime, endTime);
    }
    setTimeEditModal(null);
  };
  
  // 关闭时间编辑弹窗
  const handleCloseTimeEdit = () => {
    setTimeEditModal(null);
  };
  
  // 打开Day Start编辑弹窗
  const handleOpenDayStartEdit = (date: string, currentTime: string) => {
    if (!isEditingMode) return;
    setDayStartEditModal({
      isOpen: true,
      date,
      currentTime
    });
  };
  
  // 保存Day Start时间修改
  const handleSaveDayStartTime = (newTime: string) => {
    if (dayStartEditModal && onUpdateDayStart) {
      onUpdateDayStart(dayStartEditModal.date, newTime);
    }
    setDayStartEditModal(null);
  };
  
  // 关闭Day Start编辑弹窗
  const handleCloseDayStartEdit = () => {
    setDayStartEditModal(null);
  };
  
  // 处理跨天拖拽
  const handleDragStart = (e: React.DragEvent, item: ItineraryItem, date: string) => {
    if (!isEditingMode) return;
    e.dataTransfer.setData('text/plain', JSON.stringify({ item, fromDate: date }));
  };
  
  const handleDragOver = (e: React.DragEvent, date: string) => {
    if (!isEditingMode) return;
    e.preventDefault();
    setDragOverDay(date);
  };
  
  const handleDragLeave = () => {
    setDragOverDay(null);
  };
  
  const handleDrop = (e: React.DragEvent, toDate: string, index: number) => {
    if (!isEditingMode) return;
    e.preventDefault();
    setDragOverDay(null);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { item, fromDate } = data;
      
      if (fromDate !== toDate && onCrossDayReorder) {
        onCrossDayReorder(fromDate, toDate, item, index);
      }
    } catch (error) {
      console.error("Failed to parse drag data:", error);
    }
  };

  return (
    <>
      {/* 编辑模式浮动按钮 */}
      <div className="fixed top-6 right-6 z-40">
        {!isEditingMode ? (
          <button
            onClick={handleEnterEditMode}
            className="glass-panel rounded-full px-6 py-3 border-white/60 shadow-xl flex items-center gap-2 text-morandi-forest hover:shadow-2xl transition-all"
          >
            <Edit3 className="w-4 h-4" />
            <span className="text-sm font-bold">Edit</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelEditMode}
              className="glass-panel rounded-full p-3 border-white/60 shadow-xl text-red-400 hover:bg-red-50/30 hover:shadow-2xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={handleSaveEditMode}
              className="glass-panel rounded-full p-3 border-white/60 shadow-xl text-morandi-forest hover:bg-morandi-forest/10 hover:shadow-2xl transition-all"
            >
              <Check className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      
      <motion.div
        key="schedule-view"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
        className="space-y-10 md:space-y-14 pb-20"
      >
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-serif text-morandi-forest tracking-tight leading-tight">Schedule Snapshot.</h2>
          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-morandi-forest/40 italic">Manual Control, Automatic Flow</p>
        </div>

        <div className="glass-panel rounded-3xl p-5 md:p-6 border-white/60 shadow-md space-y-3">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-morandi-forest/40">Magic Command Bar</div>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={magicCommand}
              onChange={(e) => onMagicCommandChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onApplyMagicCommand();
              }}
              placeholder="For example: Extend the lunch break to 2 hours."
              className="flex-1 bg-white/70 border border-white/70 rounded-3xl px-4 py-3 text-sm text-morandi-forest outline-none focus:ring-4 ring-morandi-sunset/10 shadow-sm"
            />
            <button
              onClick={() => onApplyMagicCommand()}
              className="px-6 py-3 rounded-3xl bg-morandi-forest text-white text-xs font-black uppercase tracking-widest shadow-xl hover:shadow-2xl transition-all"
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
            <div 
              key={day.date} 
              className="space-y-6"
              onDragOver={(e) => isEditingMode && handleDragOver(e, day.date)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day.date, 0)}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 rounded-full bg-morandi-forest text-white text-[9px] font-black uppercase tracking-[0.25em] shadow-md">
                    Day {String(dayIdx + 1).padStart(2, '0')}
                  </div>
                  <div className="text-xs md:text-sm font-semibold text-morandi-forest">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-morandi-forest/60">
                  <span className="uppercase tracking-[0.2em] font-black">Day Start</span>
                  <button
                    onClick={() => handleOpenDayStartEdit(day.date, day.dayStart)}
                    className={`px-3 py-1 rounded-full border text-[11px] ${isEditingMode ? 'border-morandi-forest/30 hover:border-morandi-forest/50 cursor-pointer' : 'border-morandi-forest/10'} bg-white/80 font-black shadow-sm transition-all ${isEditingMode ? 'hover:bg-white/90' : ''}`}
                  >
                    {day.dayStart}
                  </button>
                  {isEditingMode && (
                    <div className="text-xs text-morandi-forest/40">
                      Click to edit
                    </div>
                  )}
                </div>
              </div>

              <div 
                className={`space-y-4 ${dragOverDay === day.date ? 'bg-morandi-forest/5 rounded-4xl p-4 transition-all' : ''}`}
              >
                <Reorder.Group axis="y" values={day.items} onReorder={(items) => isEditingMode && onScheduleReorder(day.date, items)} className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {day.items.map((item, idx) => {
                      const conflictActive = showConflicts && item.conflict;
                      return (
                      <Reorder.Item
                        key={item.id}
                        value={item}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-3"
                      >
                        <div className={`rounded-[28px] border p-4 md:p-5 bg-white/85 shadow transition-all ${conflictActive ? 'border-red-200 bg-red-50/70' : 'border-morandi-forest/5'} ${dragOverDay === day.date ? 'border-morandi-forest/30' : ''}`}>
                          <div className="flex items-start gap-3 md:gap-4">
                            {/* 拖拽图标 - 最左边 */}
                            {isEditingMode && (
                              <div
                                className="flex items-center pt-1 cursor-grab active:cursor-grabbing"
                                draggable={isEditingMode}
                                onDragStart={(e) => handleDragStart(e as any, item, day.date)}
                              >
                                <GripVertical className="w-4 h-4 text-morandi-forest/20" />
                              </div>
                            )}

                            {/* 时间区域 - 竖排显示，带连接线 */}
                            <button
                              onClick={() => handleOpenTimeEdit(day.date, item.id, item.startTime || item.time, item.endTime || '')}
                              className={`flex flex-col items-center min-w-[56px] relative transition-all ${isEditingMode ? 'hover:bg-morandi-forest/5 rounded-xl p-2 cursor-pointer' : ''}`}
                            >
                              <div className="text-base md:text-lg font-semibold text-morandi-forest leading-tight">
                                {formatTimeForDisplay(item.startTime || item.time)}
                              </div>
                              {/* 连接线 */}
                              <div className="w-px h-4 my-1 bg-morandi-forest/20"></div>
                              <div className="text-base md:text-lg font-semibold text-morandi-forest leading-tight">
                                {formatTimeForDisplay(item.endTime || '')}
                              </div>
                              {isEditingMode && (
                                <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-morandi-forest/20 rounded-full"></div>
                              )}
                            </button>

                            {/* 景点名称区域 */}
                            <div className="flex-1 min-w-0 ml-2 md:ml-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
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
                                      className="w-full bg-white/85 border border-white/70 rounded-2xl px-4 py-3 text-base md:text-lg font-semibold text-morandi-forest outline-none shadow-inner"
                                      autoFocus
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={!isEditingMode}
                                      onClick={() => {
                                        if (isEditingMode) {
                                          onStartEditTitle(item.id, item.title);
                                        }
                                      }}
                                      className={`text-left text-lg md:text-xl font-semibold text-morandi-forest w-full break-words ${
                                        isEditingMode ? 'cursor-text hover:text-morandi-forest/80' : 'cursor-default text-morandi-forest/80'
                                      }`}
                                    >
                                      {item.title}
                                    </button>
                                  )}
                                </div>

                                {/* 操作按钮 */}
                                {isEditingMode && (
                                  <div className="flex flex-col items-end gap-2">
                                    <button
                                      onClick={() => onScheduleDelete(day.date, item.id)}
                                      className="p-2 rounded-full text-morandi-forest/30 hover:text-red-400 transition-all"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => onScheduleInsert(day.date, idx)}
                                      className="p-2 rounded-full text-morandi-forest/30 hover:text-morandi-forest transition-all"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 时长编辑区域 */}
                          {editingDurationId === item.id && (
                            <div className="mt-4 flex flex-col md:flex-row items-start md:items-center gap-3 bg-morandi-forest/5 p-4 rounded-3xl border border-white/60">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    const next = Math.max(15, (parseInt(durationDraft, 10) || 60) - 15);
                                    onSetDurationDraft(String(next));
                                  }}
                                  className="px-3 py-1 rounded-full border border-morandi-forest/10 text-xs font-black uppercase tracking-widest bg-white shadow-sm"
                                >
                                  -15m
                                </button>
                                <input
                                  value={durationDraft}
                                  onChange={(e) => onSetDurationDraft(e.target.value.replace(/[^\d]/g, ''))}
                                  className="w-20 text-center bg-white border border-white/70 rounded-full py-1 text-sm font-bold text-morandi-forest shadow-inner"
                                />
                                <button
                                  onClick={() => {
                                    const next = Math.min(600, (parseInt(durationDraft, 10) || 60) + 15);
                                    onSetDurationDraft(String(next));
                                  }}
                                  className="px-3 py-1 rounded-full border border-morandi-forest/10 text-xs font-black uppercase tracking-widest bg-white shadow-sm"
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
                                className="px-4 py-2 rounded-full bg-morandi-forest text-white text-xs font-black uppercase tracking-widest shadow-xl hover:shadow-2xl"
                              >
                                Update Duration
                              </button>
                            </div>
                          )}
                        </div>
                      </Reorder.Item>
                      );
                    })}
                  </AnimatePresence>
                </Reorder.Group>
                
                {isEditingMode && dragOverDay === day.date && (
                  <div className="text-center py-4 text-morandi-forest/40 text-sm">
                    Drop here to move activity to this day
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
      
      {/* 时间编辑弹窗 */}
      {timeEditModal && (
        <TimeEditModal
          isOpen={timeEditModal.isOpen}
          onClose={handleCloseTimeEdit}
          onSave={handleSaveTimeEdit}
          initialStartTime={timeEditModal.startTime}
          initialEndTime={timeEditModal.endTime}
          formatTimeForDisplay={formatTimeForDisplay}
          parseTimeToMinutes={parseTimeToMinutes}
          formatMinutesToTime={formatMinutesToTime}
          title="Edit Activity Time"
        />
      )}
      
      {/* Day Start 时间编辑弹窗 */}
      {dayStartEditModal && (
        <DayStartEditModal
          isOpen={dayStartEditModal.isOpen}
          onClose={handleCloseDayStartEdit}
          onSave={handleSaveDayStartTime}
          initialTime={dayStartEditModal.currentTime}
          formatTimeForDisplay={formatTimeForDisplay}
          parseTimeToMinutes={parseTimeToMinutes}
          formatMinutesToTime={formatMinutesToTime}
        />
      )}
      
      {/* 变更影响弹窗 */}
      <ChangesImpactModal
        isOpen={changesImpactModal}
        onClose={() => setChangesImpactModal(false)}
        onConfirm={handleConfirmChanges}
        changes={pendingChanges}
      />
    </>
  );
}
