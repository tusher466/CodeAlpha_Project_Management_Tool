// In-memory presence tracking: projectId -> Map of socketId -> { id, name, avatar_color, email }
const projectPresences = new Map();

export function setupSocketIO(io) {
  io.on('connection', (socket) => {
    let currentUserId = null;
    let currentProjectId = null;

    // Join personal notification channel
    socket.on('authenticate', (userData) => {
      if (userData && userData.id) {
        currentUserId = userData.id;
        socket.join(`user:${userData.id}`);
      }
    });

    // Join project room and announce presence
    socket.on('join_project', ({ projectId, user }) => {
      if (!projectId) return;

      // Leave previous project room if any
      if (currentProjectId && currentProjectId !== projectId) {
        socket.leave(`project:${currentProjectId}`);
        removeUserFromPresence(currentProjectId, socket.id);
        io.to(`project:${currentProjectId}`).emit('project_presence_update', getPresenceUsers(currentProjectId));
      }

      currentProjectId = projectId;
      socket.join(`project:${projectId}`);

      if (user && user.id) {
        if (!projectPresences.has(projectId)) {
          projectPresences.set(projectId, new Map());
        }
        projectPresences.get(projectId).set(socket.id, {
          id: user.id,
          name: user.name,
          avatar_color: user.avatar_color,
          role: user.role
        });

        // Broadcast active users to everyone in the project
        io.to(`project:${projectId}`).emit('project_presence_update', getPresenceUsers(projectId));
      }
    });

    // Leave project room
    socket.on('leave_project', ({ projectId }) => {
      if (!projectId) return;
      socket.leave(`project:${projectId}`);
      removeUserFromPresence(projectId, socket.id);
      io.to(`project:${projectId}`).emit('project_presence_update', getPresenceUsers(projectId));
      if (currentProjectId === projectId) currentProjectId = null;
    });

    // Task modal room & typing indicator
    socket.on('join_task', ({ taskId }) => {
      if (taskId) socket.join(`task:${taskId}`);
    });

    socket.on('leave_task', ({ taskId }) => {
      if (taskId) socket.leave(`task:${taskId}`);
    });

    socket.on('typing_comment', ({ taskId, user, isTyping }) => {
      socket.to(`task:${taskId}`).emit('user_typing_comment', {
        taskId,
        user,
        isTyping
      });
    });

    // Disconnect cleanup
    socket.on('disconnect', () => {
      if (currentProjectId) {
        removeUserFromPresence(currentProjectId, socket.id);
        io.to(`project:${currentProjectId}`).emit('project_presence_update', getPresenceUsers(currentProjectId));
      }
    });
  });

  function removeUserFromPresence(projectId, socketId) {
    if (projectPresences.has(projectId)) {
      const roomMap = projectPresences.get(projectId);
      roomMap.delete(socketId);
      if (roomMap.size === 0) {
        projectPresences.delete(projectId);
      }
    }
  }

  function getPresenceUsers(projectId) {
    if (!projectPresences.has(projectId)) return [];
    // Deduplicate by user id
    const unique = new Map();
    for (const user of projectPresences.get(projectId).values()) {
      if (!unique.has(user.id)) {
        unique.set(user.id, user);
      }
    }
    return Array.from(unique.values());
  }

  return {
    emitToProject: (projectId, event, data) => {
      io.to(`project:${projectId}`).emit(event, data);
    },
    emitToUser: (userId, event, data) => {
      io.to(`user:${userId}`).emit(event, data);
    },
    emitToTask: (taskId, event, data) => {
      io.to(`task:${taskId}`).emit(event, data);
    }
  };
}
