import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>404 - Pagina Nao Encontrada</h1>
      <p>A rota acessada nao existe.</p>
      <Link to="/">Voltar ao inicio</Link>
    </div>
  );
};

export default NotFoundPage;
