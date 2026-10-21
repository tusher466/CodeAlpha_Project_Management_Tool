import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import { PriorityBadge, LabelTag } from '../common/Badge';
import { 
  X, 
  Trash2, 
  Calendar, 
  CheckSquare, 
  Plus, 
  MessageSquare, 
  Send, 
  Tag, 
  Users, 
  AlertCircle, 
  Clock, 
  Check, 
  AtSign,
  ChevronDown
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import confetti from 'canvas-confetti';

export default function TaskDetailModal({
  taskId,
  onClose,
  columns = [],
  projectMembers = [],
  onTaskUpdated,
  onTaskDeleted
}) {
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [columnId, setColumnId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [labels, setLabels] = useState([]);

  // Subtask input
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Comment input & typing indicator
  const [newComment, setNewComment] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const typingTimeoutRef = useRef(null);

  // Label creator state
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6366f1');

  // Mention dropdown helper
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const commentInputRef = useRef(null);

  // Load task and comments
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [taskRes, commentsRes] = await Promise.all([
          api.getTask(taskId),
          api.getComments(taskId)
        ]);

        if (isMounted) {
          const t = taskRes.task;
          setTask(t);
          setTitle(t.title);
          setDescription(t.description || '');
          setPriority(t.priority);
          setColumnId(t.column_id);
          setDueDate(t.due_date || '');
          setAssigneeIds(t.assignees?.map(a => a.id) || []);
          setLabels(t.labels || []);
          setComments(commentsRes.comments || []);
        }
      } catch (err) {
        console.error('Failed to load task details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    // Join Socket room for task
    socketService.joinTask(taskId);

    // Listen to real-time comments and updates
    const unsubComment = socketService.on('comment_created', (comment) => {
      if (comment.task_id === taskId) {
        setComments(prev => [...prev, comment]);
      }
    });

    const unsubCommentDeleted = socketService.on('comment_deleted', ({ commentId }) => {
      setComments(prev => prev.filter(c => c.id !== commentId));
    });

    const unsubTaskUpdate = socketService.on('task_updated', (updatedTask) => {
      if (updatedTask.id === taskId) {
        setTask(updatedTask);
        setTitle(updatedTask.title);
        setDescription(updatedTask.description || '');
        setPriority(updatedTask.priority);
        setColumnId(updatedTask.column_id);
        setDueDate(updatedTask.due_date || '');
        setAssigneeIds(updatedTask.assignees?.map(a => a.id) || []);
        setLabels(updatedTask.labels || []);
      }
    });

    const unsubTyping = socketService.on('user_typing_comment', ({ user: typingUser, isTyping }) => {
      if (!typingUser || typingUser.id === user?.id) return;
      setTypingUsers(prev => {
        const next = new Set(prev);
        if (isTyping) next.add(typingUser.name);
        else next.delete(typingUser.name);
        return next;
      });
    });

    return () => {
      isMounted = false;
      socketService.leaveTask(taskId);
      unsubComment();
      unsubCommentDeleted();
      unsubTaskUpdate();
      unsubTyping();
    };
  }, [taskId, user?.id]);

  // Handle typing indicator in comments
  const handleCommentChange = (e) => {
    const text = e.target.value;
    setNewComment(text);

    // Check if ends with '@' for mention helper
    if (text.endsWith('@')) {
      setShowMentionSuggestions(true);
    } else if (!text.includes('@')) {
      setShowMentionSuggestions(false);
    }

    // Emit typing event
    socketService.emitTyping(taskId, user, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketService.emitTyping(taskId, user, false);
    }, 1500);
  };

  const handleInsertMention = (member) => {
    const firstName = member.name.split(' ')[0];
    setNewComment(prev => {
      const lastAtIndex = prev.lastIndexOf('@');
      if (lastAtIndex !== -1) {
        return prev.substring(0, lastAtIndex) + `@${firstName} `;
      }
      return prev + `@${firstName} `;
    });
    setShowMentionSuggestions(false);
    if (commentInputRef.current) commentInputRef.current.focus();
  };

  // Save changes to backend
  const saveTaskUpdates = async (updates) => {
    try {
      const res = await api.updateTask(taskId, updates);
      setTask(res.task);
      if (onTaskUpdated) onTaskUpdated(res.task);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  // Toggle Assignee
  const handleToggleAssignee = (userId) => {
    const nextAssignees = assigneeIds.includes(userId)
      ? assigneeIds.filter(id => id !== userId)
      : [...assigneeIds, userId];

    setAssigneeIds(nextAssignees);
    saveTaskUpdates({ assigneeIds: nextAssignees });
  };

  // Checklist Actions
  const handleAddChecklist = async (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    try {
      const res = await api.addChecklistItem(taskId, newSubtaskTitle.trim());
      setTask(res.task);
      setNewSubtaskTitle('');
      if (onTaskUpdated) onTaskUpdated(res.task);
    } catch (err) {
      console.error('Failed to add checklist item:', err);
    }
  };

  const handleToggleChecklist = async (item) => {
    try {
      const newCompleted = item.completed ? 0 : 1;
      const res = await api.updateChecklistItem(taskId, item.id, { completed: newCompleted });
      setTask(res.task);
      if (onTaskUpdated) onTaskUpdated(res.task);

      // If all subtasks completed, shoot celebratory confetti!
      const allDone = res.task.checklists?.every(c => c.completed);
      if (allDone && res.task.checklists.length > 0) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.5 }
        });
      }
    } catch (err) {
      console.error('Failed to toggle checklist:', err);
    }
  };

  const handleDeleteChecklist = async (itemId) => {
    try {
      const res = await api.deleteChecklistItem(taskId, itemId);
      setTask(res.task);
      if (onTaskUpdated) onTaskUpdated(res.task);
    } catch (err) {
      console.error('Failed to delete checklist item:', err);
    }
  };

  // Add Label
  const handleAddLabel = () => {
    if (!newLabelName.trim()) return;
    const nextLabels = [...labels, { name: newLabelName.trim(), color: newLabelColor }];
    setLabels(nextLabels);
    saveTaskUpdates({ labels: nextLabels });
    setNewLabelName('');
    setIsAddingLabel(false);
  };

  // Remove Label
  const handleRemoveLabel = (labelName) => {
    const nextLabels = labels.filter(l => l.name !== labelName);
    setLabels(nextLabels);
    saveTaskUpdates({ labels: nextLabels });
  };

  // Submit Comment
  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      socketService.emitTyping(taskId, user, false);
      const res = await api.createComment(taskId, newComment.trim());
      setNewComment('');
      setShowMentionSuggestions(false);
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  // Delete Comment
  const handleDeleteComment = async (commentId) => {
    try {
      await api.deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  // Delete Task
  const handleDeleteTask = async () => {
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      try {
        await api.deleteTask(taskId);
        if (onTaskDeleted) onTaskDeleted(taskId);
        onClose();
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
    }
  };

  const colorsPalette = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];

  if (loading || !task) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs">
        <div className="bg-white p-6 rounded-2xl shadow-xl flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-600">Loading task...</span>
        </div>
      </div>
    );
  }

  const completedCount = task.checklists?.filter(c => c.completed).length || 0;
  const totalChecklists = task.checklists?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl h-[92vh] rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Status:</span>
            <select
              value={columnId}
              onChange={(e) => {
                setColumnId(e.target.value);
                api.moveTask(taskId, { targetColumnId: e.target.value, newPosition: 0 }).then(res => {
                  if (onTaskUpdated) onTaskUpdated(res.task);
                });
              }}
              className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-2.5 py-1 focus:outline-none focus:border-brand-500 shadow-xs"
            >
              {columns.map(col => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteTask}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body (2 Columns on Desktop) */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
          
          {/* Left / Main Section: Title, Description, Checklists, Comments */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            
            {/* Title */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  if (title.trim() && title !== task.title) {
                    saveTaskUpdates({ title: title.trim() });
                  }
                }}
                className="w-full text-lg sm:text-xl font-bold text-slate-900 border-none hover:bg-slate-50 focus:bg-slate-50 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="Task title..."
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => {
                  if (description !== (task.description || '')) {
                    saveTaskUpdates({ description });
                  }
                }}
                placeholder="Add more details, requirements, or acceptance criteria..."
                className="w-full text-xs text-slate-700 p-3 border border-slate-200 rounded-2xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 leading-relaxed bg-slate-50/30"
              />
            </div>

            {/* Subtasks / Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-brand-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Checklist & Subtasks
                  </span>
                </div>
                {totalChecklists > 0 && (
                  <span className="text-xs font-bold text-slate-500">
                    {completedCount}/{totalChecklists} ({Math.round((completedCount / totalChecklists) * 100)}%)
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {totalChecklists > 0 && (
                <div className="w-full h-1.5 bg-slate-100 rounded-full mb-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      completedCount === totalChecklists ? 'bg-emerald-500' : 'bg-brand-500'
                    }`}
                    style={{ width: `${(completedCount / totalChecklists) * 100}%` }}
                  />
                </div>
              )}

              {/* Checklist items list */}
              <div className="space-y-1.5 mb-2.5">
                {task.checklists?.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <label className="flex items-center gap-2.5 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(item.completed)}
                        onChange={() => handleToggleChecklist(item)}
                        className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                      />
                      <span className={`text-xs ${item.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}`}>
                        {item.title}
                      </span>
                    </label>
                    <button
                      onClick={() => handleDeleteChecklist(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add checklist input */}
              <form onSubmit={handleAddChecklist} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a subtask..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500"
                />
                <button
                  type="submit"
                  disabled={!newSubtaskTitle.trim()}
                  className="px-3 py-2 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
                >
                  Add
                </button>
              </form>
            </div>

            {/* Comments Thread & Communication */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-brand-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Comments & Activity ({comments.length})
                  </span>
                </div>
                
                {/* Live typing indicator */}
                {typingUsers.size > 0 && (
                  <span className="text-[11px] text-brand-600 font-medium italic animate-pulse">
                    {Array.from(typingUsers).join(', ')} is typing...
                  </span>
                )}
              </div>

              {/* Comments list */}
              <div className="space-y-3 mb-4">
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No comments yet. Start the conversation with your team! Mention with @name.
                  </p>
                ) : (
                  comments.map(c => {
                    let timeAgo = 'just now';
                    try {
                      timeAgo = formatDistanceToNow(parseISO(c.created_at), { addSuffix: true });
                    } catch (e) {}

                    return (
                      <div key={c.id} className="flex items-start gap-3 group">
                        <Avatar name={c.user_name} color={c.avatar_color} size="sm" />
                        <div className="flex-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{c.user_name}</span>
                              {c.user_role && (
                                <span className="text-[10px] text-slate-400">({c.user_role})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400">{timeAgo}</span>
                              {c.user_id === user?.id && (
                                <button
                                  onClick={() => handleDeleteComment(c.id)}
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity"
                                  title="Delete comment"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {c.content}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Mention Chips Helper */}
              {projectMembers.length > 0 && (
                <div className="flex items-center gap-1.5 mb-2 overflow-x-auto py-1">
                  <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5 shrink-0">
                    <AtSign className="w-3 h-3" /> Mention:
                  </span>
                  {projectMembers.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleInsertMention(m)}
                      className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 text-[10px] font-semibold transition-colors shrink-0"
                    >
                      @{m.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              )}

              {/* Comment Input Box */}
              <form onSubmit={handlePostComment} className="relative">
                <textarea
                  ref={commentInputRef}
                  rows={2}
                  value={newComment}
                  onChange={handleCommentChange}
                  placeholder="Write a comment... (Type @ to mention team members)"
                  className="w-full text-xs p-3 pr-12 border border-slate-200 rounded-2xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="absolute right-2.5 bottom-3.5 p-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-30"
                  title="Send Comment"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

            </div>

          </div>

          {/* Right Sidebar Section: Priority, Due Date, Assignees, Labels */}
          <div className="w-full md:w-72 p-6 space-y-6 bg-slate-50/40 shrink-0">
            
            {/* Priority Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  saveTaskUpdates({ priority: e.target.value });
                }}
                className="w-full text-xs font-semibold p-2.5 border border-slate-200 bg-white rounded-xl focus:outline-none focus:border-brand-500 shadow-xs"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  saveTaskUpdates({ dueDate: e.target.value });
                }}
                className="w-full text-xs font-semibold p-2.5 border border-slate-200 bg-white rounded-xl focus:outline-none focus:border-brand-500 shadow-xs"
              />
            </div>

            {/* Assignees */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Assignees ({assigneeIds.length})
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {projectMembers.map(member => {
                  const isAssigned = assigneeIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleToggleAssignee(member.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors ${
                        isAssigned ? 'bg-brand-50/80 border border-brand-200' : 'bg-white border border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Avatar name={member.name} color={member.avatar_color} size="xs" />
                        <span className="font-semibold text-slate-800 truncate">{member.name}</span>
                      </div>
                      {isAssigned && <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Labels / Tags */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Labels & Tags
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingLabel(!isAddingLabel)}
                  className="text-brand-600 hover:text-brand-700 text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>

              {/* Existing Labels */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {labels.length === 0 ? (
                  <span className="text-[11px] text-slate-400">No labels assigned</span>
                ) : (
                  labels.map(l => (
                    <LabelTag
                      key={l.id || l.name}
                      name={l.name}
                      color={l.color}
                      onRemove={() => handleRemoveLabel(l.name)}
                    />
                  ))
                )}
              </div>

              {/* Add label form */}
              {isAddingLabel && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2 animate-in fade-in">
                  <input
                    type="text"
                    placeholder="Label name (e.g. Bug, Feature)..."
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500"
                  />
                  <div className="flex items-center gap-1.5">
                    {colorsPalette.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewLabelColor(c)}
                        className={`w-5 h-5 rounded-full transition-transform ${
                          newLabelColor === c ? 'scale-125 ring-2 ring-slate-400' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingLabel(false)}
                      className="px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddLabel}
                      disabled={!newLabelName.trim()}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-brand-600 text-white rounded hover:bg-brand-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Task Meta Footer */}
            <div className="pt-4 border-t border-slate-200/80 text-[11px] text-slate-400 space-y-1">
              {task.creator_name && <p>Created by: <span className="font-semibold text-slate-600">{task.creator_name}</span></p>}
              <p>ID: <span className="font-mono text-[10px]">{task.id}</span></p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
