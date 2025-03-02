// client/src/services/api.js
import axios from "axios";

// Em aplicações React/Vite, as variáveis de ambiente precisam ser prefixadas com VITE_
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const api = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
	withCredentials: true, // Importante para cookies de sessão
});

// Flag para evitar múltiplas tentativas de refresh simultâneas
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
	failedQueue.forEach((prom) => {
		if (error) {
			prom.reject(error);
		} else {
			prom.resolve(token);
		}
	});

	failedQueue = [];
};

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem("token");
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error)
);

api.interceptors.response.use(
	(response) => response,
	(error) => {
		// Only handle 401 for non-auth endpoints to prevent loops
		if (
			error.response?.status === 401 &&
			!error.config.url.includes("/auth/")
		) {
			// Clear auth state on 401s
			localStorage.removeItem("token");
		}
		return Promise.reject(error);
	}
);

// Interceptor para lidar com erros de resposta
api.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;

		// Evita loops infinitos e apenas tenta refresh em erros 401
		if (error.response?.status === 401 && !originalRequest._retry) {
			if (isRefreshing) {
				// Se já estiver fazendo refresh, coloca na fila
				return new Promise(function (resolve, reject) {
					failedQueue.push({ resolve, reject });
				})
					.then((token) => {
						originalRequest.headers["Authorization"] =
							"Bearer " + token;
						return api(originalRequest);
					})
					.catch((err) => {
						return Promise.reject(err);
					});
			}

			originalRequest._retry = true;
			isRefreshing = true;

			try {
				console.log("Tentando refresh token...");
				// Tenta obter um novo token
				const refreshResponse = await api.post("/auth/refresh-token");
				const { token } = refreshResponse.data;

				if (token) {
					console.log("Novo token obtido com sucesso");
					localStorage.setItem("token", token);
					api.defaults.headers.common[
						"Authorization"
					] = `Bearer ${token}`;

					// Processa fila de requisições que falharam
					processQueue(null, token);

					// Refaz a requisição original com o novo token
					return api(originalRequest);
				} else {
					console.error(
						"Refresh token falhou, redirecionando para login"
					);
					// Se falhar, limpa token e redireciona
					localStorage.removeItem("token");
					window.location.href = "/login";
					return Promise.reject(error);
				}
			} catch (refreshError) {
				console.error("Erro ao fazer refresh do token:", refreshError);
				// Se falhar, processa fila com erro
				processQueue(refreshError, null);

				// Limpa token e redireciona para login
				localStorage.removeItem("token");
				window.location.href = "/login";
				return Promise.reject(refreshError);
			} finally {
				isRefreshing = false;
			}
		}

		return Promise.reject(error);
	}
);

export default api;
