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
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar navigation */}
      <aside className="fixed left-0 top-0 h-full w-16 sm:w-20 bg-white shadow-md flex flex-col items-center py-4 space-y-4">
        {/* Botón de perfil (ya estamos en /profile) */}
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

        {/* Botón Subir: justo debajo del perfil */}
        <button
          onClick={() => navigate('/uploadImage')}
          className="bg-indigo-600 text-white px-2 py-1 rounded flex items-center space-x-1 hover:bg-indigo-700"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Subir</span>
        </button>
      </aside>

      {/* Contenedor principal con margen izquierdo */}
      <div className="flex-1 flex flex-col ml-16 sm:ml-20">
        {/* Encabezado fijo */}
        <header className="bg-white shadow sticky top-0 z-50 p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Perfil</h1>
          <button
            onClick={logout}
            className="flex items-center space-x-1 text-red-500 hover:text-red-600"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        {/* Contenido principal */}
        <main className="flex-1 p-6 space-y-6">
          <div className="bg-white overflow-hidden shadow rounded-lg p-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Welcome, {user?.name || 'User'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Thank you for using our distributed authentication system.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {userImages.map((img) => (
              <ImageCard key={img.id} image={img} />
            ))}
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Cambiar foto de perfil
            </h3>
            <input
              type="text"
              placeholder="URL de tu nueva foto de perfil"
              value={profilePic}
              onChange={(e) => setProfilePic(e.target.value)}
              className="w-full mb-4 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Número de teléfono
            </h3>
            <input
              type="text"
              placeholder="+57 300 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full mb-4 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <button
              onClick={handleSaveProfile}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              Guardar cambios
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="bg-white overflow-hidden shadow rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900">
                Session Information
              </h3>
              <div className="mt-3 text-sm text-gray-500">
                <p>Your session is secure and protected.</p>
                <p className="mt-2">Last login: {new Date().toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900">Need Help?</h3>
              <div className="mt-3 text-sm text-gray-500">
                <p>If you need assistance, please contact our support team.</p>
                <a
                  href="#"
                  className="mt-3 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Contact Support
                  <svg className="ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
