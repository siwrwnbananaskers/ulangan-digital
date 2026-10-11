'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Custom hook for authentication state management
 */
export function useAuth(requiredRole = null) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!storedToken || !storedUser) {
      router.push('/');
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      
      if (requiredRole) {
        if (requiredRole === 'superadmin' && parsedUser.role !== 'superadmin') {
          router.push('/');
          return;
        }
        if (requiredRole === 'guru' && parsedUser.role !== 'guru' && parsedUser.role !== 'superadmin') {
          router.push('/');
          return;
        }
        if (requiredRole === 'siswa' && parsedUser.role !== 'siswa') {
          router.push('/');
          return;
        }
      }

      setUser(parsedUser);
      setToken(storedToken);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }

    setLoading(false);
  }, [router, requiredRole]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/me', { method: 'POST' });
    } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  }, [router]);

  const authFetch = useCallback(async (url, options = {}) => {
    const storedToken = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    
    if (storedToken) {
      headers['Authorization'] = `Bearer ${storedToken}`;
    }

    const res = await fetch(url, {
      cache: 'no-store',
      ...options,
      headers,
    });
    
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
      throw new Error('Session expired');
    }

    return res;
  }, [router]);

  return { user, token, loading, logout, authFetch };
}

/**
 * Custom hook for API data fetching
 */
export function useAPI(url, options = {}) {
  const { authFetch } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch(url, options);
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Terjadi kesalahan');
      }
      
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, error, loading, refetch: fetchData };
}
