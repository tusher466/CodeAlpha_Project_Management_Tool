import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';
import { socketService } from './services/socket';

import AuthModal from './components/auth/AuthModal';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import KanbanBoard from './components/board/KanbanBoard';
import ListView from './components/board/ListView';
import CalendarView from './components/board/CalendarView';
import ActivityFeed from './components/board/ActivityFeed';

import TaskDetailModal from './components/tasks/TaskDetailModal';
import CreateTaskModal from './components/tasks/CreateTaskModal';
import CreateProjectModal from './components/projects/CreateProjectModal';
import InviteMemberModal from './components/projects/InviteMemberModal';
import { Menu, Plus, Sparkles } from 'lucide-react';

export default function App() {
  const { user, loading: authLoading } = useAuth();

  // Projects State
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [projectData, setProjectData] = useState(null); // { project, members, columns, tasks, activities }
  const [loadingProject, setLoadingProject] = useState(false);

  // Active Live Presence
  const [activeUsers, setActiveUsers] = useState([]);

  // Active View ('board', 'list', 'calendar', 'activity')
  const [activeView, setActiveView] = useState('board');

  // Filter Presets & Search
  const [filterPreset, setFilterPreset] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createTaskDefaultCol, setCreateTaskDefaultCol] = useState(null);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // 1. Fetch user projects on mount or user change
  const fetchProjects = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.getProjects();
      const projectList = res.projects || [];
      setProjects(projectList);

      if (projectList.length > 0 && !activeProjectId) {
        setActiveProjectId(projectList[0].id);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }, [user, activeProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // 2. Fetch active project details
  const fetchActiveProjectData = useCallback(async (projId) => {
    if (!projId) return;
    try {
      setLoadingProject(true);
      const res = await api.getProject(projId);
      setProjectData(res);
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      setLoadingProject(false);
    }
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      fetchActiveProjectData(activeProjectId);
    }
  }, [activeProjectId, fetchActiveProjectData]);

  // 3. Connect to Socket.IO project room & listen to real-time events
  useEffect(() => {
    if (!activeProjectId || !user) return;

    // Join room
    socketService.joinProject(activeProjectId, user);

    // Presence update
    const unsubPresence = socketService.on('project_presence_update', (users) => {
      setActiveUsers(users || []);
    });

    // Task created by any collaborator
    const unsubTaskCreated = socketService.on('task_created', (newTask) => {
      setProjectData(prev => {
        if (!prev || prev.project.id !== newTask.project_id) return prev;
        // Check if already in tasks
        if (prev.tasks.some(t => t.id === newTask.id)) return prev;
        return {
          ...prev,
          tasks: [...prev.tasks, newTask]
        };
      });
    });

    // Task updated by collaborator
    const unsubTaskUpdated = socketService.on('task_updated', (updatedTask) => {
      setProjectData(prev => {
        if (!prev || prev.project.id !== updatedTask.project_id) return prev;
        return {
          ...prev,
          tasks: prev.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
        };
      });
    });

    // Task moved (drag & drop by any collaborator)
    const unsubTaskMoved = socketService.on('task_moved', ({ taskId, targetColumnId, newPosition, task: updatedTask }) => {
      setProjectData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: prev.tasks.map(t => t.id === taskId ? (updatedTask || { ...t, column_id: targetColumnId, position: newPosition }) : t)
        };
      });
    });

    // Task deleted
    const unsubTaskDeleted = socketService.on('task_deleted', ({ taskId }) => {
      setProjectData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: prev.tasks.filter(t => t.id !== taskId)
        };
      });
    });

    // Column created
    const unsubColCreated = socketService.on('column_created', (newCol) => {
      setProjectData(prev => {
        if (!prev) return prev;
        if (prev.columns.some(c => c.id === newCol.id)) return prev;
        return {
          ...prev,
          columns: [...prev.columns, newCol].sort((a, b) => a.position - b.position)
        };
      });
    });

    // Column updated
    const unsubColUpdated = socketService.on('column_updated', (updatedCol) => {
      setProjectData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(c => c.id === updatedCol.id ? updatedCol : c)
        };
      });
    });

    // Column deleted
    const unsubColDeleted = socketService.on('column_deleted', ({ columnId }) => {
      setProjectData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.filter(c => c.id !== columnId)
        };
      });
    });

    // Member added
    const unsubMemberAdded = socketService.on('member_added', (newMember) => {
      setProjectData(prev => {
        if (!prev) return prev;
        if (prev.members.some(m => m.id === newMember.id)) return prev;
        return {
          ...prev,
          members: [...prev.members, newMember]
        };
      });
    });

    // Member removed
    const unsubMemberRemoved = socketService.on('member_removed', ({ userId }) => {
      setProjectData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.filter(m => m.id !== userId)
        };
      });
    });

    return () => {
      socketService.leaveProject(activeProjectId);
      unsubPresence();
      unsubTaskCreated();
      unsubTaskUpdated();
      unsubTaskMoved();
      unsubTaskDeleted();
      unsubColCreated();
      unsubColUpdated();
      unsubColDeleted();
      unsubMemberAdded();
      unsubMemberRemoved();
    };
  }, [activeProjectId, user]);

  // Handlers for task mutations
  const handleMoveTask = async ({ taskId, sourceColumnId, targetColumnId, sourceIndex, targetIndex }) => {
    if (!projectData) return;

    // Optimistic UI update
    const currentTasks = [...projectData.tasks];
    const targetColTasks = currentTasks
      .filter(t => t.column_id === targetColumnId && t.id !== taskId)
      .sort((a, b) => a.position - b.position);

    const movedTask = currentTasks.find(t => t.id === taskId);
    if (!movedTask) return;

    // Insert task at targetIndex
    targetColTasks.splice(targetIndex, 0, { ...movedTask, column_id: targetColumnId });

    // Reindex
    const orderedTaskIdsInTarget = targetColTasks.map(t => t.id);

    const updatedTasksList = currentTasks.map(t => {
      if (t.id === taskId) {
        return { ...t, column_id: targetColumnId, position: targetIndex };
      }
      const newPos = orderedTaskIdsInTarget.indexOf(t.id);
      if (newPos !== -1) {
        return { ...t, position: newPos };
      }
      return t;
    });

    setProjectData(prev => ({
      ...prev,
      tasks: updatedTasksList
    }));

    // Server update
    try {
      await api.moveTask(taskId, {
        targetColumnId,
        newPosition: targetIndex,
        orderedTaskIdsInTarget
      });
    } catch (err) {
      console.error('Failed to move task:', err);
      // Revert on error
      fetchActiveProjectData(activeProjectId);
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      const res = await api.createTask(activeProjectId, taskData);
      setProjectData(prev => ({
        ...prev,
        tasks: [...prev.tasks, res.task]
      }));
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleCreateColumn = async (name) => {
    try {
      const res = await api.createColumn(activeProjectId, { name });
      setProjectData(prev => ({
        ...prev,
        columns: [...prev.columns, res.column]
      }));
    } catch (err) {
      console.error('Failed to create column:', err);
    }
  };

  const handleUpdateColumn = async (columnId, name) => {
    try {
      const res = await api.updateColumn(columnId, { name });
      setProjectData(prev => ({
        ...prev,
        columns: prev.columns.map(c => c.id === columnId ? res.column : c)
      }));
    } catch (err) {
      console.error('Failed to update column:', err);
    }
  };

  const handleDeleteColumn = async (columnId) => {
    try {
      await api.deleteColumn(columnId);
      setProjectData(prev => ({
        ...prev,
        columns: prev.columns.filter(c => c.id !== columnId)
      }));
    } catch (err) {
      alert(err.message || 'Failed to delete column');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (confirm('Remove this member from the project?')) {
      try {
        await api.removeProjectMember(activeProjectId, memberId);
        setProjectData(prev => ({
          ...prev,
          members: prev.members.filter(m => m.id !== memberId)
        }));
      } catch (err) {
        console.error('Failed to remove member:', err);
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading TaskPulse workspace...</p>
        </div>
      </div>
    );
  }

  // Not logged in: show Auth Modal
  if (!user) {
    return <AuthModal />;
  }

  const activeProject = projectData?.project || projects.find(p => p.id === activeProjectId);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      
      {/* Top Navbar */}
      <Navbar
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(id) => setActiveProjectId(id)}
        onOpenCreateProject={() => setIsCreateProjectOpen(true)}
        activeUsers={activeUsers}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar */}
        <Sidebar
          projects={projects}
          activeProject={activeProject}
          onSelectProject={(id) => setActiveProjectId(id)}
          onOpenCreateProject={() => setIsCreateProjectOpen(true)}
          activeView={activeView}
          onSelectView={setActiveView}
          filterPreset={filterPreset}
          onSelectFilterPreset={setFilterPreset}
          members={projectData?.members || []}
          onOpenInviteMember={() => setIsInviteMemberOpen(true)}
          onRemoveMember={handleRemoveMember}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Viewport Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          
          {/* Subheader / Action Bar */}
          <div className="px-4 sm:px-6 py-3 bg-white/70 backdrop-blur-xs border-b border-slate-200/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-1.5 text-slate-500 hover:text-slate-800 lg:hidden rounded-lg hover:bg-slate-100"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                  {activeProject ? activeProject.name : 'Select a Project'}
                </h1>
                {activeProject?.description && (
                  <p className="text-[11px] text-slate-500 truncate max-w-md hidden sm:block">
                    {activeProject.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCreateTaskDefaultCol(projectData?.columns[0]?.id || null);
                  setIsCreateTaskOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs shadow-brand-500/20 transition-all hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Task</span>
              </button>
            </div>
          </div>

          {/* Active View Render */}
          {loadingProject ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
                <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading board...</span>
              </div>
            </div>
          ) : !activeProject ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <Sparkles className="w-12 h-12 text-brand-400 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Project Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                Create a new project or select an existing one from the sidebar to start collaborating.
              </p>
              <button
                onClick={() => setIsCreateProjectOpen(true)}
                className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold"
              >
                Create Project
              </button>
            </div>
          ) : activeView === 'board' ? (
            <KanbanBoard
              columns={projectData?.columns || []}
              tasks={projectData?.tasks || []}
              onMoveTask={handleMoveTask}
              onOpenCreateTask={(colId) => {
                setCreateTaskDefaultCol(colId);
                setIsCreateTaskOpen(true);
              }}
              onSelectTask={(id) => setSelectedTaskId(id)}
              onCreateColumn={handleCreateColumn}
              onUpdateColumn={handleUpdateColumn}
              onDeleteColumn={handleDeleteColumn}
              filterPreset={filterPreset}
              currentUserId={user?.id}
              searchQuery={searchQuery}
            />
          ) : activeView === 'list' ? (
            <ListView
              tasks={projectData?.tasks || []}
              columns={projectData?.columns || []}
              onSelectTask={(id) => setSelectedTaskId(id)}
              onOpenCreateTask={() => setIsCreateTaskOpen(true)}
              onMoveTask={handleMoveTask}
              searchQuery={searchQuery}
              filterPreset={filterPreset}
              currentUserId={user?.id}
            />
          ) : activeView === 'calendar' ? (
            <CalendarView
              tasks={projectData?.tasks || []}
              onSelectTask={(id) => setSelectedTaskId(id)}
            />
          ) : activeView === 'activity' ? (
            <ActivityFeed activities={projectData?.activities || []} />
          ) : null}

        </main>
      </div>

      {/* Task Detail Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          columns={projectData?.columns || []}
          projectMembers={projectData?.members || []}
          onTaskUpdated={(updatedTask) => {
            setProjectData(prev => prev ? ({
              ...prev,
              tasks: prev.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
            }) : prev);
          }}
          onTaskDeleted={(deletedTaskId) => {
            setProjectData(prev => prev ? ({
              ...prev,
              tasks: prev.tasks.filter(t => t.id !== deletedTaskId)
            }) : prev);
          }}
        />
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        columns={projectData?.columns || []}
        projectMembers={projectData?.members || []}
        defaultColumnId={createTaskDefaultCol}
        onCreateTask={handleCreateTask}
      />

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onProjectCreated={(newProject) => {
          setProjects(prev => [newProject, ...prev]);
          setActiveProjectId(newProject.id);
        }}
      />

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={isInviteMemberOpen}
        onClose={() => setIsInviteMemberOpen(false)}
        projectId={activeProjectId}
        existingMemberIds={(projectData?.members || []).map(m => m.id)}
        onMemberAdded={(newMember) => {
          setProjectData(prev => prev ? ({
            ...prev,
            members: [...prev.members, newMember]
          }) : prev);
        }}
      />

    </div>
  );
}
