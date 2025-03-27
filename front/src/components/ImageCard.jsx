import { useState } from 'react';
import { deleteImage } from '../services/contService';
import {  
    Download,
    ExternalLink,
    Trash2,} from 'lucide-react'

function ImageCard({ image }) {
    const [hover, setHover] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);
  
    const handleGuardar = () => {
      // Crea un nuevo elemento imagen
      const img = new Image();
      // Importante: Permitir solicitudes CORS
      img.crossOrigin = "anonymous";
      img.src = image.path;
    
      img.onload = () => {
        // Crea un canvas con el tamaño de la imagen
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        // Dibuja la imagen en el canvas
        ctx.drawImage(img, 0, 0);
    
        // Convierte el canvas a Blob y luego crea un URL para descargar
        canvas.toBlob((blob) => {
          if (!blob) {
            console.error("No se pudo crear el blob");
            return;
          }
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = image.id_image || "download";
          // Forzamos el click para descargar
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          // Revocar el objeto URL para liberar recursos
          URL.revokeObjectURL(blobUrl);
        }, "image/jpeg", 0.95); // Puedes ajustar el tipo y calidad según la imagen
      };
    
      img.onerror = (error) => {
        console.error("Error al cargar la imagen:", error);
      };
    };
  
    const handleAbrir = () => {
      // Activa el modal de zoom
      setIsZoomed(true);
    };
  
    const handleEliminar = async () => {
      if (!window.confirm('¿Estás seguro de que deseas eliminar esta imagen?')) {
        return;
      }
  
      try {
        await deleteImage(image.image_id);
        alert('Imagen eliminada con éxito');
        // Recargar la página para mostrar la lista actualizada
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert('Error al eliminar la imagen');
      }
    };
  
    return (
      <>
        <div
          className="relative group cursor-pointer"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <img
            src={image.path}
            alt="imagen cualquiera"
            className="w-full h-52 object-cover rounded-lg shadow"
          />
          {hover && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center space-x-3 rounded-lg">
              <button
                onClick={handleGuardar}
                className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600"
              >
                <Download className="inline-block w-5 h-5 mr-1" /> Descargar
              </button>
              <button
                onClick={handleAbrir}
                className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600"
              >
                <ExternalLink className="inline-block w-5 h-5 mr-1" /> Abrir
              </button>
              <button
                onClick={handleEliminar}
                className="bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700"
              >
                <Trash2 className="inline-block w-5 h-5 mr-1" /> Eliminar
              </button>
            </div>
          )}
        </div>
  
        {/* Modal de zoom */}
        {isZoomed && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            onClick={() => setIsZoomed(false)} // Cierra el modal al hacer clic fuera
          >
            <img
              src={image.path}
              alt="imagen cualquiera"
              className="max-w-full max-h-full object-contain rounded shadow-lg"
            />
          </div>
        )}
      </>
    );
  }

  export default ImageCard;