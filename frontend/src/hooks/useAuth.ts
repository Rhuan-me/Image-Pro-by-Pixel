import { useContext } from 'react';
import { AuthContext, type AuthContextData } from '../context';

export const useAuth = (): AuthContextData => {
  const context = useContext(AuthContext);

  if (!context || Object.keys(context).length === 0) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }

  return context;
};

export default useAuth;
