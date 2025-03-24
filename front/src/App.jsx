import { Route, Routes, Navigate } from "react-router-dom";
import useAuth from "./hooks/useAuth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profilee";
import UploadImage from './pages/UploadImage';


const App = () => {
  const { isAuthenticated, loading, getRoles } = useAuth();

  if (loading) return <p>Loading...</p>;

  const isAdmin = getRoles().some((role) => (role.name || role) === "admin");

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/home" /> : <Login />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/home" /> : <Register />}
      />
      <Route
        path="/home"
        element={isAuthenticated ? <Home /> : <Navigate to="/login" />}
      />

  
      <Route
        path="/profile"
        element={isAuthenticated ? <Profile /> : <Navigate to="/login" />}
      />
      
      <Route
        path="/uploadImage"
       element={isAuthenticated ? <UploadImage /> : <Navigate to="/login" />}
/>

      <Route
        path="/admin"
        element={
          isAuthenticated && isAdmin ? <Admin /> : <Navigate to="/home" />
        }
      />
      <Route
        path="/reset-password/:token"
        element={<ResetPassword />}
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
