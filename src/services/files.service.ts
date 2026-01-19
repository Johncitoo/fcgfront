import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const FileCategory = {
  PROFILE: 'PROFILE',
  DOCUMENT: 'DOCUMENT',
  FORM_FIELD: 'FORM_FIELD',
  ATTACHMENT: 'ATTACHMENT',
  OTHER: 'OTHER',
} as const;

export type FileCategory = typeof FileCategory[keyof typeof FileCategory];

export const EntityType = {
  USER: 'USER',
  APPLICATION: 'APPLICATION',
  FORM_ANSWER: 'FORM_ANSWER',
  INSTITUTION: 'INSTITUTION',
  OTHER: 'OTHER',
} as const;

export type EntityType = typeof EntityType[keyof typeof EntityType];

export interface UploadFileOptions {
  file: File;
  category: FileCategory;
  entityType?: EntityType;
  entityId?: string;
  description?: string;
}

export interface FileMetadata {
  id: string;
  originalFilename: string;
  storedFilename: string;
  mimetype: string;
  size: number;
  category: FileCategory;
  entityType?: EntityType;
  entityId?: string;
  uploadedAt: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
}

export interface UploadResponse {
  success: boolean;
  file: FileMetadata;
  urls: {
    view: string;
    download: string;
    thumbnail: string | null;
  };
}

export const filesService = {
  /**
   * Sube un archivo al storage con metadatos.
   * 
   * @param options - Opciones de carga
   * @param options.file - Archivo File a subir
   * @param options.category - Categoría del archivo
   * @param options.entityType - Tipo de entidad relacionada (opcional)
   * @param options.entityId - ID de entidad relacionada (opcional)
   * @param options.description - Descripción del archivo (opcional)
   * @param token - Token JWT de autenticación
   * @returns Respuesta con metadatos y URLs del archivo
   * 
   * @example
   * const result = await filesService.upload({
   *   file: myFile,
   *   category: FileCategory.DOCUMENT,
   *   entityType: EntityType.APPLICATION,
   *   entityId: 'app-uuid'
   * }, token);
   */
  async upload(options: UploadFileOptions, token: string): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', options.file);
    formData.append('category', options.category);
    
    if (options.entityType) {
      formData.append('entityType', options.entityType);
    }
    
    if (options.entityId) {
      formData.append('entityId', options.entityId);
    }
    
    if (options.description) {
      formData.append('description', options.description);
    }

    const response = await axios.post<UploadResponse>(
      `${API_URL}/files/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  },

  /**
   * Obtiene los metadatos de un archivo por su ID.
   * 
   * @param fileId - UUID del archivo
   * @param token - Token JWT de autenticación
   * @returns Metadatos completos del archivo
   * 
   * @example
   * const metadata = await filesService.getMetadata('file-uuid', token);
   */
  async getMetadata(fileId: string, token: string): Promise<FileMetadata> {
    const response = await axios.get<FileMetadata>(
      `${API_URL}/files/${fileId}/metadata`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  },

  /**
   * Lista archivos con filtros opcionales.
   * 
   * @param filters - Filtros de búsqueda
   * @param filters.category - Filtrar por categoría
   * @param filters.entityType - Filtrar por tipo de entidad
   * @param filters.entityId - Filtrar por ID de entidad específica
   * @param token - Token JWT de autenticación
   * @returns Array de metadatos de archivos
   * 
   * @example
   * const files = await filesService.list({
   *   entityType: EntityType.APPLICATION,
   *   entityId: 'app-uuid'
   * }, token);
   */
  async list(
    filters: {
      category?: FileCategory;
      entityType?: EntityType;
      entityId?: string;
    },
    token: string
  ): Promise<FileMetadata[]> {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.entityType) params.append('entityType', filters.entityType);
    if (filters.entityId) params.append('entityId', filters.entityId);

    const response = await axios.get<{ files: FileMetadata[] }>(
      `${API_URL}/files/list?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data.files;
  },

  /**
   * Elimina un archivo del storage y base de datos.
   * 
   * @param fileId - UUID del archivo
   * @param token - Token JWT de autenticación
   * 
   * @example
   * await filesService.delete('file-uuid', token);
   */
  async delete(fileId: string, token: string): Promise<void> {
    await axios.delete(
      `${API_URL}/files/${fileId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  /**
   * Obtiene la URL de descarga de un archivo (como attachment).
   * 
   * @param fileId - UUID del archivo
   * @returns URL completa para descargar el archivo
   * 
   * @example
   * const url = filesService.getDownloadUrl('file-uuid');
   */
  getDownloadUrl(fileId: string): string {
    return `${API_URL}/files/${fileId}/download`;
  },

  /**
   * Obtiene la URL de visualización de un archivo (inline en navegador).
   * 
   * @param fileId - UUID del archivo
   * @returns URL completa para ver el archivo en el navegador
   * 
   * @example
   * const url = filesService.getViewUrl('file-uuid');
   */
  getViewUrl(fileId: string): string {
    return `${API_URL}/files/${fileId}/view`;
  },

  /**
   * Obtiene la URL del thumbnail de una imagen.
   * 
   * @param fileId - UUID del archivo imagen
   * @returns URL completa del thumbnail (si existe)
   * 
   * @example
   * const thumbUrl = filesService.getThumbnailUrl('file-uuid');
   */
  getThumbnailUrl(fileId: string): string {
    return `${API_URL}/files/${fileId}/thumbnail`;
  },
};
