// client/src/pages/AuthCallback.js
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import Loader from "../components/common/Loader";

const AuthCallback = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const { isAuthenticated, checkAuth } = useAuthStore();
	const [error, setError] = useState(null);
	const [isProcessing, setIsProcessing] = useState(true);

	useEffect(() => {
		const processAuth = async () => {
			try {
				// Extrai token do URL
				const queryParams = new URLSearchParams(location.search);
				const token = queryParams.get("token");

				if (!token) {
					console.error("Token não encontrado no callback");
					setError("Token não encontrado no callback");
					setIsProcessing(false);
					return;
				}

				console.log("Token recebido, armazenando...");

				// Armazena token no localStorage
				localStorage.setItem("token", token);

				// Configura o token no header antes de checar autenticação
				if (token) {
					console.log(
						"Configurando token no header de autorização..."
					);
				}

				// Verifica autenticação com o token
				const isAuth = await checkAuth();

				if (isAuth) {
					console.log("Autenticação bem-sucedida, redirecionando...");
					navigate("/chat");
				} else {
					console.error("Falha na autenticação, token inválido");
					setError("Falha na autenticação, token inválido");
				}
			} catch (error) {
				console.error("Erro no processo de autenticação:", error);
				setError("Ocorreu um erro durante o processo de autenticação");
			} finally {
				setIsProcessing(false);
			}
		};

		// Só processa uma vez
		if (isProcessing) {
			processAuth();
		}
	}, [navigate, location.search, checkAuth, isProcessing]);

	useEffect(() => {
		if (isAuthenticated && !isProcessing) {
			navigate("/chat");
		}
	}, [isAuthenticated, navigate, isProcessing]);

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-100">
				<div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
					<div className="text-center mb-6">
						<div className="bg-red-100 text-red-800 p-4 rounded-md mb-4">
							<h2 className="text-lg font-semibold mb-1">
								Erro de autenticação
							</h2>
							<p className="text-sm">{error}</p>
						</div>
						<button
							onClick={() => navigate("/login")}
							className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
						>
							Voltar para login
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
			<Loader fullScreen message="Autenticando com Google..." />
		</div>
	);
};

export default AuthCallback;
