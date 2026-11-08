import React, { useState, useMemo } from 'react';
import { AuthContext, type AuthContextData, type User } from './authContextDef';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('@PixPro:token');
  });

  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('@PixPro:user');
    if (!storedUser) return null;
    try {
      return JSON.parse(storedUser);
    } catch {
      localStorage.removeItem('@PixPro:user');
      return null;
    }
  });

  const signIn = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('@PixPro:token', newToken);
    localStorage.setItem('@PixPro:user', JSON.stringify(newUser));
  };

  const signOut = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('@PixPro:token');
    localStorage.removeItem('@PixPro:user');
  };

  const contextValue = useMemo<AuthContextData>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      isLoading: false,
      signIn,
      signOut,
    }),
    [user, token]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
