import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.currentProjectId = null;
    this.currentTaskId = null;
  }

  connect(user) {
    if (this.socket && this.socket.connected) {
      if (user) {
        this.socket.emit('authenticate', user);
      }
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('⚡ Socket.IO connected:', this.socket.id);
      if (user) {
        this.socket.emit('authenticate', user);
      }
      // Rejoin project room if was previously inside one
      if (this.currentProjectId && user) {
        this.socket.emit('join_project', { projectId: this.currentProjectId, user });
      }
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('⚡ Socket.IO disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.warn('⚡ Socket connection error:', err.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  joinProject(projectId, user) {
    this.currentProjectId = projectId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_project', { projectId, user });
    }
  }

  leaveProject(projectId) {
    if (this.currentProjectId === projectId) {
      this.currentProjectId = null;
    }
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_project', { projectId });
    }
  }

  joinTask(taskId) {
    this.currentTaskId = taskId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_task', { taskId });
    }
  }

  leaveTask(taskId) {
    if (this.currentTaskId === taskId) {
      this.currentTaskId = null;
    }
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_task', { taskId });
    }
  }

  emitTyping(taskId, user, isTyping) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing_comment', { taskId, user, isTyping });
    }
  }

  on(event, callback) {
    if (!this.socket) return () => {};
    this.socket.on(event, callback);
    return () => this.socket.off(event, callback);
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new SocketService();
