
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

import api from '../services/api';

const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutos
const MAX_SESSION_TIME = 8 * 60 * 60 * 1000; // 8 horas
const DEFAULT_TOKEN_EXPIRATION = 15 * 60; // 15 minutos

interface SessionData {
  expiresAt: number;
  lastActivity: number;
  startedAt: number;
}

interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: string | number;
  user: {
    id: string | number;
    email: string;
  };
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

// Converte valores como "15m", "1h" ou "900" para segundos.
const parseExpiration = (expiresIn: string | number): number => {
  if (typeof expiresIn === 'number') {
    return expiresIn > 0 ? expiresIn : DEFAULT_TOKEN_EXPIRATION;
  }

  const value = expiresIn.trim();

  if (/^\d+$/.test(value)) {
    const seconds = Number(value);
    return seconds > 0 ? seconds : DEFAULT_TOKEN_EXPIRATION;
  }

  const match = value.match(/^(\d+(?:\.\d+)?)\s*(s|m|h|d)$/i);

  if (!match) return DEFAULT_TOKEN_EXPIRATION;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };

  return amount > 0
    ? amount * multipliers[unit]
    : DEFAULT_TOKEN_EXPIRATION;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sessionRef = useRef<SessionData | null>(null);

  const clearSession = useCallback(() => {
    sessionRef.current = null;
    setToken(null);
    setUser(null);
  }, []);

  const startSession = useCallback(
    (newToken: string, newUser: User, expiresIn: string | number) => {
      const now = Date.now();
      const expiresInSeconds = parseExpiration(expiresIn);

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

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      setIsLoading(true);

      try {
        const response = await api.post<{ data: LoginResponse }>(
          '/api/auth/login',
          {
            email,
            password,
          }
        );

        const result = response.data.data;

        if (
          !result?.accessToken ||
          !result.user?.id ||
          !result.user?.email
        ) {
          throw new Error('A resposta do servidor possui dados inválidos.');
        }

        if (result.tokenType?.toLowerCase() !== 'bearer') {
          throw new Error('Tipo de token retornado pelo servidor não suportado.');
        }

        startSession(
          result.accessToken,
          {
            id: String(result.user.id),
            email: result.user.email,
          },
          result.expiresIn
        );
      } finally {
        setIsLoading(false);
      }
    },
    [startSession]
  );

  const register = useCallback(
    async (email: string, password: string): Promise<void> => {
      setIsLoading(true);

      try {
        await api.post('/api/auth/register', {
          email,
          password,
        });
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const signOut = useCallback(async (): Promise<void> => {
    const currentToken = token;

    try {
      if (currentToken) {
        await api.post(
          '/api/auth/logout',
          {},
          {
            headers: {
              Authorization: `Bearer ${currentToken}`,
            },
          }
        );
      }
    } catch (error) {
      // A sessão local será encerrada mesmo se o servidor estiver indisponível.
      console.error('[Auth] Não foi possível encerrar a sessão no servidor.', error);
    } finally {
      clearSession();
    }
  }, [token, clearSession]);

  useEffect(() => {
    if (!token) return;

    const updateActivity = () => {
      const session = sessionRef.current;

      if (!isSessionValid(session)) {
        void signOut();
        return;
      }

      if (session) {
        sessionRef.current = {
          ...session,
          lastActivity: Date.now(),
        };
      }
    };

    const checkSession = () => {
      if (!isSessionValid(sessionRef.current)) {
        void signOut();
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
      isLoading,
      login,
      register,
      signOut,
    }),
    [user, token, isLoading, login, register, signOut]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
