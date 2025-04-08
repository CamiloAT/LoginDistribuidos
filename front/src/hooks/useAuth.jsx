import { useState, useEffect, useCallback } from "react";
import useLocalStorage from "./useLocalStorage";
import { jwtDecode } from "jwt-decode";

const useAuth = () => {
    const [token, setToken, removeToken] = useLocalStorage("token", null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        removeToken();
        setIsAuthenticated(false);
        window.location.reload();
    }, [removeToken]);

    const validateToken = useCallback(async () => {
        if (!token) {
            setIsAuthenticated(false);
            setLoading(false);
            return;
        }

        try {
            const decoded = jwtDecode(token);
            const currentTime = Date.now() / 1000;

            if (decoded.exp < currentTime) {
                console.warn("Token expired");
                logout();
                return;
            }

            setIsAuthenticated(true);
        } catch (error) {
            console.error("Error validating token", error);
            logout();
        } finally {
            setLoading(false);
        }
    }, [token, logout]);

    const getRoles = () => {
        if (token) {
            const decoded = jwtDecode(token);
            return decoded.roles || [];
        }
        return [];
    }

    const getEmail = () => {
        if (token) {
            try {
                const decoded = jwtDecode(token);
                return decoded.email || '';
            } catch (error) {
                console.error("Error decoding token for email", error);
                return '';
            }
        }
        return '';
    };

    useEffect(() => {
        validateToken();
    }, [validateToken]);

    return { token, isAuthenticated, loading, logout, setToken, getRoles, getEmail };
};

export default useAuth;
