
import React from 'react';
import { AuthForm } from '../../components/Auth/AuthForm';

export const LoginPage: React.FC = () => {
  return <AuthForm initialMode="login" />;
};

export default LoginPage;
