import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { LogOut, Upload, Edit3 } from 'lucide-react';
import { uploadImage } from '../services/contService';
import { jwtDecode } from "jwt-decode";

export default function UploadImage() {
  const { token } = useAuth();
  const { logout, getUser } = useAuth();
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const userData = getUser ? getUser() : { name: 'User' };
    setUser(userData);
  }, [getUser]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handlePublish = async () => {
    if (!file) {
      alert('No has seleccionado ningún archivo.');
      return;
    }
    const decoded = jwtDecode(token);
    const userId = decoded.userId;

    try {
      const response = await uploadImage(file, userId);
      alert('Imagen subida correctamente');
      console.log('Respuesta del backend:', response);
    } catch (error) {
      console.error('Error al subir la imagen:', error);
      alert('Error al subir la imagen');
    }
  };

  const handleSelectFile = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <aside className="fixed left-0 top-0 h-full w-20 backdrop-blur-xl bg-black/20 border-r border-white/10 flex flex-col items-center py-6 space-y-6 z-50">
        <button
          onClick={() => navigate('/profile')}
          className="group relative flex flex-col items-center space-y-2 p-3 rounded-2xl hover:bg-white/10 transition-all duration-300"
        >
          <div className="relative">
            <img
              src={user?.profilePic || 'https://img.redbull.com/images/c_crop,x_1217,y_0,h_3648,w_2736/c_fill,w_450,h_600/q_auto:low,f_auto/redbullcom/2019/06/28/9c614447-6134-40a3-b46b-e4284a575c61/nick'}
              alt="Profile"
              className="w-12 h-12 rounded-full object-cover border-2 border-white/20 group-hover:border-blue-400/50 transition-all duration-300"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900" />
          </div>
          <Edit3 className="w-3 h-3 text-white/60 group-hover:text-blue-400" />
        </button>

        <button
          onClick={() => navigate('/home')}
          className="group flex flex-col items-center space-y-2 p-3 rounded-2xl hover:bg-white/10 transition-all duration-300"
        >
          <svg className="w-6 h-6 text-white/60 group-hover:text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M3 12h18M3 17h18" />
          </svg>
          <span className="text-xs text-white/60 group-hover:text-white/90">Galería</span>
        </button>

        <button
          className="group relative flex flex-col items-center space-y-2 p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500"
        >
          <Upload className="w-6 h-6 text-white" />
          <span className="text-xs text-white font-medium">Subir</span>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 blur opacity-50 -z-10" />
        </button>

        <div className="flex-1" />

        <button
          onClick={logout}
          className="group flex flex-col items-center space-y-2 p-3 rounded-2xl hover:bg-red-500/20 border border-transparent hover:border-red-400/30 transition-all duration-300"
        >
          <LogOut className="w-6 h-6 text-white/60 group-hover:text-red-400" />
        </button>
      </aside>

      <div className="flex-1 ml-20">
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/20 border-b border-white/10 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent">
              Subir Imagen
            </h1>
            <button
              onClick={handlePublish}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105"
            >
              Publicar
            </button>
          </div>
        </header>

        <main className="p-6">
          {!file ? (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8">
              <div
                className="border-2 border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-blue-400/50 transition-colors duration-300"
                onClick={handleSelectFile}
              >
                <Upload className="w-12 h-12 text-white/40 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Arrastra y suelta tu imagen aquí
                </h3>
                <p className="text-white/60 mb-4">
                  o haz clic para seleccionar
                </p>
                <p className="text-sm text-white/40">
                  Se recomienda usar archivos .jpg de alta calidad menores de 5 MB
                </p>
                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-[400px] object-cover rounded-xl"
                />
              </div>

              <div className="space-y-4">
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                  <input
                    type="text"
                    placeholder="Título de la imagen"
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all duration-300"
                  />

                  <textarea
                    placeholder="Descripción detallada"
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all duration-300"
                  />

                  <input
                    type="text"
                    placeholder="Añade etiquetas separadas por comas"
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all duration-300"
                  />

                  <button
                    onClick={() => setFile(null)}
                    className="w-full py-3 rounded-xl border border-red-400/30 text-red-400 hover:bg-red-400/20 transition-all duration-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
