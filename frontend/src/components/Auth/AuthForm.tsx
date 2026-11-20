import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import { AuthTabs } from './AuthTabs';
import { useAuth } from '../../hooks/useAuth';

type AuthMode = 'login' | 'register';

interface AuthFormProps {
  initialMode: AuthMode;
}

interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
}

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;
    const message = error.response?.data?.error?.message
      || error.response?.data?.message;

    if (message) return message;

    if (code === 'INVALID_CREDENTIALS' || status === 401) {
      return 'E-mail ou senha incorretos.';
    }

    if (code === 'EMAIL_ALREADY_EXISTS' || status === 409) {
      return 'Este e-mail já está cadastrado.';
    }

    if (status === 400) {
      return 'Dados inválidos. Verifique as informações preenchidas.';
    }

    if (!error.response) {
      return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
    }

    return 'Ocorreu um erro inesperado. Tente novamente.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Ocorreu um erro inesperado. Tente novamente.';
};

export const AuthForm: React.FC<AuthFormProps> = ({ initialMode }) => {
  const [activeTab, setActiveTab] = useState<AuthMode>(initialMode);

//  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { login, register, isLoading } = useAuth();
  const navigate = useNavigate();

  const isLogin = activeTab === 'login';

  const handleTabChange = (tab: AuthMode) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!email.trim() || !password.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      setError('Informe um endereço de e-mail válido.');
      return;
    }



    if (!isLogin) {
      // if (!name.trim()) {
      //   setError('Informe seu nome.');
      //   return;
      // }
        
      if (password.length < 8) {
        setError('A senha deve possuir pelo menos 8 caracteres.');
        return;
      }

      if (!/[a-z]/.test(password)) {
        setError('A senha deve conter pelo menos uma letra minúscula.');
        return;
      }

      if (!/[A-Z]/.test(password)) {
        setError('A senha deve conter pelo menos uma letra maiúscula.');
        return;
      }

      if (!/[0-9]/.test(password)) {
        setError('A senha deve conter pelo menos um número.');
        return;
      }

      if (!/[^A-Za-z0-9]/.test(password)) {
        setError('A senha deve conter pelo menos um caractere especial.');
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
    }
    try {
      if (isLogin) {
        await login(email.trim(), password);

        navigate('/dashboard', { replace: true });
      } else {
        await register(email.trim(), password);

        setActiveTab('login');
        setPassword('');
        setConfirmPassword('');

        setSuccess(
          'Cadastro realizado com sucesso! Agora entre com seu e-mail e senha.'
        );
      }
    } catch (error) {
      setError(getErrorMessage(error));
    }
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
        {/* {!isLogin && (
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
        )} */}

        <div className="form-group">
          <label htmlFor="email">E-mail</label>

          <input
            id="email"
            type="email"
            placeholder={isLogin ? 'ana@studio.com' : 'voce@exemplo.com'}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            disabled={isLoading}
          />
        </div>

         <div className="form-group">
          <label htmlFor="password">Senha</label>

          <input
            id="password"
            type="password"
            placeholder={
              isLogin ? 'Digite sua senha' : 'Crie uma senha segura'
            }
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            disabled={isLoading}
          />

          {!isLogin && (
            <small>
              Mínimo de 8 caracteres, com letras maiúsculas,
              minúsculas, número e caractere especial.
            </small>
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
              disabled={isLoading}
            />
          </div>
        )}

        {isLogin && (
          <button
            type="button"
            className="forgot-password"
            onClick={() =>
              setError(
                'A recuperação de senha será implementada posteriormente.'
              )
            }
            disabled={isLoading}
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

        <button
          type="submit"
          className="auth-submit"
          disabled={isLoading}
        >
          {isLoading
            ? 'Aguarde...'
            : isLogin
              ? 'Entrar'
              : 'Cadastrar'}
        </button>
      </form>
    </div>
  );
};

export default AuthForm;