import React, { useCallback, useState } from 'react';
import { Upload, X, File, Image, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export interface FileUploadProps {
  /**
   * Called when file is selected/dropped
   */
  onFileSelect: (file: File) => void;
  
  /**
   * Called when file is removed
   */
  onFileRemove?: () => void;
  
  /**
   * Currently selected file
   */
  file?: File | null;
  
  /**
   * Upload progress (0-100)
   */
  progress?: number;
  
  /**
   * Whether upload is in progress
   */
  isUploading?: boolean;
  
  /**
   * Error message
   */
  error?: string;
  
  /**
   * Accepted file types (e.g., "image/*,.pdf")
   */
  accept?: string;
  
  /**
   * Maximum file size in bytes
   */
  maxSize?: number;
  
  /**
   * Label for the upload area
   */
  label?: string;
  
  /**
   * Helper text
   */
  helperText?: string;
  
  /**
   * Disable the upload
   */
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onFileRemove,
  file,
  progress,
  isUploading = false,
  error,
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  label = 'Subir archivo',
  helperText,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const validateFile = (selectedFile: File): string | null => {
    if (maxSize && selectedFile.size > maxSize) {
      return `El archivo es demasiado grande. Máximo: ${(maxSize / 1024 / 1024).toFixed(1)}MB`;
    }
    
    if (accept) {
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const fileExtension = `.${selectedFile.name.split('.').pop()?.toLowerCase()}`;
      const fileMimeType = selectedFile.type;
      
      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExtension === type.toLowerCase();
        }
        if (type.endsWith('/*')) {
          const category = type.split('/')[0];
          return fileMimeType.startsWith(category + '/');
        }
        return fileMimeType === type;
      });
      
      if (!isAccepted) {
        return `Tipo de archivo no permitido. Formatos aceptados: ${accept}`;
      }
    }
    
    return null;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      const selectedFile = droppedFiles[0];
      const validationError = validateFile(selectedFile);
      
      if (validationError) {
        // Could emit error to parent
        return;
      }
      
      onFileSelect(selectedFile);
    }
  }, [disabled, isUploading, onFileSelect, maxSize, accept]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      const validationError = validateFile(selectedFile);
      
      if (validationError) {
        // Could emit error to parent
        return;
      }
      
      onFileSelect(selectedFile);
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFileRemove) {
      onFileRemove();
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return <Image className="w-8 h-8 text-blue-500" />;
    }
    if (['pdf'].includes(ext || '')) {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    return <File className="w-8 h-8 text-gray-500" />;
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer',
          isDragging && 'border-blue-500 bg-blue-50',
          !isDragging && !file && 'border-gray-300 hover:border-gray-400',
          file && 'border-green-500 bg-green-50',
          (disabled || isUploading) && 'opacity-50 cursor-not-allowed',
          error && 'border-red-500 bg-red-50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleFileInput}
          disabled={disabled || isUploading}
        />

        {!file ? (
          <div className="flex flex-col items-center justify-center text-center">
            <Upload className={cn(
              'w-12 h-12 mb-3',
              isDragging ? 'text-blue-500' : 'text-gray-400'
            )} />
            <p className="text-sm font-medium text-gray-700 mb-1">
              {isDragging ? 'Suelta el archivo aquí' : 'Arrastra un archivo o haz clic para seleccionar'}
            </p>
            {helperText && (
              <p className="text-xs text-gray-500">{helperText}</p>
            )}
            {maxSize && (
              <p className="text-xs text-gray-500 mt-1">
                Tamaño máximo: {(maxSize / 1024 / 1024).toFixed(1)}MB
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {getFileIcon(file.name)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            
            {isUploading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                {progress !== undefined && (
                  <span className="text-sm text-gray-600">{progress}%</span>
                )}
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={disabled}
                className="flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {isUploading && progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center text-sm text-red-600">
          <AlertCircle className="w-4 h-4 mr-1" />
          {error}
        </div>
      )}
    </div>
  );
};
