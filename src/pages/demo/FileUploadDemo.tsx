import { useState } from 'react';
import { FileUpload } from '../../components/FileUpload';
import { filesService, FileCategory, EntityType } from '../../services/files.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { CheckCircle2, AlertCircle, Download, Eye } from 'lucide-react';

export default function FileUploadDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<any>(null);

  const token = localStorage.getItem('fcg.access_token') ?? '';

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setError('');
    setUploadedFile(null);
  };

  const handleFileRemove = () => {
    setFile(null);
    setError('');
    setProgress(0);
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      setError('');
      setProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await filesService.upload(
        {
          file,
          category: FileCategory.DOCUMENT,
          entityType: EntityType.APPLICATION,
          description: 'Archivo de prueba desde el demo',
        },
        token
      );

      clearInterval(progressInterval);
      setProgress(100);

      setTimeout(() => {
        setUploadedFile(response);
        setIsUploading(false);
        setFile(null);
        setProgress(0);
      }, 500);

    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al subir el archivo');
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Demo de Subida de Archivos
        </h1>
        <p className="text-gray-600 mt-2">
          Prueba el sistema de storage con drag & drop
        </p>
      </div>

      <div className="grid gap-6">
        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>Subir Archivo</CardTitle>
            <CardDescription>
              Arrastra un archivo o haz clic para seleccionar. Máximo 10MB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              file={file}
              progress={progress}
              isUploading={isUploading}
              error={error}
              accept="image/*,.pdf,.doc,.docx,.txt"
              maxSize={10 * 1024 * 1024}
              helperText="Formatos: imágenes, PDF, documentos de Word, texto"
            />

            {file && !isUploading && !uploadedFile && (
              <div className="mt-4">
                <Button onClick={handleUpload} className="w-full">
                  Subir Archivo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Success Card */}
        {uploadedFile && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <CardTitle className="text-green-900">
                  ¡Archivo Subido Exitosamente!
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium text-gray-700">Nombre:</div>
                  <div className="text-gray-900">{uploadedFile.file.originalFilename}</div>
                  
                  <div className="font-medium text-gray-700">Tamaño:</div>
                  <div className="text-gray-900">
                    {(uploadedFile.file.size / 1024).toFixed(1)} KB
                  </div>
                  
                  <div className="font-medium text-gray-700">Tipo:</div>
                  <div className="text-gray-900">{uploadedFile.file.mimetype}</div>
                  
                  <div className="font-medium text-gray-700">ID:</div>
                  <div className="text-gray-900 font-mono text-xs">
                    {uploadedFile.file.id}
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(uploadedFile.urls.view, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Ver
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(uploadedFile.urls.download, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Descargar
                  </Button>
                  {uploadedFile.urls.thumbnail && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(uploadedFile.urls.thumbnail, '_blank')}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Thumbnail
                    </Button>
                  )}
                </div>

                {uploadedFile.urls.thumbnail && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Vista previa:</p>
                    <img
                      src={uploadedFile.urls.thumbnail}
                      alt="Thumbnail"
                      className="max-w-xs rounded border"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Card */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm text-red-900">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instrucciones</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>1. Selecciona un archivo arrastrándolo o haciendo clic en el área de carga</p>
            <p>2. Verifica que el archivo cumpla con los requisitos (tipo y tamaño)</p>
            <p>3. Haz clic en "Subir Archivo" para comenzar la carga</p>
            <p>4. Una vez completado, podrás ver, descargar o ver el thumbnail del archivo</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
