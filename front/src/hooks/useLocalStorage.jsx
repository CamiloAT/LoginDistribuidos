import { useState } from "react";

const useLocalStorage = (key, initialValue) => {
    // Estado para almacenar el valor
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = localStorage.getItem(key);
            if(item === "undefined") {
                localStorage.removeItem(key);
                return initialValue;
            }
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error("Error reading localStorage", error);
            return initialValue;
        }
    });

    // Función para actualizar el valor en localStorage
    const setValue = (value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error("Error setting localStorage", error);
        }
    };

    // Función para eliminar el valor del localStorage
    const removeValue = () => {
        try {
            localStorage.removeItem(key);
            setStoredValue(null);
        } catch (error) {
            console.error("Error removing localStorage", error);
        }
    };

    return [storedValue, setValue, removeValue];
};

export default useLocalStorage;
