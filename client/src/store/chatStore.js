// client/src/store/chatStore.js
import { create } from "zustand";
import api from "../services/api";

export const useChatStore = create((set, get) => ({
	conversations: [],
	activeConversation: null,
	messages: [],
	unreadCount: 0,
	isLoading: false,
	error: null,
	users: [], // Lista de usuários para adicionar em conversas
	friendRequests: [], // Solicitações de amizade pendentes
	friends: [], // Amigos
	typingUsers: {}, // { conversationId: [userId1, userId2, ...] }

	// Carrega conversas do usuário
	fetchConversations: async () => {
		try {
			set({ isLoading: true, error: null });
			const response = await api.get("/conversations");

			set({
				conversations: response.data,
				isLoading: false,
			});

			// Calcula total de mensagens não lidas
			const unreadCount = response.data.reduce(
				(count, conv) => count + (conv.unreadCount || 0),
				0
			);
			set({ unreadCount });

			return response.data;
		} catch (error) {
			set({
				error:
					error.response?.data?.message ||
					"Erro ao carregar conversas",
				isLoading: false,
			});
			return [];
		}
	},

	// Carrega mensagens de uma conversa
	fetchMessages: async (conversationId) => {
		if (!conversationId) return;

		try {
			set({ isLoading: true, error: null });
			const response = await api.get(
				`/conversations/${conversationId}/messages`
			);

			set({
				messages: response.data,
				isLoading: false,
			});

			return response.data;
		} catch (error) {
			set({
				error:
					error.response?.data?.message ||
					"Erro ao carregar mensagens",
				isLoading: false,
			});
			return [];
		}
	},

	// Carrega mais mensagens (paginação)
	loadMoreMessages: async (conversationId, before) => {
		if (!conversationId) return;

		try {
			set({ isLoading: true });
			const response = await api.get(
				`/conversations/${conversationId}/messages?before=${before}`
			);

			set((state) => ({
				messages: [...response.data, ...state.messages],
				isLoading: false,
			}));

			return response.data;
		} catch (error) {
			set({
				error:
					error.response?.data?.message ||
					"Erro ao carregar mais mensagens",
				isLoading: false,
			});
			return [];
		}
	},

	// Define conversa ativa
	setActiveConversation: async (conversationId) => {
		try {
			set({ isLoading: true, error: null });

			if (!conversationId) {
				set({
					activeConversation: null,
					messages: [],
					isLoading: false,
				});
				return null;
			}

			// Obtém detalhes da conversa se não estiver na lista
			let conversation = get().conversations.find(
				(c) => c._id === conversationId
			);

			if (!conversation) {
				const response = await api.get(
					`/conversations/${conversationId}`
				);
				conversation = response.data;

				// Adiciona à lista de conversas
				set((state) => ({
					conversations: [...state.conversations, conversation],
				}));
			}

			// Marca mensagens como lidas
			if (conversation.unreadCount > 0) {
				await api.post(`/conversations/${conversationId}/read`);

				// Atualiza contagem não lida
				set((state) => {
					// Atualiza a conversa na lista
					const updatedConversations = state.conversations.map((c) =>
						c._id === conversationId ? { ...c, unreadCount: 0 } : c
					);

					// Recalcula total não lido
					const unreadCount = updatedConversations.reduce(
						(count, conv) => count + (conv.unreadCount || 0),
						0
					);

					return {
						conversations: updatedConversations,
						unreadCount,
					};
				});
			}

			set({
				activeConversation: conversation,
				isLoading: false,
			});

			// Carrega mensagens
			await get().fetchMessages(conversationId);

			return conversation;
		} catch (error) {
			set({
				error:
					error.response?.data?.message ||
					"Erro ao carregar conversa",
				isLoading: false,
			});
			return null;
		}
	},

	// Adiciona uma nova mensagem
	addMessage: (message) => {
		set((state) => {
			// Verificamos se a mensagem pertence à conversa ativa
			const isActiveConversation =
				state.activeConversation?._id === message.conversation;

			// Atualiza lista de mensagens apenas se for da conversa ativa
			const messages = isActiveConversation
				? [...state.messages, message]
				: state.messages;

			// Atualiza conversas com a mensagem mais recente e contagem não lida
			const conversations = state.conversations.map((conv) => {
				if (conv._id === message.conversation) {
					return {
						...conv,
						lastMessage: message,
						unreadCount: isActiveConversation
							? 0
							: (conv.unreadCount || 0) + 1,
					};
				}
				return conv;
			});

			// Recalcula total não lido
			const unreadCount = conversations.reduce(
				(count, conv) => count + (conv.unreadCount || 0),
				0
			);

			return { messages, conversations, unreadCount };
		});
	},

	// Atualiza status de leitura de mensagem
	updateMessageReadStatus: (messageId, userId) => {
		set((state) => {
			// Atualiza lista de mensagens
			const messages = state.messages.map((message) => {
				if (message._id === messageId) {
					// Adiciona o usuário à lista de leituras se não estiver
					const readBy = message.readBy || [];
					if (!readBy.includes(userId)) {
						return {
							...message,
							readBy: [...readBy, userId],
						};
					}
				}
				return message;
			});

			return { messages };
		});
	},

	// Adiciona nova conversa
	addConversation: (conversation) => {
		set((state) => ({
			conversations: [conversation, ...state.conversations],
		}));
	},

	// Atualiza uma conversa
	updateConversation: (updatedConversation) => {
		set((state) => {
			const conversations = state.conversations.map((conv) =>
				conv._id === updatedConversation._id
					? updatedConversation
					: conv
			);

			// Atualiza conversa ativa se for a mesma
			const activeConversation =
				state.activeConversation?._id === updatedConversation._id
					? updatedConversation
					: state.activeConversation;

			return { conversations, activeConversation };
		});
	},

	// Atualiza status do usuário
	updateUserStatus: (userId, status, lastSeen) => {
		set((state) => {
			// Atualiza nas conversas
			const conversations = state.conversations.map((conv) => {
				if (conv.isGroup) return conv;

				// Para conversas diretas, atualiza o participante
				const updatedParticipants = (conv.participants || []).map(
					(user) => {
						if (user._id === userId) {
							return {
								...user,
								status,
								lastSeen,
							};
						}
						return user;
					}
				);

				return {
					...conv,
					participants: updatedParticipants,
				};
			});

			// Atualiza conversa ativa se necessário
			let activeConversation = state.activeConversation;
			if (activeConversation && !activeConversation.isGroup) {
				const updatedParticipants = (
					activeConversation.participants || []
				).map((user) => {
					if (user._id === userId) {
						return {
							...user,
							status,
							lastSeen,
						};
					}
					return user;
				});

				activeConversation = {
					...activeConversation,
					participants: updatedParticipants,
				};
			}

			return { conversations, activeConversation };
		});
	},

	// Controla status de digitação
	setUserTyping: (conversationId, userId, isTyping) => {
		set((state) => {
			const typingUsers = { ...state.typingUsers };

			if (!typingUsers[conversationId]) {
				typingUsers[conversationId] = [];
			}

			if (isTyping && !typingUsers[conversationId].includes(userId)) {
				typingUsers[conversationId] = [
					...typingUsers[conversationId],
					userId,
				];
			} else if (!isTyping) {
				typingUsers[conversationId] = typingUsers[
					conversationId
				].filter((id) => id !== userId);
			}

			return { typingUsers };
		});
	},

	// Busca usuários para adicionar a conversas ou grupos
	searchUsers: async (query) => {
		if (!query || query.length < 2) {
			set({ users: [] });
			return [];
		}

		try {
			set({ isLoading: true });
			const response = await api.get(`/users/search?q=${query}`);

			set({
				users: response.data,
				isLoading: false,
			});

			return response.data;
		} catch (error) {
			set({
				error:
					error.response?.data?.message || "Erro ao buscar usuários",
				isLoading: false,
			});
			return [];
		}
	},

	// Carrega solicitações de amizade pendentes
	fetchFriendRequests: async () => {
		try {
			set({ isLoading: true });
			const response = await api.get("/friends/requests");

			set({
				friendRequests: response.data,
				isLoading: false,
			});

			return response.data;
		} catch (error) {
			set({
				error:
					error.response?.data?.message ||
					"Erro ao carregar solicitações",
				isLoading: false,
			});
			return [];
		}
	},

	// Adiciona uma solicitação de amizade
	addFriendRequest: (request) => {
		set((state) => ({
			friendRequests: [request, ...state.friendRequests],
		}));
	},

	// Carrega lista de amigos
	fetchFriends: async () => {
		try {
			set({ isLoading: true });
			const response = await api.get("/friends");

			set({
				friends: response.data,
				isLoading: false,
			});

			return response.data;
		} catch (error) {
			set({
				error:
					error.response?.data?.message || "Erro ao carregar amigos",
				isLoading: false,
			});
			return [];
		}
	},

	// Atualiza uma amizade (aceita, rejeitada, etc)
	updateFriendship: (friendship) => {
		set((state) => {
			// Remove da lista de solicitações
			const friendRequests = state.friendRequests.filter(
				(req) => req._id !== friendship.requestId
			);

			// Adiciona à lista de amigos se foi aceita
			let friends = [...state.friends];
			if (friendship.status === "accepted") {
				friends = [friendship.friend, ...friends];
			}

			return { friendRequests, friends };
		});
	},

	// Cria nova conversa
	createConversation: async (userIds, isGroup = false, name = null) => {
		try {
			set({ isLoading: true });

			const payload = {
				participants: userIds,
				isGroup,
				name: isGroup ? name : undefined,
			};

			const response = await api.post("/conversations", payload);
			const newConversation = response.data;

			set((state) => ({
				conversations: [newConversation, ...state.conversations],
				isLoading: false,
			}));

			return newConversation;
		} catch (error) {
			set({
				error:
					error.response?.data?.message || "Erro ao criar conversa",
				isLoading: false,
			});
			return null;
		}
	},

	// Limpa erros
	clearError: () => set({ error: null }),

	// Remove uma conversa
	removeConversation: (conversationId) => {
		set((state) => {
			const conversations = state.conversations.filter(
				(c) => c._id !== conversationId
			);

			// Se estiver removendo a conversa ativa, limpa
			const activeConversation =
				state.activeConversation?._id === conversationId
					? null
					: state.activeConversation;

			// Recalcula total não lido
			const unreadCount = conversations.reduce(
				(count, conv) => count + (conv.unreadCount || 0),
				0
			);

			return {
				conversations,
				activeConversation,
				messages: activeConversation ? state.messages : [],
				unreadCount,
			};
		});
	},

	// Envia uma nova mensagem
	sendMessage: async (conversationId, content, attachments = []) => {
		try {
			const payload = {
				content,
				attachments,
			};

			const response = await api.post(
				`/conversations/${conversationId}/messages`,
				payload
			);
			return response.data;
		} catch (error) {
			set({
				error:
					error.response?.data?.message || "Erro ao enviar mensagem",
			});
			return null;
		}
	},

	// Apaga uma mensagem
	deleteMessage: async (messageId) => {
		try {
			await api.delete(`/messages/${messageId}`);

			set((state) => {
				// Atualiza a lista de mensagens
				const messages = state.messages.map((message) => {
					if (message._id === messageId) {
						return {
							...message,
							isDeleted: true,
							content: "Esta mensagem foi excluída",
							attachments: [],
						};
					}
					return message;
				});

				return { messages };
			});

			return true;
		} catch (error) {
			set({
				error:
					error.response?.data?.message || "Erro ao deletar mensagem",
			});
			return false;
		}
	},

	// Adiciona reação a uma mensagem
	addReaction: async (messageId, reactionType) => {
		try {
			const response = await api.post(
				`/messages/${messageId}/reactions`,
				{ type: reactionType }
			);

			set((state) => {
				// Atualiza a lista de mensagens
				const messages = state.messages.map((message) => {
					if (message._id === messageId) {
						return {
							...message,
							reactions: response.data.reactions,
						};
					}
					return message;
				});

				return { messages };
			});

			return true;
		} catch (error) {
			set({
				error:
					error.response?.data?.message || "Erro ao adicionar reação",
			});
			return false;
		}
	},
}));
