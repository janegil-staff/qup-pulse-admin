// qup-pulse-admin/src/context/AuthContext.js
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, setToken, clearToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [token, setTokenState] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTokenState(getToken());
    setReady(true);
  }, []);

  const signIn = useCallback(
    (jwt) => {
      setToken(jwt);
      setTokenState(jwt);
      router.push('/overview');
    },
    [router]
  );

  const signOut = useCallback(() => {
    clearToken();
    setTokenState(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ token, ready, isAuthed: Boolean(token), signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
