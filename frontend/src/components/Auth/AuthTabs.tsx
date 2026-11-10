
import React from 'react';

interface AuthTabsProps {
  activeTab: 'login' | 'register';
  onChange: (tab: 'login' | 'register') => void;
}

export const AuthTabs: React.FC<AuthTabsProps> = ({
  activeTab,
  onChange,
}) => {
  return (
    <div className="auth-tabs">
      <button
        type="button"
        className={activeTab === 'login' ? 'active' : ''}
        onClick={() => onChange('login')}
      >
        Entrar
      </button>

      <button
        type="button"
        className={activeTab === 'register' ? 'active' : ''}
        onClick={() => onChange('register')}
      >
        Criar Conta
      </button>
    </div>
  );
};

export default AuthTabs;
