import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  loadStoredImages,
  saveStoredImages,
  type GalleryImage,
} from '../../services/galleryStore';
import '../Dashboard/Dashboard.css';

export const ImageDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [images, setImages] = useState<GalleryImage[]>(() => loadStoredImages());
  const [previewMode, setPreviewMode] = useState<'processed' | 'original'>('processed');

  const image = useMemo(() => {
    return images.find((item) => item.id === id) || images[0] || null;
  }, [images, id]);

  if (!image) {
    return (
      <div className="pixpro-workspace" style={{ alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Imagem não encontrada</h2>
          <p style={{ color: '#8b90a6', marginTop: '8px', marginBottom: '20px' }}>
            O ativo solicitado (ID: {id}) não está disponível na biblioteca.
          </p>
          <button
            type="button"
            className="pixpro-upload-btn"
            onClick={() => navigate('/dashboard')}
          >
            Voltar para a biblioteca
          </button>
        </div>
      </div>
    );
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(image.processedUrl || image.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = image.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(image.processedUrl || image.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDelete = () => {
    const updated = images.filter((item) => item.id !== image.id);
    setImages(updated);
    saveStoredImages(updated);
    navigate('/dashboard');
  };

  return (
    <div className="pixpro-workspace" style={{ flexDirection: 'column', padding: '28px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <button
          type="button"
          className="pixpro-action-secondary"
          style={{ flex: 'none', padding: '9px 18px' }}
          onClick={() => navigate('/dashboard')}
        >
          ← Voltar para a biblioteca
        </button>
        <div style={{ fontSize: '13px', color: '#7c829a' }}>
          PixPro · Visualização em Alta Resolução
        </div>
      </div>

      <div className="pixpro-detail-modal" style={{ maxWidth: '100%', maxHeight: 'none', flex: 1 }}>
        <div className="pixpro-detail-preview-pane" style={{ minHeight: '580px' }}>
          <img
            src={previewMode === 'processed' ? image.processedUrl || image.url : image.url}
            alt={image.originalName}
            className={`pixpro-detail-img ${previewMode === 'processed' ? 'effect-preview' : ''}`}
            style={{ maxHeight: '72vh' }}
          />
          <div className="pixpro-preview-toolbar">
            <button
              type="button"
              className={`pixpro-preview-toggle ${previewMode === 'processed' ? 'active' : ''}`}
              onClick={() => setPreviewMode('processed')}
            >
              Alta Resolução (IA)
            </button>
            <button
              type="button"
              className={`pixpro-preview-toggle ${previewMode === 'original' ? 'active' : ''}`}
              onClick={() => setPreviewMode('original')}
            >
              Original Bruta
            </button>
          </div>
        </div>

        <div className="pixpro-detail-info-pane">
          <div>
            <h1 className="pixpro-detail-title">{image.originalName}</h1>
            <div className="pixpro-detail-id">ID: {image.id}</div>

            <div className="pixpro-meta-grid">
              <div className="pixpro-meta-box">
                <div className="pixpro-meta-label">Status</div>
                <div className="pixpro-meta-value">
                  {image.status === 'PROCESSED'
                    ? '✓ Pronta'
                    : image.status === 'PROCESSING'
                    ? 'Em processamento...'
                    : 'Falha no processamento'}
                </div>
              </div>
              <div className="pixpro-meta-box">
                <div className="pixpro-meta-label">Projeto</div>
                <div className="pixpro-meta-value">{image.projectName}</div>
              </div>
              <div className="pixpro-meta-box">
                <div className="pixpro-meta-label">Formato & Tamanho</div>
                <div className="pixpro-meta-value">
                  {image.format} · {image.sizeLabel}
                </div>
              </div>
              <div className="pixpro-meta-box">
                <div className="pixpro-meta-label">Dimensões</div>
                <div className="pixpro-meta-value">{image.dimensions || '3840 × 2160 px'}</div>
              </div>
            </div>

            {image.aiMetadata && (
              <div className="pixpro-ai-section">
                <div className="pixpro-ai-heading">Metadados de Processamento IA</div>
                <div style={{ fontSize: '12.5px', color: '#d5d9e8', marginBottom: '4px' }}>
                  <strong>Modelo:</strong> {image.aiMetadata.modelUsed}
                </div>
                <div style={{ fontSize: '12.5px', color: '#a6adc4' }}>
                  <strong>Efeito:</strong> {image.aiMetadata.effectApplied}
                </div>
                {image.aiMetadata.tags?.length > 0 && (
                  <div className="pixpro-tags">
                    {image.aiMetadata.tags.map((tag) => (
                      <span key={tag} className="pixpro-tag">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pixpro-detail-actions">
            <button type="button" className="pixpro-action-primary" onClick={handleDownload}>
              Baixar imagem em alta resolução
            </button>
            <div className="pixpro-action-row">
              <button type="button" className="pixpro-action-danger" onClick={handleDelete}>
                Excluir imagem
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageDetailsPage;
