import React from 'react';
import { useParams } from 'react-router-dom';

export const ImageDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Detalhes da Imagem</h1>
      <p>Placeholder: Visualizacao e detalhes da imagem (ID: {id || 'N/A'}).</p>
    </div>
  );
};

export default ImageDetailsPage;
