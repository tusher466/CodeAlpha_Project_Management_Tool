import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import Avatar from '../common/Avatar';
import NotificationDropdown from '../notifications/NotificationDropdown';
import { 
  Sparkles, 
  Bell, 
  Search, 
  ChevronDown, 
  LogOut, 
  Users, 
  Layers, 
  Radio, 
  Check, 
  Plus,
  ArrowRightLeft
} from 'lucide-react';

export default function Navbar({
  projects = [],
  activeProject = null,
  onSelectProject,
  onOpenCreateProject,
  activeUsers = [],
  searchQuery = '',
  onSearchChange,
  onSelectTask
}) {
  const { user, logout, quickLogin } = useAuth();
  const { unreadCount } = useNotifications();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isSwitchUserOpen, setIsSwitchUserOpen] = useState(false);

  const profileRef = useRef(null);
  const projectRef = useRef(null);
  const switchRef = useRef(null);

  const demoAccounts = [
    { id: 'u-alex', name: 'Alex Rivera', role: 'Product Lead', color: '#4f46e5' },
    { id: 'u-sarah', name: 'Sarah Chen', role: 'Tech Lead', color: '#059669' },
    { id: 'u-marcus', name: 'Marcus Scott', role: 'Frontend Engineer', color: '#d97706' },
    { id: 'u-elena', name: 'Elena Rostova', role: 'UI/UX Designer', color: '#db2777' },
    { id: 'u-david', name: 'David Kim', role: 'DevOps & Cloud', color: '#0891b2' },
  ];

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (projectRef.current && !projectRef.current.contains(e.target)) {
        setIsProjectDropdownOpen(false);
      }
      if (switchRef.current && !switchRef.current.contains(e.target)) {
        setIsSwitchUserOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 select-none shadow-sm">
      
      {/* Left: Brand & Project Switcher */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-slate-900 tracking-tight text-lg hidden sm:inline-block">
            Task<span className="text-brand-600">Pulse</span>
          </span>
        </div>

        <div className="h-5 w-[1px] bg-slate-200 hidden md:block" />

        {/* Project Selector Dropdown */}
        <div className="relative" ref={projectRef}>
          <button
            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 transition-all text-xs font-semibold text-slate-800 max-w-[200px] sm:max-w-[260px] truncate"
          >
            {activeProject ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: activeProject.color || '#6366f1' }} />
                <span className="truncate">{activeProject.name}</span>
              </>
            ) : (
              <span>Select Project</span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </button>

          {isProjectDropdownOpen && (
            <div className="absolute left-0 top-11 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Your Projects
              </div>
              <div className="max-h-60 overflow-y-auto space-y-0.5">
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectProject(p.id);
                      setIsProjectDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors ${
                      activeProject?.id === p.id 
                        ? 'bg-brand-50 font-bold text-brand-700' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="truncate">{p.name}</span>
                    </div>
                    {activeProject?.id === p.id && <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />}
                  </button>
                ))}
              </div>

              <div className="pt-2 mt-1 border-t border-slate-100">
                <button
                  onClick={() => {
                    setIsProjectDropdownOpen(false);
                    onOpenCreateProject();
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-semibold text-brand-600 hover:bg-brand-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Project</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Middle: Search */}
      <div className="hidden lg:flex items-center flex-1 max-w-xs mx-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search tasks, tags, assignees..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-100/80 border border-transparent rounded-xl focus:outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/15 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right: Presence, Quick User Switcher, Notifications, Profile */}
      <div className="flex items-center gap-3">
        
        {/* Real-Time Live Presence Avatars */}
        {activeUsers.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50/70 border border-emerald-200/60 rounded-full" title="Currently viewing this project live">
            <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-700 mr-1">
              {activeUsers.length} live
            </span>
            <div className="flex items-center -space-x-1.5">
              {activeUsers.slice(0, 4).map((u) => (
                <Avatar
                  key={u.id}
                  name={u.name}
                  color={u.avatar_color}
                  size="xs"
                  isOnline={true}
                  showTooltip={true}
                  className="ring-2 ring-white"
                />
              ))}
              {activeUsers.length > 4 && (
                <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                  +{activeUsers.length - 4}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Demo Fast-Switch Dropdown */}
        <div className="relative" ref={switchRef}>
          <button
            onClick={() => setIsSwitchUserOpen(!isSwitchUserOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/70 text-slate-700 transition-colors"
            title="Switch user account for multi-user collaboration testing"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-brand-600" />
            <span className="hidden md:inline">Switch User</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isSwitchUserOpen && (
            <div className="absolute right-0 top-11 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 z-50 animate-in fade-in duration-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Collaborate as another user:
              </div>
              <div className="space-y-1 mt-1">
                {demoAccounts.map(demo => (
                  <button
                    key={demo.id}
                    onClick={async () => {
                      await quickLogin(demo.id);
                      setIsSwitchUserOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors ${
                      user?.id === demo.id ? 'bg-brand-50 font-bold text-brand-700' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Avatar name={demo.name} color={demo.color} size="xs" />
                      <div className="truncate">
                        <p className="font-semibold truncate">{demo.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{demo.role}</p>
                      </div>
                    </div>
                    {user?.id === demo.id && <span className="text-[10px] font-bold text-brand-600">Active</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          <NotificationDropdown
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
            onSelectTask={onSelectTask}
          />
        </div>

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <Avatar name={user?.name} color={user?.avatar_color} size="sm" isOnline={true} />
            <div className="hidden xl:block text-left text-xs leading-tight">
              <p className="font-bold text-slate-800">{user?.name}</p>
              <p className="text-[10px] text-slate-400">{user?.role}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 z-50 animate-in fade-in duration-100">
              <div className="p-2 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {user?.role}
                </span>
              </div>

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>

      </div>

    </header>
  );
}
