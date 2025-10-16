import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/public/LoginPage";
import RoleRedirect from "./pages/public/RoleRedirect";
import SetPassword from "./components/auth/SetPassword";
import ResetPassword from "./components/auth/ResetPasswordModal";


import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Usuarios from "./pages/admin/Usuarios";
import Padres from "./pages/admin/Padres";
import Personal from "./pages/admin/Personal";
import Niños from "./pages/admin/Ninos";
import Atutor from "./pages/admin/Asignar_Tutores";
import Scanner from "./pages/admin/ScannerQR";
import Historial from "./pages/admin/Historial";


import PadreHome from "./pages/padres/PadreHome";



function App() {
  return (
    <Router>
      <Routes>
        {/* Pagina de Login */}
        <Route path="/login" element={ <LoginPage /> } />
        <Route path="/" element={ <Navigate to = "/login"/> } />
        <Route path="/set-password" element={ <SetPassword /> } />
        <Route path="/reset" element={ <ResetPassword /> } />

        {/* Redirecciones de Roles */}
        <Route path="/role-redirect" element={ <RoleRedirect /> } />
        
        
        
        {/* Admin con Layout fijo*/}
        <Route path="/admin" element={ <AdminLayout /> }>
            {/* Rutas hijas de Admin */}
            <Route index element={<Navigate to="dashboard"/>}/>
            <Route path="dashboard" element={ <Dashboard /> } />
            <Route path="usuarios" element={ <Usuarios /> } />
            <Route path="padres" element={ <Padres /> } />
            <Route path="personal" element={ <Personal /> } />
            <Route path="ninos" element={ <Niños /> } />
            <Route path="atutor/:id" element={ <Atutor /> } />
            <Route path="scanner" element={ <Scanner /> } />
            <Route path="historial" element={ <Historial /> } />
        </Route>

        {/* Padres con Layout fijo*/}
        <Route path="/padres_tutor" element={ <PadreHome /> }>
            
            
        </Route>


      </Routes>
    </Router>
  );
}

export default App
