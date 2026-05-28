import React, { useState } from 'react';
import { IssueTransaction } from '../types';
import { ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScheduleCalendarProps {
  transactions: IssueTransaction[];
}

export function ScheduleCalendar({ transactions }: ScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Active dates mapping
  // We want to highlight returning due dates and overdue dates.
  const getDayStatus = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Check if any transaction is due on this date
    const dueTx = transactions.find(t => t.dueDate === dateStr && t.status !== 'returned');
    if (!dueTx) return null;

    const isOverdue = dueTx.status === 'overdue' || new Date(dateStr) < new Date(new Date().setHours(0, 0, 0, 0));
    return isOverdue ? 'overdue' : 'due';
  };

  const getDayTransactions = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return transactions.filter(t => t.dueDate === dateStr && t.status !== 'returned');
  };

  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const status = getDayStatus(d);
    
    let baseClass = "h-8 w-8 font-mono text-[11px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-200";
    if (status === 'overdue') {
      baseClass += " bg-rose-100 text-rose-700 font-bold border border-rose-300 shadow-sm hover:ring-2 hover:ring-rose-400";
    } else if (status === 'due') {
      baseClass += " bg-amber-100 text-amber-700 font-bold border border-amber-300 shadow-sm hover:ring-2 hover:ring-amber-400";
    } else {
      baseClass += " text-stone-600 hover:bg-stone-100 font-medium";
    }

    if (selectedDay === d) {
       if (status === 'overdue') baseClass += " ring-2 ring-rose-500 scale-110";
       else if (status === 'due') baseClass += " ring-2 ring-amber-500 scale-110";
       else baseClass += " ring-2 ring-stone-400 scale-110";
    }

    days.push(
      <div 
        key={`day-${d}`} 
        className={baseClass}
        onClick={() => setSelectedDay(d)}
      >
        {d}
      </div>
    );
  }

  return (
    <motion.div 
      layout
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="bg-white border text-stone-850 border-stone-200 p-5 rounded-2xl shadow-sm w-full flex flex-col overflow-hidden"
    >
      <motion.div layout className="flex justify-between items-center mb-4 border-b border-stone-150 pb-3 shrink-0">
         <h3 className="text-xs font-bold font-mono tracking-widest text-[#926f1a] uppercase flex items-center gap-1.5">
           Calendar Schedules
         </h3>
         <div className="flex items-center gap-3">
           <button onClick={prevMonth} className="text-stone-400 hover:text-amber-600 p-1 rounded-md hover:bg-amber-50 transition-colors cursor-pointer">
             <ChevronLeft className="w-4 h-4" />
           </button>
           <span className="text-[11px] font-mono font-bold uppercase w-24 text-center">
             {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
           </span>
           <button onClick={nextMonth} className="text-stone-400 hover:text-amber-600 p-1 rounded-md hover:bg-amber-50 transition-colors cursor-pointer">
             <ChevronRight className="w-4 h-4" />
           </button>
         </div>
      </motion.div>

      <motion.div layout className="grid grid-cols-7 gap-1 place-items-center mb-2 px-1 shrink-0">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-[9px] font-mono text-stone-400 font-bold uppercase w-8 text-center">{day}</div>
        ))}
      </motion.div>
      <motion.div layout className="grid grid-cols-7 gap-y-2 gap-x-1 place-items-center px-1 shrink-0">
        {days}
      </motion.div>

      {/* Legend / Status Info */}
      <motion.div layout className="mt-5 border-t border-stone-100 pt-4 flex-1 flex flex-col">
        <AnimatePresence mode="popLayout" initial={false}>
          {selectedDay ? (
            <motion.div
              layout
              key="details"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full"
            >
            <div className="flex items-center justify-between font-mono mb-2 shrink-0">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                {selectedDay} {monthNames[currentDate.getMonth()]} Details
              </span>
              <button 
                onClick={() => setSelectedDay(null)}
                className="text-[9px] text-stone-400 hover:text-stone-600 cursor-pointer underline"
              >
                Clear
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1">
              {getDayTransactions(selectedDay).length > 0 ? (
                 <div className="space-y-2">
                   {getDayTransactions(selectedDay).map((tx, idx) => {
                     const isOverdue = tx.status === 'overdue' || new Date(tx.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
                     return (
                       <div key={idx} className={`p-2 rounded-lg text-xs font-mono border flex flex-col gap-1 ${isOverdue ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold font-sans line-clamp-1">{tx.bookTitle}</span>
                            {isOverdue ? <CircleAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" /> : <CircleCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                          </div>
                          <span className="text-[9px] opacity-80 mt-0.5 font-semibold">
                            {isOverdue ? "OVERDUE - Fine accumulating" : "Return Due on this date"}
                          </span>
                       </div>
                     );
                   })}
                 </div>
              ) : (
                 <div className="text-[10px] font-mono text-stone-400 flex items-center gap-1.5 justify-center py-4 bg-stone-50 rounded-lg border border-stone-100">
                   <Info className="w-3 h-3" /> No schedules for this day
                 </div>
              )}
            </div>
            </motion.div>
          ) : (
            <motion.div 
              layout
              key="legend"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col justify-center h-full gap-3 text-[10px] font-mono text-stone-500 py-2"
            >
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-100 border border-amber-300 shrink-0" />
                <span>Upcoming Due Date</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-100 border border-rose-300 shrink-0" />
                <span>Overdue Fine Active</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </motion.div>
  );
}
