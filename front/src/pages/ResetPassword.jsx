import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const handleResetPassword = async (e) => {
        e.preventDefault();
        try {
            const response = await api(`auth/reset-password/${token}`, {
                method: "POST",
                body: JSON.stringify({password})
            })
            setMessage(response.message);
            setTimeout(() => navigate("/login"), 5173);
        } catch (error) {
            setMessage("Error al restablecer la contraseña. Intente nuevamente.");
            console.error(error)
        }
    };

    return (
        <div>
            <h2>Restablecer Contraseña</h2>
            <form onSubmit={handleResetPassword}>
                <input
                    type="password"
                    placeholder="Nueva contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit">Actualizar Contraseña</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};

export default ResetPassword;
