import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { LogOut, Upload, Edit3 } from 'lucide-react';
import { uploadImage } from '../services/contService';
import {jwtDecode} from "jwt-decode";

export default function UploadImage() {
  const { token } = useAuth();
  const { logout, getUser } = useAuth();
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Estados para manejar el archivo seleccionado y su vista previa
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  // Referencia para el input de archivo
  const fileInputRef = useRef(null);

  useEffect(() => {
    const userData = getUser ? getUser() : { name: 'User' };
    setUser(userData);
  }, [getUser]);

  // Maneja el evento de selección de archivo
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  // Simula la publicación
  const handlePublish = async () => {
    if (!file) {
      alert('No has seleccionado ningún archivo.');
      return;
    }
    const decoded = jwtDecode(token);
    const userId = decoded.userId;

    console.log(file)

    try {
      const response = await uploadImage(file, userId);
      alert('Imagen subida correctamente');
      // Aquí puedes agregar lógica adicional, como redirigir o actualizar el estado global
      console.log('Respuesta del backend:', response);
    } catch (error) {
      console.error('Error al subir la imagen:', error);
      alert('Error al subir la imagen');
    }
  };

  // Botón para abrir el cuadro de diálogo de archivos
  const handleSelectFile = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Barra lateral fija */}
      <aside className="fixed left-0 top-0 h-full w-16 sm:w-20 bg-white shadow-md flex flex-col items-center py-4 space-y-4">
        {/* Botón de perfil */}
        <button
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center space-y-1"
        >
          <img
            src={user?.profilePic || 'https://img.redbull.com/images/c_crop,x_1217,y_0,h_3648,w_2736/c_fill,w_450,h_600/q_auto:low,f_auto/redbullcom/2019/06/28/9c614447-6134-40a3-b46b-e4284a575c61/nick'}
            alt="Profile"
            className="w-12 h-12 rounded-full object-cover border border-gray-200"
          />
          <Edit3 className="w-4 h-4 text-gray-500" />
        </button>

        {/* Botón Galería: navega a Home */}
        <button
          onClick={() => navigate('/home')}
          className="flex flex-col items-center space-y-1"
        >
          <svg
            className="w-6 h-6 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M3 12h18M3 17h18"></path>
          </svg>
          <span className="text-xs text-gray-600">Galería</span>
        </button>

        {/* Botón Subir (podrías dejarlo inactivo si ya estás en esta misma página) */}
        <button
          onClick={() => navigate('/upload-image')}
          className="bg-indigo-600 text-white px-2 py-1 rounded flex items-center space-x-1 hover:bg-indigo-700"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Subir</span>
        </button>
      </aside>

      {/* Contenedor principal con margen para la barra lateral */}
      <div className="flex-1 flex flex-col ml-16 sm:ml-20">
        {/* Encabezado sticky */}
        <header className="bg-white sticky top-0 z-50 p-4 flex items-center justify-between shadow">
          <h1 className="text-xl font-bold text-gray-900">Upload Image</h1>
          <button
            onClick={handlePublish}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Publish
          </button>
        </header>

        {/* Contenido principal */}
        <main className="flex-1 p-6">
          {/* Si no hay archivo seleccionado, se muestra la primera vista */}
          {!file && (
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              {/* Zona de drag & drop / selección de archivo */}
              <div className="w-full md:w-1/2 h-96 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-600 p-4">
                <p className="mb-2 font-semibold">
                  Elige un archivo o arrástralo y suéltalo aquí
                </p>
                <p className="text-sm text-gray-500">
                  Se recomienda usar archivos .jpg de alta calidad menores de 20 MB<br/>
                  o archivos .mp4 que tengan menos de 20 MB.
                </p>
                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <button
                  onClick={handleSelectFile}
                  className="mt-4 px-4 py-2 border border-gray-300 rounded hover:bg-gray-200"
                >
                  Seleccionar archivo
                </button>
              </div>

              {/* Opcionalmente, un texto explicativo al costado */}
              <div className="w-full md:w-1/2">
                {/* Ej: “Completa la información una vez elijas la imagen” */}
              </div>
            </div>
          )}

          {/* Si hay archivo seleccionado, se muestra la segunda vista */}
          {file && (
            <div className="flex flex-col md:flex-row gap-6">
              {/* Vista previa de la imagen o video */}
              <div className="w-full md:w-1/2 flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Vista previa"
                  className="max-w-full max-h-96 object-contain rounded shadow"
                />
              </div>

              {/* Formulario con campos */}
              <div className="w-full md:w-1/2 space-y-4">
                <input
                  type="text"
                  placeholder="Añade un título"
                  className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <textarea
                  placeholder="Añade una descripción detallada"
                  className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                />
                <input
                  type="text"
                  placeholder="Añade un enlace"
                  className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <select className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Selecciona un tablero</option>
                  <option value="tablero1">Tablero 1</option>
                  <option value="tablero2">Tablero 2</option>
                </select>
                <input
                  type="text"
                  placeholder="Busca una etiqueta"
                  className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
