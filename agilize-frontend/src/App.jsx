import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DemandaFormPage from './pages/DemandaFormPage';
import DemandaDetailPage from './pages/DemandaDetailPage';
import NotificacoesPage from './pages/NotificacoesPage';
import FluxoPage from './pages/FluxoPage';
import ValidacaoPage from './pages/ValidacaoPage';
import InventarioPage from './pages/InventarioPage';
import AdminPage from './pages/AdminPage';
import RelatoriosPage from './pages/RelatoriosPage';
import AvaliacaoSTIPage from './pages/AvaliacaoSTIPage';
import AvaliacaoAvaliadorPage from './pages/AvaliacaoAvaliadorPage';
import AvaliacaoDPOPage from './pages/AvaliacaoDPOPage';
import ProcessMapPage from './pages/ProcessMapPage';
import './styles/globals.css';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

function Protegido({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<Protegido><DashboardPage /></Protegido>} />
        <Route path="/demanda/nova" element={<Protegido><DemandaFormPage /></Protegido>} />
        <Route path="/demanda/:id/editar" element={<Protegido><DemandaFormPage /></Protegido>} />
        <Route path="/demanda/:id" element={<Protegido><DemandaDetailPage /></Protegido>} />
        <Route path="/notificacoes" element={<Protegido><NotificacoesPage /></Protegido>} />
        <Route path="/fluxo" element={<Protegido><FluxoPage /></Protegido>} />
        <Route path="/validacao" element={<Protegido><ValidacaoPage /></Protegido>} />
        <Route path="/inventario" element={<Protegido><InventarioPage /></Protegido>} />
        <Route path="/admin" element={<Protegido><AdminPage /></Protegido>} />
        <Route path="/relatorios" element={<Protegido><RelatoriosPage /></Protegido>} />
        <Route path="/avaliacao/:id" element={<Protegido><AvaliacaoSTIPage /></Protegido>} />
        <Route path="/avaliacao-avaliador/:id" element={<Protegido><AvaliacaoAvaliadorPage /></Protegido>} />
        <Route path="/avaliacao-dpo/:id" element={<Protegido><AvaliacaoDPOPage /></Protegido>} />
        <Route path="/mapa-processo" element={<Protegido><ProcessMapPage /></Protegido>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
