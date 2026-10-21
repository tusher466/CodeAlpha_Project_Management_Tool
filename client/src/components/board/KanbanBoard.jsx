import React, { useState } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import { Plus, MoreHorizontal, Edit2, Trash2, Check, X } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function KanbanBoard({
  columns = [],
  tasks = [],
  onMoveTask,
  onOpenCreateTask,
  onSelectTask,
  onCreateColumn,
  onUpdateColumn,
  onDeleteColumn,
  filterPreset = 'all',
  currentUserId = null,
  searchQuery = ''
}) {
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [editingColumnName, setEditingColumnName] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  // Handle Drag & Drop
  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const targetColumn = columns.find(c => c.id === destination.droppableId);
    
    // Check if moving to a "Done" / "Completed" column to fire confetti celebration!
    if (targetColumn && (targetColumn.name.toLowerCase().includes('done') || targetColumn.name.toLowerCase().includes('complet'))) {
      if (source.droppableId !== destination.droppableId) {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }

    onMoveTask({
      taskId: draggableId,
      sourceColumnId: source.droppableId,
      targetColumnId: destination.droppableId,
      sourceIndex: source.index,
      targetIndex: destination.index
    });
  };

  // Filter tasks based on searchQuery and filterPreset
  const filteredTasks = tasks.filter(task => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = task.title.toLowerCase().includes(q);
      const matchesDesc = task.description?.toLowerCase().includes(q);
      const matchesLabel = task.labels?.some(l => l.name.toLowerCase().includes(q));
      const matchesAssignee = task.assignees?.some(a => a.name.toLowerCase().includes(q));
      if (!matchesTitle && !matchesDesc && !matchesLabel && !matchesAssignee) {
        return false;
      }
    }

    // 2. Filter Presets
    if (filterPreset === 'assigned_me' && currentUserId) {
      return task.assignees?.some(a => a.id === currentUserId);
    }
    if (filterPreset === 'high_priority') {
      return task.priority === 'high' || task.priority === 'urgent';
    }
    if (filterPreset === 'due_soon' && task.due_date) {
      const due = new Date(task.due_date);
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return due >= now && due <= weekFromNow;
    }

    return true;
  });

  const handleCreateColumnSubmit = (e) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    onCreateColumn(newColumnName.trim());
    setNewColumnName('');
    setIsAddingColumn(false);
  };

  const handleUpdateColumnSubmit = (columnId) => {
    if (!editingColumnName.trim()) return;
    onUpdateColumn(columnId, editingColumnName.trim());
    setEditingColumnId(null);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex-1 flex gap-4 overflow-x-auto p-4 sm:p-6 items-start min-h-[calc(100vh-4rem)]">
        
        {columns.map(column => {
          const colTasks = filteredTasks
            .filter(t => t.column_id === column.id)
            .sort((a, b) => a.position - b.position);

          const isEditing = editingColumnId === column.id;

          return (
            <div
              key={column.id}
              className="w-72 sm:w-80 shrink-0 bg-slate-100/80 rounded-2xl p-3 flex flex-col max-h-[calc(100vh-6.5rem)] border border-slate-200/60 shadow-xs"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-2 py-1.5 mb-2 group">
                <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: column.color || '#94a3b8' }}
                  />

                  {isEditing ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        autoFocus
                        value={editingColumnName}
                        onChange={(e) => setEditingColumnName(e.target.value)}
                        className="text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-brand-400 focus:outline-none w-full"
                      />
                      <button
                        onClick={() => handleUpdateColumnSubmit(column.id)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingColumnId(null)}
                        className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <h3
                      onDoubleClick={() => {
                        setEditingColumnId(column.id);
                        setEditingColumnName(column.name);
                      }}
                      className="text-xs font-bold text-slate-800 truncate cursor-pointer hover:text-brand-700"
                      title="Double-click to rename"
                    >
                      {column.name}
                    </h3>
                  )}

                  <span className="text-[11px] font-semibold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200/60 shrink-0">
                    {colTasks.length}
                  </span>
                </div>

                {/* Column Action Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenCreateTask(column.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
                    title="Add task to column"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <div className="relative group/menu">
                    <button
                      onClick={() => {
                        if (confirm(`Delete column "${column.name}"? Tasks must be empty.`)) {
                          onDeleteColumn(column.id);
                        }
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete column"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Droppable Task List */}
              <Droppable droppableId={column.id} type="TASK">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 overflow-y-auto pr-1 min-h-[120px] rounded-xl transition-colors ${
                      snapshot.isDraggingOver ? 'bg-brand-50/60 ring-2 ring-brand-400/30' : ''
                    }`}
                  >
                    {colTasks.map((task, index) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        index={index}
                        onClick={onSelectTask}
                      />
                    ))}
                    {provided.placeholder}

                    {colTasks.length === 0 && !snapshot.isDraggingOver && (
                      <div
                        onClick={() => onOpenCreateTask(column.id)}
                        className="h-24 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-brand-400 hover:text-brand-600 transition-colors cursor-pointer text-xs"
                      >
                        <Plus className="w-4 h-4 mb-1" />
                        <span>Add a task</span>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>

              {/* Quick Add Card at bottom */}
              <button
                onClick={() => onOpenCreateTask(column.id)}
                className="mt-2 py-1.5 px-3 rounded-xl border border-dashed border-slate-200 text-xs font-semibold text-slate-500 hover:border-brand-400 hover:text-brand-700 hover:bg-white transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>

            </div>
          );
        })}

        {/* Add New Column Section */}
        <div className="w-72 shrink-0">
          {isAddingColumn ? (
            <form
              onSubmit={handleCreateColumnSubmit}
              className="bg-white p-3 rounded-2xl border border-slate-200 shadow-md space-y-2 animate-in fade-in"
            >
              <input
                type="text"
                autoFocus
                placeholder="Column title (e.g. QA Testing)"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-1.5 px-3 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-700 transition-colors"
                >
                  Add Column
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingColumn(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingColumn(true)}
              className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-slate-300 hover:border-brand-400 text-slate-500 hover:text-brand-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:bg-white shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Column</span>
            </button>
          )}
        </div>

      </div>
    </DragDropContext>
  );
}
