import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import {
  Search,
  LogOut,
  Upload,
  Edit3,
  Grid3X3
} from 'lucide-react';
import { getAllImages } from '../services/contService';

import ImageCard from '../components/ImageCard';

export default function Home() {
  const { logout, getEmail } = useAuth();
  const [user, setUser] = useState(null);
  const [images, setImages] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = getEmail ? getEmail() : { name: 'User' };
    setUser(userData);
  }, [getEmail]);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const getImages = await getAllImages();
        setImages(getImages);
      } catch (err) {
        console.error(err);
      }
    }

    fetchImages();

  }, [])

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
          <Edit3 className="w-3 h-3 text-white/60 group-hover:text-blue-400 transition-colors duration-300" />
        </button>

        <div className="w-8 h-px bg-white/10" />

        <button
          onClick={() => navigate('/home')}
          className="group flex flex-col items-center space-y-2 p-3 rounded-2xl bg-blue-500/20 border border-blue-400/30 hover:bg-blue-500/30 transition-all duration-300"
        >
          <Grid3X3 className="w-6 h-6 text-blue-400" />
          <span className="text-xs text-blue-400 font-medium">Galería</span>
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

      {/* Main container */}
      <div className="flex-1 ml-20">
        {/* Modern header */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/20 border-b border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent">
                Galería
              </h1>
              <div className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30">
                <span className="text-blue-400 text-sm font-medium">{images.length} imágenes</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Buscar imágenes..."
                  className="pl-10 pr-4 py-3 w-64 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all duration-300"
                />
              </div>

              <input
                type="date"
                className="px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all duration-300"
              />
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Bienvenido de vuelta, <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{user?.username || 'User'}</span>
            </h2>
            <p className="text-white/60">Explora tu colección de imágenes increíbles</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.map((img) => (
              <ImageCard key={img.id} image={img} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}



