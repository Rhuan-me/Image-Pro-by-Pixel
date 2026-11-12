
import React from 'react';
import { Outlet } from 'react-router-dom';
import fundo from '../../assets/fundo.jpg';
import './Auth.css';

export const AuthLayout: React.FC = () => {
  return (
    <main className="auth-layout">
      <section className="auth-brand">
        <div className="brand-logo">
          PixPro<span>.</span>
        </div>

        <div className="brand-image">
          <img
            src={fundo}

          />
        </div>

        <div className="brand-content">
          <h1>
            Um novo olhar.
            <br />
            Em cada pixel.
          </h1>

          <p>
            Dê vida às suas imagens. Organize, transforme
            e baixe tudo em um só lugar.
          </p>
        </div>
      </section>

      <section className="auth-content">
        <div className="auth-content-inner">
          <Outlet />
        </div>
      </section>
    </main>
  );
};

export default AuthLayout;
