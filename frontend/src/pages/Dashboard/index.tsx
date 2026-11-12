import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  type GalleryImage,
  type ProjectItem,
  INITIAL_IMAGES,
  INITIAL_PROJECTS,
  loadStoredImages,
  saveStoredImages,
  loadStoredProjects,
  saveStoredProjects,
  formatFileSize,
  detectFormat,
  uploadImageToBackend,
  checkImageStatusOnBackend,
  createProjectOnBackend,
  deleteProjectOnBackend,
} from '../../services/galleryStore';
import './Dashboard.css';

type FilterTab = 'ALL' | 'PROCESSED' | 'PROCESSING';

const BASELINE_COUNTS: Record<string, number> = {
  proj_estudio: 12,
  proj_natureza: 8,
  proj_exploracoes: 4,
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [projects, setProjects] = useState<ProjectItem[]>(() => loadStoredProjects());
  const [images, setImages] = useState<GalleryImage[]>(() => loadStoredImages());
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Upload states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'error' | 'info'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Project creation states
  const [isCreatingProject, setIsCreatingProject] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>('');

  // Menus & Modals
  const [openMenuCardId, setOpenMenuCardId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [previewMode, setPreviewMode] = useState<'processed' | 'original'>('processed');
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);

  const displayName = user?.name || 'Ana Martins';
  const firstName = displayName.split(' ')[0] || 'Ana';

  useEffect(() => {
    saveStoredImages(images);
  }, [images]);

  useEffect(() => {
    saveStoredProjects(projects);
  }, [projects]);

  // Close card dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenMenuCardId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Keep selectedImage in sync if images list updates
  useEffect(() => {
    if (selectedImage) {
      const updated = images.find((img) => img.id === selectedImage.id) || null;
      setSelectedImage(updated);
    }
  }, [images, selectedImage]);

  // Project counts (matching screenshot 12 / 8 / 4 = 24 baseline + dynamic delta)
  const projectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const proj of projects) {
      const actualCount = images.filter((img) => img.projectId === proj.id).length;
      const initialActualCount = INITIAL_IMAGES.filter((img) => img.projectId === proj.id).length;
      const base = BASELINE_COUNTS[proj.id];
      if (base !== undefined) {
        counts[proj.id] = Math.max(0, base + (actualCount - initialActualCount));
      } else {
        counts[proj.id] = actualCount;
      }
    }
    return counts;
  }, [projects, images]);

  const totalLibraryCount = useMemo(() => {
    return Object.values(projectCounts).reduce((acc, val) => acc + val, 0);
  }, [projectCounts]);

  // Filtered images for gallery
  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      // Project filter: on 'ALL' with no search and default tab, show Estúdio first (6 cards like the reference) or all matching
      if (selectedProjectId !== 'ALL' && img.projectId !== selectedProjectId) {
        return false;
      }
      if (selectedProjectId === 'ALL' && !searchQuery.trim() && activeTab === 'ALL') {
        // Show the 6 primary studio cards + any newly uploaded cards on the main view so the default view is 6 de 24 imagens
        const isDefaultOtherProject =
          (img.id === 'img_floresta_007' || img.id === 'img_aurora_008' || img.id === 'img_geometria_009');
        if (isDefaultOtherProject) return false;
      }

      if (activeTab === 'PROCESSED' && img.status !== 'PROCESSED') return false;
      if (activeTab === 'PROCESSING' && img.status !== 'PROCESSING') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = img.id.toLowerCase().includes(q);
        const matchName = img.originalName.toLowerCase().includes(q);
        const matchProject = img.projectName.toLowerCase().includes(q);
        const matchTags = img.aiMetadata?.tags?.some((t) => t.toLowerCase().includes(q));
        return matchId || matchName || matchProject || Boolean(matchTags);
      }

      return true;
    });
  }, [images, selectedProjectId, activeTab, searchQuery]);

  // Simulate or poll processing progress for Newly Uploaded or Retried images
  const startProcessingSimulation = (imageId: string, backendId?: string) => {
    let currentProgress = 18;
    const interval = setInterval(async () => {
      currentProgress += 24;

      if (backendId) {
        const backendStatus = await checkImageStatusOnBackend(backendId);
        if (backendStatus?.status === 'PROCESSED') {
          clearInterval(interval);
          setImages((prev) =>
            prev.map((item) =>
              item.id === imageId
                ? {
                    ...item,
                    status: 'PROCESSED',
                    progress: 100,
                    processedUrl: backendStatus.processedStorageUrl || item.url,
                    aiMetadata: {
                      modelUsed: 'Sharp-AI-Pipeline-v1',
                      confidence: 0.98,
                      effectApplied: 'Realce de Nitidez & Contraste Óptico',
                      tags: ['processada', 'alta-definição', 'sharp-ai'],
                    },
                  }
                : item
            )
          );
          return;
        }
      }

      if (currentProgress >= 100) {
        clearInterval(interval);
        setImages((prev) =>
          prev.map((item) =>
            item.id === imageId
              ? {
                  ...item,
                  status: 'PROCESSED',
                  progress: 100,
                  aiMetadata: {
                    modelUsed: 'MobileNet-TransferLearning-v1 + Sharp',
                    confidence: 0.97,
                    effectApplied: 'Realce Automático & Nitidez IA',
                    tags: ['otimizada', 'nitidez', 'pixpro-ai'],
                  },
                }
              : item
          )
        );
      } else {
        setImages((prev) =>
          prev.map((item) =>
            item.id === imageId ? { ...item, progress: Math.min(92, currentProgress) } : item
          )
        );
      }
    }, 950);
  };

  // Handle File Uploads (Drag & Drop or Click)
  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadFeedback(null);

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxBytes = 20 * 1024 * 1024; // 20 MB conforme UI

    const targetProject =
      projects.find((p) => p.id === selectedProjectId) || projects[0] || { id: 'proj_estudio', name: 'Estúdio' };

    for (const file of Array.from(fileList)) {
      const extOk = /\.(jpe?g|png|webp)$/i.test(file.name);
      if (!allowedTypes.includes(file.type) && !extOk) {
        setUploadFeedback({
          type: 'error',
          message: `Formato inválido (${file.name}). Envie apenas imagens JPG, PNG ou WEBP.`,
        });
        continue;
      }

      if (file.size > maxBytes) {
        setUploadFeedback({
          type: 'error',
          message: `O arquivo "${file.name}" excede o limite máximo de 20 MB.`,
        });
        continue;
      }

      const localPreviewUrl = URL.createObjectURL(file);
      const tempId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const newImage: GalleryImage = {
        id: tempId,
        originalName: file.name,
        projectId: targetProject.id,
        projectName: targetProject.name,
        format: detectFormat(file.name, file.type),
        mimeType: file.type || 'image/jpeg',
        sizeLabel: formatFileSize(file.size),
        sizeBytes: file.size,
        status: 'PROCESSING',
        progress: 22,
        url: localPreviewUrl,
        processedUrl: localPreviewUrl,
        createdAt: new Date().toISOString(),
        dimensions: 'Alta Resolução',
        aiMetadata: {
          modelUsed: 'Sharp-AI-Pipeline-v1',
          confidence: 0.95,
          effectApplied: 'Ajustando os últimos pixels...',
          tags: [targetProject.name.toLowerCase(), 'upload'],
        },
      };

      setImages((prev) => [newImage, ...prev]);
      setUploadFeedback({
        type: 'info',
        message: `"${file.name}" enviado para a fila de processamento assíncrono.`,
      });

      const backendResp = await uploadImageToBackend(file, user?.id || 'usr_ana_martins');
      startProcessingSimulation(tempId, backendResp?.imageId);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFilesSelected(e.dataTransfer.files);
  };

  // Retry failed image
  const handleRetryImage = (img: GalleryImage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setImages((prev) =>
      prev.map((item) =>
        item.id === img.id
          ? { ...item, status: 'PROCESSING', progress: 25, errorMessage: undefined }
          : item
      )
    );
    startProcessingSimulation(img.id);
  };

  // Delete image
  const handleDeleteImage = (imageId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setImages((prev) => prev.filter((item) => item.id !== imageId));
    if (selectedImage?.id === imageId) {
      setSelectedImage(null);
    }
    setOpenMenuCardId(null);
  };

  // Download image
  const handleDownloadImage = async (img: GalleryImage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const response = await fetch(img.processedUrl || img.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = img.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(img.processedUrl || img.url, '_blank', 'noopener,noreferrer');
    }
    setOpenMenuCardId(null);
  };

  // Move image to another project
  const handleChangeImageProject = (imageId: string, newProjectId: string) => {
    const proj = projects.find((p) => p.id === newProjectId);
    if (!proj) return;
    setImages((prev) =>
      prev.map((item) =>
        item.id === imageId ? { ...item, projectId: proj.id, projectName: proj.name } : item
      )
    );
  };

  // Create new project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newProjectName.trim();
    if (!trimmed) return;

    const backendProject = await createProjectOnBackend(trimmed);
    const created: ProjectItem = backendProject || {
      id: `proj_${Date.now()}`,
      name: trimmed,
      createdAt: new Date().toISOString(),
    };

    setProjects((prev) => [...prev, created]);
    setSelectedProjectId(created.id);
    setNewProjectName('');
    setIsCreatingProject(false);
  };

  // Delete project
  const handleDeleteProject = async (projId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteProjectOnBackend(projId);
    setProjects((prev) => prev.filter((p) => p.id !== projId));
    if (selectedProjectId === projId) {
      setSelectedProjectId('ALL');
    }
  };

  // Reset demo data
  const handleResetDemo = () => {
    setProjects(INITIAL_PROJECTS);
    setImages(INITIAL_IMAGES);
    setSelectedProjectId('ALL');
    setActiveTab('ALL');
    setSearchQuery('');
    setShowUserMenu(false);
  };

  return (
    <div className="pixpro-workspace">
      {/* ==================== SIDEBAR ==================== */}
      <aside className="pixpro-sidebar">
        <div className="pixpro-sidebar-top">
          <div className="pixpro-brand">
            <div className="pixpro-brand-title">PixPro</div>
            <div className="pixpro-brand-subtitle">SEU ESPAÇO CRIATIVO</div>
          </div>

          {/* Todas as imagens */}
          <button
            type="button"
            className={`pixpro-nav-item ${selectedProjectId === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedProjectId('ALL')}
          >
            <span className="pixpro-nav-item-left">
              <svg className="pixpro-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
              <span>Todas as imagens</span>
            </span>
            <span className="pixpro-nav-count">{totalLibraryCount}</span>
          </button>

          {/* Projetos */}
          <div className="pixpro-projects-section">
            <div className="pixpro-projects-header">
              <span className="pixpro-projects-label">PROJETOS</span>
              <button
                type="button"
                className="pixpro-icon-btn"
                title="Criar novo projeto"
                onClick={() => setIsCreatingProject(true)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {projects.map((proj) => (
              <div key={proj.id} className="pixpro-project-row">
                <button
                  type="button"
                  className={`pixpro-nav-item ${selectedProjectId === proj.id ? 'active' : ''}`}
                  onClick={() => setSelectedProjectId(proj.id)}
                >
                  <span className="pixpro-nav-item-left">
                    <svg className="pixpro-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path
                        d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>{proj.name}</span>
                  </span>
                  <span className="pixpro-nav-count">{projectCounts[proj.id] ?? 0}</span>
                </button>
                {projects.length > 1 && (
                  <button
                    type="button"
                    className="pixpro-project-delete-btn"
                    title={`Excluir projeto ${proj.name}`}
                    onClick={(e) => handleDeleteProject(proj.id, e)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            {isCreatingProject ? (
              <form className="pixpro-inline-project-form" onSubmit={handleCreateProject}>
                <input
                  type="text"
                  className="pixpro-inline-project-input"
                  placeholder="Nome do projeto..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  autoFocus
                  maxLength={32}
                />
                <div className="pixpro-inline-project-actions">
                  <button
                    type="button"
                    className="pixpro-btn-xs cancel"
                    onClick={() => {
                      setIsCreatingProject(false);
                      setNewProjectName('');
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="pixpro-btn-xs confirm">
                    Criar
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="pixpro-new-project-btn"
                onClick={() => setIsCreatingProject(true)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                <span>Novo projeto</span>
              </button>
            )}
          </div>
        </div>

        {/* User Footer */}
        <div className="pixpro-sidebar-footer">
          {showUserMenu && (
            <div className="pixpro-user-menu">
              <button type="button" className="pixpro-user-menu-item" onClick={handleResetDemo}>
                Restaurar dados iniciais
              </button>
              <button
                type="button"
                className="pixpro-user-menu-item danger"
                onClick={() => {
                  signOut();
                  navigate('/login');
                }}
              >
                Sair da conta
              </button>
            </div>
          )}
          <button
            type="button"
            className="pixpro-user-Trigger"
            onClick={() => setShowUserMenu((prev) => !prev)}
          >
            <div>
              <div className="pixpro-user-name">{displayName}</div>
              <div className="pixpro-user-role">Conta pessoal</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c8197" strokeWidth="2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ==================== MAIN WORKSPACE ==================== */}
      <main className="pixpro-main">
        {/* Hero Banner */}
        <section className="pixpro-hero">
          <div className="pixpro-welcome-pill">Bem-vinda, {firstName}</div>
          <h1 className="pixpro-hero-title">PixPro</h1>
          <p className="pixpro-hero-subtitle">Um novo foco para cada imagem.</p>
        </section>

        {/* Drag & Drop Upload Box */}
        <section
          className={`pixpro-dropzone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Área de upload de imagens"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          <div className="pixpro-dropzone-left">
            <div className="pixpro-dropzone-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 16V4m0 0L8 8m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div className="pixpro-dropzone-title">Solte suas imagens aqui</div>
              <div className="pixpro-dropzone-desc">ou selecione os arquivos no seu computador</div>
              <div className="pixpro-dropzone-hint">JPG, PNG ou WEBP • Até 20 MB por imagem</div>
            </div>
          </div>

          <button
            type="button"
            className="pixpro-upload-btn"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Selecionar imagens
          </button>
        </section>

        {uploadFeedback && (
          <div className={`pixpro-upload-feedback ${uploadFeedback.type}`}>
            <span>{uploadFeedback.message}</span>
            <button
              type="button"
              className="pixpro-icon-btn"
              onClick={() => setUploadFeedback(null)}
              aria-label="Fechar aviso"
            >
              ×
            </button>
          </div>
        )}

        {/* Library Header & Search */}
        <section className="pixpro-library-header">
          <div>
            <h2 className="pixpro-library-title">
              {selectedProjectId === 'ALL'
                ? 'Sua biblioteca'
                : projects.find((p) => p.id === selectedProjectId)?.name || 'Sua biblioteca'}
            </h2>
            <p className="pixpro-library-subtitle">Tudo o que você cria, em um só lugar.</p>
          </div>

          <div className="pixpro-search-box">
            <svg className="pixpro-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              className="pixpro-search-input"
              placeholder="Buscar por id..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </section>

        {/* Filter Tabs & Counter */}
        <div className="pixpro-toolbar-row">
          <div className="pixpro-filter-tabs">
            <button
              type="button"
              className={`pixpro-filter-tab ${activeTab === 'ALL' ? 'active' : ''}`}
              onClick={() => setActiveTab('ALL')}
            >
              Todas
            </button>
            <button
              type="button"
              className={`pixpro-filter-tab ${activeTab === 'PROCESSED' ? 'active' : ''}`}
              onClick={() => setActiveTab('PROCESSED')}
            >
              Processadas
            </button>
            <button
              type="button"
              className={`pixpro-filter-tab ${activeTab === 'PROCESSING' ? 'active' : ''}`}
              onClick={() => setActiveTab('PROCESSING')}
            >
              Em processamento
            </button>
          </div>

          <div className="pixpro-counter-label">
            {filteredImages.length} de{' '}
            {selectedProjectId === 'ALL' ? totalLibraryCount : projectCounts[selectedProjectId] ?? filteredImages.length}{' '}
            imagens
          </div>
        </div>

        {/* Gallery Grid */}
        {filteredImages.length === 0 ? (
          <div className="pixpro-empty">
            <p>Nenhuma imagem encontrada para este filtro.</p>
          </div>
        ) : (
          <section className="pixpro-grid">
            {filteredImages.map((img, idx) => (
              <article
                key={img.id}
                className={`pixpro-card ${idx === 0 && selectedProjectId === 'ALL' ? 'selected' : ''}`}
              >
                <div
                  className="pixpro-card-media"
                  onClick={() => {
                    setSelectedImage(img);
                    setPreviewMode('processed');
                  }}
                >
                  {img.status === 'PROCESSED' && (
                    <>
                      <span className="pixpro-status-pill">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Pronta
                      </span>
                      <img
                        src={img.processedUrl || img.url}
                        alt={img.originalName}
                        className="pixpro-card-img"
                        loading="lazy"
                      />
                    </>
                  )}

                  {img.status === 'PROCESSING' && (
                    <div className="pixpro-card-state">
                      <div className="pixpro-spinner" aria-label="Carregando" />
                      <div className="pixpro-state-title">Tratando sua imagem</div>
                      <div className="pixpro-state-subtitle">Ajustando os últimos pixels...</div>
                      <div className="pixpro-progress-track">
                        <div
                          className="pixpro-progress-bar"
                          style={{ width: `${img.progress ?? 55}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {img.status === 'FAILED' && (
                    <div className="pixpro-card-state">
                      <svg
                        className="pixpro-error-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 8v4.5M12 16h.01" strokeLinecap="round" />
                      </svg>
                      <div className="pixpro-state-title">Não foi possível processar</div>
                      <div className="pixpro-state-subtitle">
                        {img.errorMessage || 'Verifique sua conexão.'}
                      </div>
                      <button
                        type="button"
                        className="pixpro-retry-btn"
                        onClick={(e) => handleRetryImage(img, e)}
                      >
                        Tentar novamente
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="pixpro-card-footer">
                  <div
                    className="pixpro-card-info"
                    onClick={() => {
                      setSelectedImage(img);
                      setPreviewMode('processed');
                    }}
                  >
                    <div className="pixpro-card-name" title={img.originalName}>
                      {img.originalName}
                    </div>
                    <div className="pixpro-card-meta">
                      {img.projectName} · {img.format} · {img.sizeLabel}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="pixpro-dots-btn"
                    aria-label="Opções da imagem"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuCardId((prev) => (prev === img.id ? null : img.id));
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="5" cy="12" r="1.8" />
                      <circle cx="12" cy="12" r="1.8" />
                      <circle cx="19" cy="12" r="1.8" />
                    </svg>
                  </button>

                  {openMenuCardId === img.id && (
                    <div className="pixpro-card-dropdown" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImage(img);
                          setOpenMenuCardId(null);
                        }}
                      >
                        Visualizar detalhes
                      </button>
                      <button type="button" onClick={(e) => handleDownloadImage(img, e)}>
                        Baixar imagem
                      </button>
                      {img.status === 'FAILED' && (
                        <button type="button" onClick={(e) => handleRetryImage(img, e)}>
                          Tentar novamente
                        </button>
                      )}
                      <button
                        type="button"
                        className="danger"
                        onClick={(e) => handleDeleteImage(img.id, e)}
                      >
                        Excluir imagem
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}
      </main>

      {/* ==================== HIGH-RES IMAGE DETAILS MODAL ==================== */}
      {selectedImage && (
        <div
          className="pixpro-modal-backdrop"
          onClick={() => setSelectedImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="pixpro-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pixpro-detail-preview-pane">
              <img
                src={
                  previewMode === 'processed'
                    ? selectedImage.processedUrl || selectedImage.url
                    : selectedImage.url
                }
                alt={selectedImage.originalName}
                className={`pixpro-detail-img ${previewMode === 'processed' ? 'effect-preview' : ''}`}
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
                <div className="pixpro-detail-header">
                  <div>
                    <h3 className="pixpro-detail-title">{selectedImage.originalName}</h3>
                    <div className="pixpro-detail-id">ID: {selectedImage.id}</div>
                  </div>
                  <button
                    type="button"
                    className="pixpro-close-btn"
                    onClick={() => setSelectedImage(null)}
                    aria-label="Fechar detalhes"
                  >
                    ✕
                  </button>
                </div>

                <div className="pixpro-meta-grid">
                  <div className="pixpro-meta-box">
                    <div className="pixpro-meta-label">Status</div>
                    <div className="pixpro-meta-value">
                      {selectedImage.status === 'PROCESSED'
                        ? '✓ Pronta'
                        : selectedImage.status === 'PROCESSING'
                        ? 'Em processamento...'
                        : 'Falha no processamento'}
                    </div>
                  </div>

                  <div className="pixpro-meta-box">
                    <div className="pixpro-meta-label">Projeto / Categoria</div>
                    <select
                      className="pixpro-project-select"
                      value={selectedImage.projectId}
                      onChange={(e) => handleChangeImageProject(selectedImage.id, e.target.value)}
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pixpro-meta-box">
                    <div className="pixpro-meta-label">Formato & Tamanho</div>
                    <div className="pixpro-meta-value">
                      {selectedImage.format} · {selectedImage.sizeLabel}
                    </div>
                  </div>

                  <div className="pixpro-meta-box">
                    <div className="pixpro-meta-label">Resolução</div>
                    <div className="pixpro-meta-value">
                      {selectedImage.dimensions || '3840 × 2160 px'}
                    </div>
                  </div>
                </div>

                {selectedImage.aiMetadata && (
                  <div className="pixpro-ai-section">
                    <div className="pixpro-ai-heading">Pipeline de Inteligência Artificial</div>
                    <div style={{ fontSize: '12.5px', color: '#d5d9e8', marginBottom: '4px' }}>
                      <strong>Modelo:</strong> {selectedImage.aiMetadata.modelUsed}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#a6adc4' }}>
                      <strong>Filtro aplicado:</strong> {selectedImage.aiMetadata.effectApplied}
                    </div>
                    {selectedImage.aiMetadata.tags?.length > 0 && (
                      <div className="pixpro-tags">
                        {selectedImage.aiMetadata.tags.map((tag) => (
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
                <button
                  type="button"
                  className="pixpro-action-primary"
                  onClick={(e) => handleDownloadImage(selectedImage, e)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Baixar imagem em alta resolução
                </button>

                <div className="pixpro-action-row">
                  <button
                    type="button"
                    className="pixpro-action-secondary"
                    onClick={() => navigate(`/images/${selectedImage.id}`)}
                  >
                    Abrir página dedicada
                  </button>

                  {selectedImage.status === 'FAILED' && (
                    <button
                      type="button"
                      className="pixpro-action-secondary"
                      onClick={(e) => handleRetryImage(selectedImage, e)}
                    >
                      Tentar novamente
                    </button>
                  )}

                  <button
                    type="button"
                    className="pixpro-action-danger"
                    onClick={(e) => handleDeleteImage(selectedImage.id, e)}
                  >
                    Excluir imagem
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
