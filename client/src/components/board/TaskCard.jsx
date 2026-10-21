import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { PriorityBadge, LabelTag } from '../common/Badge';
import Avatar from '../common/Avatar';
import { MessageSquare, CheckSquare, Calendar, AlertTriangle } from 'lucide-react';
import { format, isPast, isToday, parseISO } from 'date-fns';

export default function TaskCard({ task, index, onClick }) {
  const completedChecklist = task.checklists?.filter(c => c.completed).length || 0;
  const totalChecklist = task.checklists?.length || 0;

  // Due date analysis
  let formattedDueDate = null;
  let isOverdue = false;
  if (task.due_date) {
    try {
      const d = parseISO(task.due_date);
      if (isToday(d)) {
        formattedDueDate = 'Today';
      } else {
        formattedDueDate = format(d, 'MMM d');
      }
      isOverdue = isPast(d) && !isToday(d);
    } catch (e) {
      formattedDueDate = task.due_date;
    }
  }

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(task.id)}
          className={`
            bg-white rounded-2xl p-3.5 mb-2.5 border border-slate-200/80 shadow-xs 
            hover:shadow-md hover:border-brand-300 transition-all duration-150 cursor-pointer select-none group
            ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-brand-500 rotate-1 scale-[1.02] bg-white' : ''}
          `}
        >
          {/* Tags & Priority */}
          <div className="flex items-center justify-between gap-1 mb-2">
            <div className="flex flex-wrap items-center gap-1">
              {task.labels && task.labels.slice(0, 2).map(l => (
                <LabelTag key={l.id || l.name} name={l.name} color={l.color} size="xs" />
              ))}
              {task.labels && task.labels.length > 2 && (
                <span className="text-[10px] text-slate-400 font-semibold">
                  +{task.labels.length - 2}
                </span>
              )}
            </div>
            <PriorityBadge priority={task.priority} size="xs" />
          </div>

          {/* Title */}
          <h4 className="text-xs font-semibold text-slate-900 group-hover:text-brand-700 transition-colors line-clamp-2 leading-snug mb-2">
            {task.title}
          </h4>

          {/* Checklist Progress Bar (if checklists exist) */}
          {totalChecklist > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span className="flex items-center gap-1">
                  <CheckSquare className="w-3 h-3 text-slate-400" />
                  <span>Subtasks</span>
                </span>
                <span className="font-semibold text-slate-600">
                  {completedChecklist}/{totalChecklist}
                </span>
              </div>
              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    completedChecklist === totalChecklist ? 'bg-emerald-500' : 'bg-brand-500'
                  }`}
                  style={{ width: `${(completedChecklist / totalChecklist) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Card Footer: Due Date, Comments Count, Assignees */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-slate-400 text-[11px]">
            
            <div className="flex items-center gap-2.5">
              {/* Due Date */}
              {formattedDueDate && (
                <span className={`flex items-center gap-1 font-medium ${
                  isOverdue ? 'text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md' : 'text-slate-500'
                }`}>
                  {isOverdue ? <AlertTriangle className="w-3 h-3 text-rose-500" /> : <Calendar className="w-3 h-3" />}
                  <span>{formattedDueDate}</span>
                </span>
              )}

              {/* Comments Count */}
              {task.comments_count > 0 && (
                <span className="flex items-center gap-1 text-slate-500 font-medium">
                  <MessageSquare className="w-3 h-3 text-slate-400" />
                  <span>{task.comments_count}</span>
                </span>
              )}
            </div>

            {/* Assignees */}
            <div className="flex items-center -space-x-1.5 shrink-0">
              {task.assignees && task.assignees.length > 0 ? (
                task.assignees.slice(0, 3).map(a => (
                  <Avatar
                    key={a.id}
                    name={a.name}
                    color={a.avatar_color}
                    size="xs"
                    showTooltip={true}
                    className="ring-1.5 ring-white"
                  />
                ))
              ) : null}
              {task.assignees && task.assignees.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold flex items-center justify-center ring-1.5 ring-white">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </Draggable>
  );
}
