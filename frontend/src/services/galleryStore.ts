import api from './api';

export type ImageStatus = 'PROCESSED' | 'PROCESSING' | 'FAILED';

export interface GalleryImage {
  id: string;
  originalName: string;
  projectId: string;
  projectName: string;
  format: 'JPG' | 'PNG' | 'WEBP';
  mimeType: string;
  sizeLabel: string;
  sizeBytes: number;
  status: ImageStatus;
  url: string;
  processedUrl?: string;
  progress?: number;
  errorMessage?: string;
  createdAt: string;
  dimensions?: string;
  aiMetadata?: {
    modelUsed: string;
    confidence: number;
    effectApplied: string;
    tags: string[];
  };
}

export interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

const STORAGE_IMAGES_KEY = '@PixPro:gallery_images_v1';
const STORAGE_PROJECTS_KEY = '@PixPro:projects_v1';

export const INITIAL_PROJECTS: ProjectItem[] = [
  { id: 'proj_estudio', name: 'Estúdio', description: 'Ensaios e campanhas de estúdio', createdAt: '2026-11-01T10:00:00Z' },
  { id: 'proj_natureza', name: 'Natureza', description: 'Paisagens naturais e horizontes', createdAt: '2026-11-02T14:30:00Z' },
  { id: 'proj_exploracoes', name: 'Explorações', description: 'Arquitetura e experimentos visuais', createdAt: '2026-11-04T09:15:00Z' },
];

export const INITIAL_IMAGES: GalleryImage[] = [
  {
    id: 'img_dunas_001',
    originalName: 'Dunas ao entardecer.jpg',
    projectId: 'proj_estudio',
    projectName: 'Estúdio',
    format: 'JPG',
    mimeType: 'image/jpeg',
    sizeLabel: '4,2 MB',
    sizeBytes: 4404019,
    status: 'PROCESSED',
    url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1400&q=85',
    processedUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1400&q=90',
    createdAt: '2026-11-10T18:20:00Z',
    dimensions: '3840 × 2160 px',
    aiMetadata: {
      modelUsed: 'MobileNet-TransferLearning-v1 + Sharp',
      confidence: 0.98,
      effectApplied: 'Realce de Contraste & Nitidez Óptica',
      tags: ['dunas', 'deserto', 'entardecer', 'paisagem'],
    },
  },
  {
    id: 'img_alpino_002',
    originalName: 'Horizonte alpino.jpg',
    projectId: 'proj_estudio',
    projectName: 'Estúdio',
    format: 'JPG',
    mimeType: 'image/jpeg',
    sizeLabel: '4,2 MB',
    sizeBytes: 4404019,
    status: 'PROCESSED',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=85',
    processedUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=90',
    createdAt: '2026-11-10T18:25:00Z',
    dimensions: '4096 × 2304 px',
    aiMetadata: {
      modelUsed: 'MobileNet-TransferLearning-v1 + Sharp',
      confidence: 0.97,
      effectApplied: 'Equilíbrio de Sombras & Nitidez',
      tags: ['montanhas', 'lago', 'alpino', 'natureza'],
    },
  },
  {
    id: 'img_arquitetura_003',
    originalName: 'Arquitetura em luz.jpg',
    projectId: 'proj_estudio',
    projectName: 'Estúdio',
    format: 'JPG',
    mimeType: 'image/jpeg',
    sizeLabel: '4,2 MB',
    sizeBytes: 4404019,
    status: 'PROCESSED',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1400&q=85',
    processedUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1400&q=90',
    createdAt: '2026-11-10T18:40:00Z',
    dimensions: '3200 × 2400 px',
    aiMetadata: {
      modelUsed: 'MobileNet-TransferLearning-v1 + Sharp',
      confidence: 0.95,
      effectApplied: 'Correção Geométrica & Luminância',
      tags: ['arquitetura', 'minimalismo', 'escada', 'luz'],
    },
  },
  {
    id: 'img_costa_004',
    originalName: 'Costa do Atlântico.jpg',
    projectId: 'proj_estudio',
    projectName: 'Estúdio',
    format: 'JPG',
    mimeType: 'image/jpeg',
    sizeLabel: '4,2 MB',
    sizeBytes: 4404019,
    status: 'PROCESSED',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=85',
    processedUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=90',
    createdAt: '2026-11-10T19:00:00Z',
    dimensions: '3840 × 2160 px',
    aiMetadata: {
      modelUsed: 'MobileNet-TransferLearning-v1 + Sharp',
      confidence: 0.99,
      effectApplied: 'Redução de Ruído & Realce Marítimo',
      tags: ['oceano', 'costa', 'ondas', 'praia'],
    },
  },
  {
    id: 'img_textura_005',
    originalName: 'Textura orgânica.png',
    projectId: 'proj_estudio',
    projectName: 'Estúdio',
    format: 'PNG',
    mimeType: 'image/png',
    sizeLabel: '8,1 MB',
    sizeBytes: 8493465,
    status: 'PROCESSING',
    progress: 58,
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1400&q=85',
    createdAt: '2026-11-10T19:12:00Z',
    dimensions: '4500 × 3000 px',
    aiMetadata: {
      modelUsed: 'Sharp-AI-Pipeline-v1',
      confidence: 0.92,
      effectApplied: 'Processamento em andamento...',
      tags: ['textura', 'orgânico', 'macro'],
    },
  },
  {
    id: 'img_campanha_006',
    originalName: 'Campanha verão.png',
    projectId: 'proj_estudio',
    projectName: 'Estúdio',
    format: 'PNG',
    mimeType: 'image/png',
    sizeLabel: '6,4 MB',
    sizeBytes: 6710886,
    status: 'FAILED',
    errorMessage: 'Verifique sua conexão.',
    url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=85',
    createdAt: '2026-11-10T19:15:00Z',
    dimensions: '3600 × 2400 px',
    aiMetadata: {
      modelUsed: 'Sharp-AI-Pipeline-v1',
      confidence: 0,
      effectApplied: 'Falha de comunicação com o worker',
      tags: ['campanha', 'verão', 'editorial'],
    },
  },
  {
    id: 'img_floresta_007',
    originalName: 'Neblina na floresta.jpg',
    projectId: 'proj_natureza',
    projectName: 'Natureza',
    format: 'JPG',
    mimeType: 'image/jpeg',
    sizeLabel: '5,1 MB',
    sizeBytes: 5347737,
    status: 'PROCESSED',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1400&q=85',
    createdAt: '2026-11-09T11:20:00Z',
    dimensions: '3840 × 2160 px',
    aiMetadata: {
      modelUsed: 'MobileNet-TransferLearning-v1 + Sharp',
      confidence: 0.96,
      effectApplied: 'Contraste Atmosférico & Nitidez',
      tags: ['floresta', 'neblina', 'árvores'],
    },
  },
  {
    id: 'img_aurora_008',
    originalName: 'Reflexo boreal.webp',
    projectId: 'proj_natureza',
    projectName: 'Natureza',
    format: 'WEBP',
    mimeType: 'image/webp',
    sizeLabel: '3,8 MB',
    sizeBytes: 3984588,
    status: 'PROCESSED',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1400&q=85',
    createdAt: '2026-11-09T15:10:00Z',
    dimensions: '3840 × 2160 px',
    aiMetadata: {
      modelUsed: 'MobileNet-TransferLearning-v1 + Sharp',
      confidence: 0.97,
      effectApplied: 'Saturação Seletiva & Denoise',
      tags: ['vale', 'montanha', 'nevoeiro'],
    },
  },
  {
    id: 'img_geometria_009',
    originalName: 'Concreto e sombra.jpg',
    projectId: 'proj_exploracoes',
    projectName: 'Explorações',
    format: 'JPG',
    mimeType: 'image/jpeg',
    sizeLabel: '4,9 MB',
    sizeBytes: 5138022,
    status: 'PROCESSED',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85',
    createdAt: '2026-11-08T16:45:00Z',
    dimensions: '4000 × 2667 px',
    aiMetadata: {
      modelUsed: 'Sharp-AI-Pipeline-v1',
      confidence: 0.94,
      effectApplied: 'Monocromático & Nitidez Estrutural',
      tags: ['concreto', 'modernismo', 'fachada'],
    },
  },
];

