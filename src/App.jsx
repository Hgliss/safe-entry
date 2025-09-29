import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/public/LoginPage";
import RoleRedirect from "./pages/public/RoleRedirect";
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        {/* 🔹 Pagina de Login */}
        <Route path="/login" element={ <LoginPage /> } />
      </Routes>
    </Router>
  );
}

export default App
