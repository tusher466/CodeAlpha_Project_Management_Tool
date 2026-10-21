import React from 'react';
import { PriorityBadge, LabelTag } from '../common/Badge';
import Avatar from '../common/Avatar';
import { Calendar, CheckCircle2, MoreVertical, Plus } from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';

export default function ListView({
  tasks = [],
  columns = [],
  onSelectTask,
  onOpenCreateTask,
  onMoveTask,
  searchQuery = '',
  filterPreset = 'all',
  currentUserId = null
}) {
  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = task.title.toLowerCase().includes(q);
      const matchesLabel = task.labels?.some(l => l.name.toLowerCase().includes(q));
      const matchesAssignee = task.assignees?.some(a => a.name.toLowerCase().includes(q));
      if (!matchesTitle && !matchesLabel && !matchesAssignee) return false;
    }

    if (filterPreset === 'assigned_me' && currentUserId) {
      return task.assignees?.some(a => a.id === currentUserId);
    }
    if (filterPreset === 'high_priority') {
      return task.priority === 'high' || task.priority === 'urgent';
    }
    return true;
  });

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      
      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Table Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Task List</h3>
            <p className="text-xs text-slate-500">{filteredTasks.length} tasks in current view</p>
          </div>
          <button
            onClick={() => onOpenCreateTask()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Task Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Assignees</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Labels</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No tasks match the filter criteria
                  </td>
                </tr>
              ) : (
                filteredTasks.map(task => {
                  const column = columns.find(c => c.id === task.column_id);
                  let formattedDate = '—';
                  let isOverdue = false;
                  if (task.due_date) {
                    try {
                      const d = parseISO(task.due_date);
                      formattedDate = isToday(d) ? 'Today' : format(d, 'MMM d, yyyy');
                      isOverdue = isPast(d) && !isToday(d);
                    } catch (e) {}
                  }

                  return (
                    <tr
                      key={task.id}
                      onClick={() => onSelectTask(task.id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Title */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-brand-700 max-w-xs truncate">
                        {task.title}
                      </td>

                      {/* Status Column Selector */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={task.column_id}
                          onChange={(e) => onMoveTask({
                            taskId: task.id,
                            sourceColumnId: task.column_id,
                            targetColumnId: e.target.value,
                            sourceIndex: 0,
                            targetIndex: 0
                          })}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-brand-500 cursor-pointer"
                        >
                          {columns.map(col => (
                            <option key={col.id} value={col.id}>
                              {col.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        <PriorityBadge priority={task.priority} size="xs" />
                      </td>

                      {/* Assignees */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center -space-x-1.5">
                          {task.assignees?.map(a => (
                            <Avatar
                              key={a.id}
                              name={a.name}
                              color={a.avatar_color}
                              size="xs"
                              showTooltip={true}
                              className="ring-1.5 ring-white"
                            />
                          ))}
                          {(!task.assignees || task.assignees.length === 0) && (
                            <span className="text-slate-400 text-[11px]">Unassigned</span>
                          )}
                        </div>
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[11px] font-medium ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                          {formattedDate}
                        </span>
                      </td>

                      {/* Labels */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {task.labels?.map(l => (
                            <LabelTag key={l.id || l.name} name={l.name} color={l.color} size="xs" />
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
