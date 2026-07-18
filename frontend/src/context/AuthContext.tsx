'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'STAFF' | 'CUSTOMER';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  storeId?: string;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (data: { name: string; email: string; password: string; role: string; storeName?: string; upiId?: string }) => Promise<boolean>;
  logout: () => void;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load session from localStorage on initialization
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('accessToken');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setAccessToken(savedToken);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Login failed.');
        return false;
      }

      setUser(data.user);
      setAccessToken(data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      if (data.user.role === 'CUSTOMER') {
        router.push('/customer/home');
      } else {
        router.push('/owner/dashboard');
      }
      return true;
    } catch (e) {
      console.error(e);
      alert('Network error connecting to authentication server.');
      return false;
    }
  };

  const signup = async (payload: any): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Signup failed.');
        return false;
      }

      setUser(data.user);
      setAccessToken(data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      if (data.user.role === 'CUSTOMER') {
        router.push('/customer/home');
      } else {
        router.push('/owner/dashboard');
      }
      return true;
    } catch (e) {
      console.error(e);
      alert('Signup connection failed.');
      return false;
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, refreshToken }),
      });
    } catch (e) {
      console.error('Logout request error: ', e);
    }

    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/');
  };

  // Secure wrapper to handle fetch requests with auth headers and token refreshes
  const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let token = accessToken || localStorage.getItem('accessToken');
    
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    options.headers = headers;

    let response = await fetch(url, options);

    // If access token is expired, trigger refresh rotation
    if (response.status === 403 || response.status === 401) {
      const savedRefresh = localStorage.getItem('refreshToken');
      if (savedRefresh) {
        try {
          const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: savedRefresh }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            setAccessToken(refreshData.accessToken);
            localStorage.setItem('accessToken', refreshData.accessToken);
            localStorage.setItem('refreshToken', refreshData.refreshToken);

            // Retry request with new token
            const retryHeaders = new Headers(options.headers);
            retryHeaders.set('Authorization', `Bearer ${refreshData.accessToken}`);
            options.headers = retryHeaders;

            response = await fetch(url, options);
          } else {
            // Refresh token has expired as well, redirect to login
            logout();
          }
        } catch (e) {
          console.error('API token intercept error: ', e);
          logout();
        }
      } else {
        logout();
      }
    }

    return response;
  };

  return (
    <AuthContext.Provider value={{ user, loading, accessToken, login, signup, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
