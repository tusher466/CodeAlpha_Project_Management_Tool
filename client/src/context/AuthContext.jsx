import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { socketService } from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = api.getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.getCurrentUser();
        setUser(res.user);
        socketService.connect(res.user);
      } catch (err) {
        console.error('Failed to restore session:', err);
        api.setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    const handleUnauthorized = () => {
      setUser(null);
      socketService.disconnect();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    api.setToken(res.token);
    setUser(res.user);
    socketService.connect(res.user);
    return res.user;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    api.setToken(res.token);
    setUser(res.user);
    socketService.connect(res.user);
    return res.user;
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    socketService.disconnect();
  };

  const quickLogin = async (userId) => {
    const res = await api.quickLogin(userId);
    api.setToken(res.token);
    setUser(res.user);
    socketService.connect(res.user);
    return res.user;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, quickLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
