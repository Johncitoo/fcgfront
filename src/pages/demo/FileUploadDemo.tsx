export default function FileUploadDemo() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎉 Demo de File Upload
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            ¡La página funciona correctamente!
          </p>
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <p className="font-bold">✅ Sistema de Storage Operativo</p>
            <p className="text-sm mt-2">
              La ruta /admin/demo/files está funcionando. La funcionalidad completa 
              de drag & drop se habilitará en el próximo deployment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
