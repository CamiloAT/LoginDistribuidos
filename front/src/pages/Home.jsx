import { useState, useEffect } from 'react'; 
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import {
  Search,
  LogOut,
  Upload,
  Edit3
} from 'lucide-react';
import { getAllImages } from '../services/contService';

import ImageCard from '../components/ImageCard';

export default function Home() {
  const { logout, getUser } = useAuth();
  const [user, setUser] = useState(null);
  const [images, setImages] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = getUser ? getUser() : { name: 'User' };
    setUser(userData);
  }, [getUser]);

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

  console.log(images);

  // Array de imágenes de ejemplo
  // const images = [
  //   { id: 1, url: 'https://img.freepik.com/vector-gratis/cute-cool-boy-dabbing-pose-dibujos-animados-vector-icono-ilustracion-concepto-icono-moda-personas-aislado_138676-5680.jpg', title: 'Naturaleza' },
  //   { id: 2, url: 'https://img.freepik.com/vector-gratis/lindo-robot-unicornio-ciborg-icono-vectorial-dibujos-animados-ilustracion-icono-tecnologia-animal-aislado-plano_138676-12176.jpg', title: 'Ciudad' },
  //   { id: 3, url: 'https://img.freepik.com/vector-gratis/triceratop-lindo-vista-delantera-trasera-icono-vectorial-dibujos-animados-ilustracion-naturaleza-animal-plano_138676-14233.jpg', title: 'Tecnología' },
  //   { id: 4, url: 'https://img.freepik.com/vector-gratis/animales-lindos-blanco_1308-35096.jpg', title: 'Viajes' },
  //   { id: 5, url: 'https://media.vogue.mx/photos/60e49f2d3a0166093ab3cabc/2:3/w_2560%2Cc_limit/nicki-nicole.jpg', title: 'Comida' },
  //   { id: 6, url: 'https://img.redbull.com/images/c_crop,x_1217,y_0,h_3648,w_2736/c_fill,w_450,h_600/q_auto:low,f_auto/redbullcom/2019/06/28/9c614447-6134-40a3-b46b-e4284a575c61/nick', title: 'Comida' },
  //   { id: 7, url: 'https://tn.com.ar/resizer/v2/nicki-nicole-subio-una-publicacion-y-recibio-un-comentario-que-enloquecio-a-sus-fans-foto-instagramnickinicole-27KEKLXAKFH2BFRQ6MWC4SQFKM.jpg?auth=cb83959906f24de38566ce18ab30efe4c6483569ee818815b625c02d578ec129&width=767', title: 'Comida' },
  //   { id: 8, url: 'https://czcomunicacion.com/images/CZ/Contenidos/Noticias/NICKI_NICOLE/NAIKI_128.jpg', title: 'Comida' },
  //   { id: 9, url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRMKESHPA_xjyJIU2e5Q10TW9Dmf2XXxyHyTg&s', title: 'Comida' },
  //   { id: 10, url: 'https://www.redaccion.com.ar/wp-content/uploads/2023/05/NICKI.jpg', title: 'Comida' }
  // ];



  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Barra lateral fija */}
      <aside className="fixed left-0 top-0 h-full w-16 sm:w-20 bg-white shadow-md flex flex-col items-center py-4 space-y-4">
        {/* Botón de perfil: navega a /profile */}
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

        {/* Botón Galería: redirige a Home */}
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

        {/* Botón Subir: ubicado justo debajo del botón de perfil */}
        <button
          onClick={() => navigate('/uploadImage')}
          className="bg-indigo-600 text-white px-2 py-1 rounded flex items-center space-x-1 hover:bg-indigo-700"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Subir</span>
        </button>
      </aside>

      {/* Contenedor principal con margen izquierdo igual al ancho del aside */}
      <div className="flex-1 flex flex-col ml-16 sm:ml-20">
        {/* Encabezado sticky */}
        <header className="bg-white shadow sticky top-0 z-50 p-4 flex items-center">
          <h1 className="text-xl font-bold text-gray-900 mr-4">Galería</h1>
          {/* Recuadro de búsqueda y filtro */}
          <div className="flex flex-1 items-center">
            <div className="flex items-center bg-gray-200 hover:bg-gray-300 transition-colors rounded flex-1 mr-4">
              <Search className="w-5 h-5 text-gray-500 ml-3" />
              <input
                type="text"
                placeholder="Buscar..."
                className="flex-1 bg-transparent border-0 px-2 py-2 outline-none"
              />
            </div>
            <div>
              <input
                type="date"
                className="border rounded px-2 py-2 bg-gray-200 hover:bg-gray-300 transition-colors outline-none"
              />
            </div>
          </div>
          {/* Botón de Logout */}
          <button
            onClick={logout}
            className="ml-4 flex items-center space-x-1 text-red-500 hover:text-red-600"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        {/* Contenido principal: Galería */}
        <main className="flex-1 p-6">
          <div className="mb-4">
            <p className="text-gray-700">
              Bienvenido, <strong>{user?.name || 'User'}</strong>
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img) => (
              <ImageCard key={img.id} image={img} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}



