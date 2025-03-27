const base_api = "http://localhost:3000/api";

export default async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");

  // Verifica si el body es un FormData
  const isFormData = options.body instanceof FormData;

  // Construye los headers condicionalmente
  let headers = { ...options.headers };
  if (!isFormData) {
    // Si NO es FormData, forzamos application/json
    headers = {
      "Content-Type": "application/json",
      ...headers,
    };
  }

  // Agrega el token, si existe
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Llamada fetch
  const response = await fetch(`${base_api}/${endpoint}`, {
    ...options,
    headers,
  });

  // Intenta parsear la respuesta como JSON
  let data;
  try {
    data = await response.json();
  } catch (err) {
    // Si la respuesta no es JSON (p.ej. error HTML), data quedará en null
    console.log(err)
    data = null;
  }

  // Manejo de error si el response no es OK
  if (!response.ok) {
    // Lanza el mensaje del servidor o un mensaje por defecto
    throw data?.message || `Error in ${endpoint}`;
  }

  return data;
};