export function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 0.1) {
    return `${mb.toFixed(1).replace('.', ',')} MB`;
  }
  const kb = Math.max(1, Math.round(bytes / 1024));
  return `${kb} KB`;
}

export function detectFormat(fileName: string, mimeType: string): 'JPG' | 'PNG' | 'WEBP' {
  const lower = (fileName + ' ' + mimeType).toLowerCase();
  if (lower.includes('png')) return 'PNG';
  if (lower.includes('webp')) return 'WEBP';
  return 'JPG';
}

export function loadStoredProjects(): ProjectItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_PROJECTS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(INITIAL_PROJECTS));
      return INITIAL_PROJECTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PROJECTS;
  } catch {
    return INITIAL_PROJECTS;
  }
}

export function saveStoredProjects(projects: ProjectItem[]): void {
  localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
}

export function loadStoredImages(): GalleryImage[] {
  try {
    const raw = localStorage.getItem(STORAGE_IMAGES_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_IMAGES_KEY, JSON.stringify(INITIAL_IMAGES));
      return INITIAL_IMAGES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_IMAGES;
  } catch {
    return INITIAL_IMAGES;
  }
}

export function saveStoredImages(images: GalleryImage[]): void {
  try {
    localStorage.setItem(STORAGE_IMAGES_KEY, JSON.stringify(images));
  } catch {
    // Ignore storage quota errors for large data URLs
  }
}

export async function uploadImageToBackend(
  file: File,
  userId: string
): Promise<{ imageId?: string; storageUrl?: string; status?: string } | null> {
  try {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('userId', userId);
    formData.append('originalName', file.name);
    formData.append('mimeType', file.type);

    const response = await api.post('/api/images/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 8000,
    });

    if (response.data?.data) {
      return response.data.data;
    }
    return null;
  } catch {
    // Fallback para funcionamento local fluido quando backend não estiver rodando
    return null;
  }
}

export async function checkImageStatusOnBackend(imageId: string): Promise<{
  status?: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  processedStorageUrl?: string;
  storageUrl?: string;
} | null> {
  try {
    const response = await api.get(`/api/images/${imageId}`, { timeout: 4000 });
    return response.data?.data || null;
  } catch {
    return null;
  }
}

export async function createProjectOnBackend(name: string, description?: string): Promise<ProjectItem | null> {
  try {
    const response = await api.post('/api/projects', { name, description }, { timeout: 4000 });
    if (response.data?.project) {
      return {
        id: String(response.data.project.id),
        name: response.data.project.name,
        description: response.data.project.description || '',
        createdAt: response.data.project.createdAt || new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function deleteProjectOnBackend(projectId: string): Promise<boolean> {
  try {
    await api.delete(`/api/projects/${projectId}`, { timeout: 4000 });
    return true;
  } catch {
    return false;
  }
}

