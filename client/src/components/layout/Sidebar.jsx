import React from 'react';
import { 
  Kanban, 
  ListTodo, 
  Calendar, 
  Activity, 
  Plus, 
  Users, 
  CheckCircle2, 
  UserCheck, 
  Flame, 
  Clock, 
  UserPlus,
  Shield,
  Trash2
} from 'lucide-react';
import Avatar from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({
  projects = [],
  activeProject = null,
  onSelectProject,
  onOpenCreateProject,
  activeView = 'board',
  onSelectView,
  filterPreset = 'all',
  onSelectFilterPreset,
  members = [],
  onOpenInviteMember,
  onRemoveMember,
  isMobileOpen = false,
  onCloseMobile
}) {
  const { user } = useAuth();

  const views = [
    { id: 'board', name: 'Board (Kanban)', icon: Kanban },
    { id: 'list', name: 'List View', icon: ListTodo },
    { id: 'calendar', name: 'Calendar View', icon: Calendar },
    { id: 'activity', name: 'Activity Stream', icon: Activity },
  ];

  const filterPresets = [
    { id: 'all', name: 'All Tasks', icon: ListTodo },
    { id: 'assigned_me', name: 'Assigned to Me', icon: UserCheck },
    { id: 'high_priority', name: 'High & Urgent', icon: Flame },
    { id: 'due_soon', name: 'Due this Week', icon: Clock }
  ];

  const isOwnerOrAdmin = activeProject?.owner_id === user?.id || 
    members.some(m => m.id === user?.id && (m.project_role === 'admin' || m.project_role === 'owner'));

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      <aside className={`
        fixed lg:static top-16 left-0 bottom-0 z-30
        w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0
        transition-transform duration-200 ease-in-out border-r border-slate-800
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Views Section */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
              Views
            </div>
            <nav className="space-y-1">
              {views.map(v => {
                const Icon = v.icon;
                const isActive = activeView === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => {
                      onSelectView(v.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive 
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{v.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Filter Presets Section */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
              Filter By
            </div>
            <div className="space-y-1">
              {filterPresets.map(f => {
                const Icon = f.icon;
                const isActive = filterPreset === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => onSelectFilterPreset(f.id)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      isActive 
                        ? 'bg-slate-800 text-white font-bold' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{f.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group Projects Section */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Group Projects
              </span>
              <button
                onClick={onOpenCreateProject}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Create Group Project"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              {projects.map(p => {
                const isActive = activeProject?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectProject(p.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                      isActive 
                        ? 'bg-slate-800 font-bold text-white ring-1 ring-slate-700' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="truncate">{p.name}</span>
                    </div>
                    {p.task_count > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        {p.task_count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Team Members in Active Project */}
          {activeProject && (
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Team ({members.length})
                  </span>
                </div>
                <button
                  onClick={onOpenInviteMember}
                  className="flex items-center gap-1 text-[10px] font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                  title="Add team member"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>Invite</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {members.map(m => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-800/60 transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar name={m.name} color={m.avatar_color} size="xs" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-300 truncate">{m.name}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{m.project_role || 'member'}</p>
                      </div>
                    </div>

                    {isOwnerOrAdmin && m.id !== activeProject.owner_id && m.id !== user?.id && (
                      <button
                        onClick={() => onRemoveMember(m.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-all rounded"
                        title="Remove member"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 text-center">
          TaskPulse Real-Time Engine v2.0
        </div>

      </aside>
    </>
  );
}
