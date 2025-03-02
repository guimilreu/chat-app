// client/src/App.js
import React, { useEffect } from "react";
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from "react-router-dom";
import { useAuthStore } from "./store/authStore";

// Páginas
import Login from "./pages/Login";
import Chat from "./pages/Chat";
import AuthCallback from "./pages/AuthCallback";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

// Componente para rotas protegidas
const ProtectedRoute = ({ children }) => {
	const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

	useEffect(() => {
		if (!isAuthenticated && !isLoading) {
			checkAuth();
		}
	}, [isAuthenticated, isLoading, checkAuth]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen">
				Verificando autenticação...
			</div>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" />;
	}

	return children;
};

function App() {
	return (
		<Router>
			<Routes>
				{/* Rota pública de login */}
				<Route path="/login" element={<Login />} />

				{/* Callback para autenticação OAuth */}
				<Route path="/auth/callback" element={<AuthCallback />} />

				{/* Rota protegida principal do chat */}
				<Route
					path="/"
					element={
						<ProtectedRoute>
							<Chat />
						</ProtectedRoute>
					}
				/>

				{/* Rota alternativa para chat */}
				<Route
					path="/chat"
					element={
						<ProtectedRoute>
							<Chat />
						</ProtectedRoute>
					}
				/>

				{/* Rota do perfil */}
				<Route
					path="/profile"
					element={
						<ProtectedRoute>
							<Profile />
						</ProtectedRoute>
					}
				/>

				{/* Página 404 */}
				<Route path="*" element={<NotFound />} />
			</Routes>
		</Router>
	);
}

export default App;
