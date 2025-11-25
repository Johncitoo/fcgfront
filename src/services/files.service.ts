import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://fcgback-production.up.railway.app/api';

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
   * Upload a file
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
   * Get file metadata
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
   * List files with filters
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
   * Delete a file
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
   * Get download URL for a file
   */
  getDownloadUrl(fileId: string): string {
    return `${API_URL}/files/${fileId}/download`;
  },

  /**
   * Get view URL for a file (inline)
   */
  getViewUrl(fileId: string): string {
    return `${API_URL}/files/${fileId}/view`;
  },

  /**
   * Get thumbnail URL for an image
   */
  getThumbnailUrl(fileId: string): string {
    return `${API_URL}/files/${fileId}/thumbnail`;
  },
};
