// client/src/pages/Login.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { FcGoogle } from "react-icons/fc";
import { BsChatDotsFill } from "react-icons/bs";

const Login = () => {
	const navigate = useNavigate();
	const { isAuthenticated, login } = useAuthStore();

	React.useEffect(() => {
		if (isAuthenticated) {
			navigate("/chat");
		}
	}, [isAuthenticated, navigate]);

	const handleGoogleLogin = async () => {
		window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
			<div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-2xl">
				<div className="text-center">
					<BsChatDotsFill className="mx-auto h-14 w-14 text-indigo-600" />
					<h2 className="mt-6 text-3xl font-extrabold text-gray-900">
						ChatSync
					</h2>
					<p className="mt-2 text-sm text-gray-600">
						Um chat em tempo real com recursos avançados
					</p>
				</div>

				<div className="mt-8 space-y-6">
					<button
						onClick={handleGoogleLogin}
						className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md transition-all duration-200 ease-in-out"
					>
						<span className="absolute left-0 inset-y-0 flex items-center pl-3">
							<FcGoogle className="h-5 w-5" />
						</span>
						Entrar com Google
					</button>

					<div className="flex items-center justify-center">
						<div className="text-sm">
							<p className="text-gray-500">
								Ao entrar, você concorda com nossos Termos de
								Serviço
							</p>
						</div>
					</div>
				</div>

				<div className="mt-10 pt-6 border-t border-gray-200">
					<div className="flex items-center justify-center space-x-4">
						<div className="flex flex-col items-center">
							<div className="rounded-full bg-indigo-100 p-2">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-6 w-6 text-indigo-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 6v6m0 0v6m0-6h6m-6 0H6"
									/>
								</svg>
							</div>
							<p className="mt-2 text-xs text-gray-500">
								Chat 1:1
							</p>
						</div>

						<div className="flex flex-col items-center">
							<div className="rounded-full bg-indigo-100 p-2">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-6 w-6 text-indigo-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
									/>
								</svg>
							</div>
							<p className="mt-2 text-xs text-gray-500">Grupos</p>
						</div>

						<div className="flex flex-col items-center">
							<div className="rounded-full bg-indigo-100 p-2">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-6 w-6 text-indigo-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
									/>
								</svg>
							</div>
							<p className="mt-2 text-xs text-gray-500">
								Chamadas
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Login;
