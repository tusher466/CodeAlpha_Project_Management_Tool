import React, { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { PriorityBadge } from '../common/Badge';

export default function CalendarView({ tasks = [], onSelectTask }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Calendar Header */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-bold text-slate-900">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 border-b border-slate-100 text-center py-2.5 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 min-h-[600px]">
          {days.map(day => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isTodayDay = isSameDay(day, new Date());

            // Find tasks due on this day
            const dayTasks = tasks.filter(t => {
              if (!t.due_date) return false;
              try {
                return isSameDay(parseISO(t.due_date), day);
              } catch (e) {
                return false;
              }
            });

            return (
              <div
                key={day.toISOString()}
                className={`p-2 min-h-[110px] flex flex-col transition-colors ${
                  !isCurrentMonth ? 'bg-slate-50/40 text-slate-400' : 'bg-white'
                } ${isTodayDay ? 'bg-brand-50/20' : ''}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isTodayDay 
                        ? 'bg-brand-600 text-white font-bold' 
                        : isCurrentMonth ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-400">
                      {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                    </span>
                  )}
                </div>

                <div className="space-y-1 overflow-y-auto max-h-24 pr-0.5">
                  {dayTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => onSelectTask(task.id)}
                      className="p-1.5 bg-slate-50 hover:bg-brand-50 border border-slate-200/80 hover:border-brand-300 rounded-lg cursor-pointer transition-all shadow-xs group"
                    >
                      <p className="text-[11px] font-semibold text-slate-800 group-hover:text-brand-700 truncate leading-tight">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            task.priority === 'urgent' ? 'bg-rose-500' :
                            task.priority === 'high' ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                        />
                        <span className="text-[9px] text-slate-400 capitalize">{task.priority}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
