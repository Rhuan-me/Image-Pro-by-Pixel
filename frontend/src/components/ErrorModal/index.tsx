import React from 'react';

export interface ErrorModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  title = 'Erro',
  message = 'Ocorreu um erro inesperado.',
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: '#fff',
          color: '#333',
          padding: '1.5rem',
          borderRadius: '8px',
          maxWidth: '400px',
          width: '90%',
        }}
      >
        <h2>{title}</h2>
        <p>{message}</p>
        <button type="button" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
};

export default ErrorModal;
