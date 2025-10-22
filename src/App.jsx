import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/public/LoginPage";
import RoleRedirect from "./pages/public/RoleRedirect";
import SetPassword from "./components/auth/SetPassword";
import ResetPassword from "./components/auth/ResetPasswordModal";
import ValidateQRPage from "./pages/public/ValidateQRPage";


import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Usuarios from "./pages/admin/Usuarios";
import Padres from "./pages/admin/Padres";
import Personal from "./pages/admin/Personal";
import Niños from "./pages/admin/Ninos";
import Atutor from "./pages/admin/Asignar_Tutores";
import Scanner from "./pages/admin/ScannerQR";
import Historial from "./pages/admin/Historial";

import PadreLayout from "./layouts/PadresLayout";
import PadreHome from "./pages/padres/PadreHome";
import ParentQrScreen from "./pages/padres/QrPage";
import HistorialPadre from "./pages/padres/Historial";
import Autorizaciones from "./pages/padres/AutorizarTeceros";



function App() {
  return (
    <Router>
      <Routes>
        {/* Pagina de Login */}
        <Route path="/login" element={ <LoginPage /> } />
        <Route path="/" element={ <Navigate to = "/login"/> } />
        <Route path="/set-password" element={ <SetPassword /> } />
        <Route path="/reset" element={ <ResetPassword /> } />
        <Route path="/validate/:token" element={<ValidateQRPage />} />

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
        <Route path="/padres" element={ <PadreLayout /> }>
            {/* Rutas hijas de Padres */}
            <Route index element={<Navigate to="home" replace />}/>
            <Route path="home" element={ <PadreHome /> } />
            <Route path="qrpage" element={ <ParentQrScreen /> }/>
            <Route path="historial" element={ <HistorialPadre /> }/>
            <Route path="autorizacion" element={ <Autorizaciones /> }/>
        </Route>


      </Routes>
    </Router>
  );
}

export default App
