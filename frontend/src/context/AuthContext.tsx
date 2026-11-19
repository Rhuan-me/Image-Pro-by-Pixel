
import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import {
  AuthContext,
  type AuthContextData,
  type User,
} from './authContextDef';

const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutos
const MAX_SESSION_TIME = 8 * 60 * 60 * 1000; // 8 horas

interface SessionData {
  expiresAt: number;
  lastActivity: number;
  startedAt: number;
}

const isSessionValid = (session: SessionData | null): boolean => {
  if (!session) return false;

  const now = Date.now();

  return (
    now < session.expiresAt &&
    now - session.lastActivity < IDLE_TIMEOUT &&
    now - session.startedAt < MAX_SESSION_TIME
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const sessionRef = useRef<SessionData | null>(null);

  const signOut = useCallback(() => {
    sessionRef.current = null;
    setToken(null);
    setUser(null);
  }, []);

  const signIn = useCallback(
    (
      newToken: string,
      newUser: User,
      expiresInSeconds: number
    ) => {
      const now = Date.now();

      sessionRef.current = {
        expiresAt: now + expiresInSeconds * 1000,
        lastActivity: now,
        startedAt: now,
      };

      setToken(newToken);
      setUser(newUser);
    },
    []
  );

  useEffect(() => {
    if (!token) return;

    const updateActivity = () => {
      const session = sessionRef.current;

      if (!isSessionValid(session)) {
        signOut();
        return;
      }

      sessionRef.current = {
        ...session!,
        lastActivity: Date.now(),
      };
    };

    const checkSession = () => {
      if (!isSessionValid(sessionRef.current)) {
        signOut();
      }
    };

    const events = [
      'click',
      'keydown',
      'mousemove',
      'scroll',
      'touchstart',
    ];

    events.forEach((event) => {
      window.addEventListener(event, updateActivity);
    });

    const interval = window.setInterval(checkSession, 15000);

    checkSession();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });

      window.clearInterval(interval);
    };
  }, [token, signOut]);

  const contextValue = useMemo<AuthContextData>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      isLoading: false,
      signIn,
      signOut,
    }),
    [user, token, signIn, signOut]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};