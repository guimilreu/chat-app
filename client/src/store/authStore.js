// client/src/store/authStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../services/api";

export const useAuthStore = create(
	persist(
		(set, get) => ({
			user: null,
			isAuthenticated: false,
			isLoading: false,
			error: null,

			login: async (googleData) => {
				try {
					set({ isLoading: true, error: null });
					const response = await api.post("/auth/google-callback", {
						token: googleData.tokenId,
					});
					const { user, token } = response.data;

					localStorage.setItem("token", token);
					api.defaults.headers.common[
						"Authorization"
					] = `Bearer ${token}`;

					set({
						user,
						isAuthenticated: true,
						isLoading: false,
					});

					return user;
				} catch (error) {
					set({
						error:
							error.response?.data?.message ||
							"Falha na autenticação",
						isLoading: false,
					});
					return null;
				}
			},

			logout: async () => {
				try {
					await api.post("/auth/logout");
					localStorage.removeItem("token");
					delete api.defaults.headers.common["Authorization"];

					set({
						user: null,
						isAuthenticated: false,
					});
				} catch (error) {
					console.error("Erro ao fazer logout:", error);
				}
			},

			checkAuth: async () => {
				try {
					// Prevent duplicate checks if already loading
					if (get().isLoading) return get().isAuthenticated;

					set({ isLoading: true });
					const token = localStorage.getItem("token");

					if (!token) {
						console.log("Nenhum token encontrado");
						set({
							user: null,
							isAuthenticated: false,
							isLoading: false,
						});
						return false;
					}

					console.log("Token encontrado, verificando...");
					api.defaults.headers.common[
						"Authorization"
					] = `Bearer ${token}`;

					try {
						const response = await api.get("/auth/me");
						console.log("Usuário autenticado com sucesso");
						set({
							user: response.data,
							isAuthenticated: true,
							isLoading: false,
						});
						return true;
					} catch (error) {
						console.error(
							"Falha ao verificar autenticação:",
							error
						);

						// Only clear token on actual auth failures, not network errors
						if (error.response?.status === 401) {
							localStorage.removeItem("token");
							delete api.defaults.headers.common["Authorization"];
						}

						set({
							user: null,
							isAuthenticated: false,
							isLoading: false,
						});
						return false;
					}
				} catch (error) {
					console.error("Erro no checkAuth:", error);
					set({ isLoading: false });
					return false;
				}
			},

			updateProfile: async (userData) => {
				try {
					set({ isLoading: true });
					const response = await api.put("/users/profile", userData);

					set({
						user: response.data,
						isLoading: false,
					});

					return response.data;
				} catch (error) {
					set({
						error:
							error.response?.data?.message ||
							"Erro ao atualizar perfil",
						isLoading: false,
					});

					return null;
				}
			},
		}),
		{
			name: "auth-storage",
			partialize: (state) => ({
				user: state.user,
				isAuthenticated: state.isAuthenticated,
			}),
		}
	)
);
