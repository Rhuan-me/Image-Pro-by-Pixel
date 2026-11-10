
import React, { useState } from 'react';
import { AuthTabs } from './AuthTabs';

type AuthMode = 'login' | 'register';

interface AuthFormProps {
  initialMode: AuthMode;
}

export const AuthForm: React.FC<AuthFormProps> = ({ initialMode }) => {
  const [activeTab, setActiveTab] = useState<AuthMode>(initialMode);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isLogin = activeTab === 'login';

  const handleTabChange = (tab: AuthMode) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!email.trim() || !password.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setError('Informe um endereço de e-mail válido.');
      return;
    }

    if (password.length < 8) {
      setError('A senha deve possuir pelo menos 8 caracteres.');
      return;
    }

    if (!isLogin) {
      if (!name.trim()) {
        setError('Informe seu nome.');
        return;
      }

      if (!confirmPassword.trim()) {
        setError('Confirme sua senha.');
        return;
      }

      if (password !== confirmPassword) {
        setError('As senhas não coincidem.');
        return;
      }

      setSuccess('Cadastro validado! A integração será realizada posteriormente.');
      return;
    }

    setSuccess('Formulário validado! A integração do login será realizada posteriormente.');
  };

  return (
    <div className="auth-card">
      <AuthTabs
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      <div className="auth-header">
        <h2>
          {isLogin
            ? 'Bom ter você por aqui.'
            : 'Seu próximo projeto começa aqui.'}
        </h2>

        <p>
          {isLogin
            ? 'Entre para continuar criando com o PixPro.'
            : 'Crie sua conta e dê um novo foco às suas imagens.'}
        </p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {!isLogin && (
          <div className="form-group">
            <label htmlFor="name">Nome</label>

            <input
              id="name"
              type="text"
              placeholder="Como você gostaria de ser chamado?"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="email">E-mail</label>

          <input
            id="email"
            type="email"
            placeholder={isLogin ? 'ana@studio.com' : 'voce@exemplo.com'}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Senha</label>

          <input
            id="password"
            type="password"
            placeholder={isLogin ? 'Digite sua senha' : 'Crie uma senha segura'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />

          {!isLogin && (
            <small>Use pelo menos 8 caracteres para sua senha.</small>
          )}
        </div>

        {!isLogin && (
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar senha</label>

            <input
              id="confirmPassword"
              type="password"
              placeholder="Digite a senha novamente"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>
        )}

        {isLogin && (
          <button
            type="button"
            className="forgot-password"
            onClick={() => setError('A recuperação de senha será implementada posteriormente.')}
          >
            Esqueci minha senha
          </button>
        )}

        {error && (
          <div className="auth-message error" role="alert">
            <span>!</span>
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="auth-message success" role="status">
            <span>✓</span>
            <p>{success}</p>
          </div>
        )}

        <button type="submit" className="auth-submit">
          {isLogin ? 'Entrar' : 'Cadastrar'}
        </button>
      </form>
    </div>
  );
};

export default AuthForm;
