import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/public/LoginPage";
import RoleRedirect from "./pages/public/RoleRedirect";
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        {/* 🔹 Pagina de Login */}
        <Route path="/login" element={ <LoginPage /> } />
        <Route path="/" element={ <Navigate to = "/login"/> } />
        <Route path="/role-redirect" element={ <RoleRedirect /> } />
      </Routes>
    </Router>
  );
}

export default App
