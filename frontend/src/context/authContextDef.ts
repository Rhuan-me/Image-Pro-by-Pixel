
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

  login: (email: string, password: string) => Promise<void>;

  register: (email: string, password: string) => Promise<void>;

  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextData>(
  {} as AuthContextData
);
