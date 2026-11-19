
import { createContext } from 'react';

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthContextData {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (
    token: string,
    user: User,
    expiresInSeconds: number
  ) => void;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextData>(
  {} as AuthContextData
);
