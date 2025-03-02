// client/src/pages/NotFound.js
import React from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const NotFound = () => {
	const { isAuthenticated } = useAuthStore();

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-100">
			<div className="max-w-lg w-full p-8 bg-white rounded-xl shadow-lg text-center">
				<h1 className="text-9xl font-bold text-indigo-600">404</h1>
				<h2 className="text-3xl font-semibold text-gray-800 mt-4">
					Página não encontrada
				</h2>
				<p className="text-gray-600 mt-2">
					A página que você está procurando não existe ou foi movida.
				</p>
				<div className="mt-8">
					<Link
						to={isAuthenticated ? "/chat" : "/login"}
						className="inline-block px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
					>
						{isAuthenticated
							? "Voltar para o Chat"
							: "Ir para Login"}
					</Link>
				</div>
			</div>
		</div>
	);
};

export default NotFound;
