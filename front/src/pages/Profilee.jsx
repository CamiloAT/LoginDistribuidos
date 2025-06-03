import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import {
  LogOut,
  Upload,
  Edit3,
} from 'lucide-react';
import { getAllImages } from '../services/contService';
import { jwtDecode } from "jwt-decode";

import ImageCard from '../components/ImageCard';

export default function Profile() {
  const { logout, getUser } = useAuth();
  const [user, setUser] = useState(null);
  const [userImages, setUserImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { token } = useAuth();

  // Get user ID from token
  const decoded = token ? jwtDecode(token) : { userId: null };
  const userId = decoded.userId;

  // States for profile editing
  const [profilePic, setProfilePic] = useState('');
  const [phone, setPhone] = useState('');

  // Fetch user data
  useEffect(() => {
    const userData = getUser ? getUser() : { name: 'User' };
    setUser(userData);
  }, [getUser]);

  // Fetch user's images
  useEffect(() => {
    const fetchUserImages = async () => {
      try {
        setLoading(true);
        // Get all images first
        const allImages = await getAllImages();

        // Filter images to show only this user's images
        const filteredImages = allImages.filter(image => image.user_id === userId);

        setUserImages(filteredImages);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user images:', err);
        setError('Failed to load your images. Please try again later.');
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserImages();
    }
  }, [userId]);

  const handleSaveProfile = () => {
    alert(`Perfil actualizado:\nFoto: ${profilePic}\nTeléfono: ${phone}`);
  };

  console.log(userImages)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Modern sidebar */}
      <aside className="fixed left-0 top-0 h-full w-20 backdrop-blur-xl bg-black/20 border-r border-white/10 flex flex-col items-center py-6 space-y-6 z-50">
        <button className="group relative flex flex-col items-center space-y-2 p-3 rounded-2xl bg-blue-500/20 border border-blue-400/30">
          <div className="relative">
            <img
              src={user?.profilePic || 'https://img.redbull.com/images/c_crop,x_1217,y_0,h_3648,w_2736/c_fill,w_450,h_600/q_auto:low,f_auto/redbullcom/2019/06/28/9c614447-6134-40a3-b46b-e4284a575c61/nick'}
              alt="Profile"
              className="w-12 h-12 rounded-full object-cover border-2 border-blue-400/50"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900" />
          </div>
          <Edit3 className="w-3 h-3 text-blue-400" />
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
          onClick={() => navigate('/uploadImage')}
          className="group relative flex flex-col items-center space-y-2 p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105"
        >
          <Upload className="w-6 h-6 text-white" />
          <span className="text-xs text-white font-medium">Subir</span>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 blur opacity-50 group-hover:opacity-75 transition-opacity duration-300 -z-10" />
        </button>

        <div className="flex-1" />

        <button
          onClick={logout}
          className="group flex flex-col items-center space-y-2 p-3 rounded-2xl hover:bg-red-500/20 border border-transparent hover:border-red-400/30 transition-all duration-300"
        >
          <LogOut className="w-6 h-6 text-white/60 group-hover:text-red-400 transition-colors duration-300" />
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-20">
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/20 border-b border-white/10 p-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent">
            Perfil
          </h1>
        </header>

        <main className="p-6 space-y-6">
          {/* User Info Card */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Bienvenido, <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{user?.name || 'User'}</span>
            </h2>
            <p className="text-white/60">Gestiona tu perfil y visualiza tus imágenes</p>
          </div>

          {/* Profile Settings */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Foto de perfil</h3>
              <input
                type="text"
                placeholder="URL de tu nueva foto de perfil"
                value={profilePic}
                onChange={(e) => setProfilePic(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all duration-300"
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Teléfono</h3>
              <input
                type="text"
                placeholder="+57 300 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all duration-300"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 transform hover:-translate-y-0.5"
            >
              Guardar cambios
            </button>
          </div>

          {/* User Images Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading ? (
              <div className="text-white/60">Cargando imágenes...</div>
            ) : error ? (
              <div className="text-red-400">{error}</div>
            ) : userImages.length === 0 ? (
              <div className="text-white/60">No hay imágenes para mostrar</div>
            ) : (
              userImages.map((img) => (
                <ImageCard key={img.id} image={img} />
              ))
            )}
          </div>

          {/* Additional Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Información de sesión</h3>
              <div className="text-white/60 space-y-2">
                <p>Tu sesión está segura y protegida</p>
                <p>Último acceso: {new Date().toLocaleString()}</p>
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">¿Necesitas ayuda?</h3>
              <p className="text-white/60 mb-4">Si necesitas asistencia, contacta a nuestro equipo de soporte.</p>
              <a
                href="#"
                className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors duration-300"
              >
                Contactar Soporte
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
