// client/src/services/socketService.js
import { io } from "socket.io-client";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";

let socket;

export const initializeSocket = () => {
	if (socket && socket.connected) {
		return socket;
	}

	const token = localStorage.getItem("token");

	if (!token) {
		console.error("Não há token para conectar ao socket");
		return null;
	}

	// Close any existing connection first
	if (socket) {
		socket.close();
	}

	// Cria a conexão com o socket.io
	socket = io("http://localhost:3000", {
		auth: { token },
		transports: ["websocket", "polling"],
		reconnectionAttempts: 5,
		reconnectionDelay: 2000,
	});

	// Registra eventos de conexão
	socket.on("connect", () => {
		console.log("Socket conectado com ID:", socket.id);
	});

	socket.on("connect_error", (error) => {
		console.error("Erro de conexão com socket:", error.message);

		// Se houver erro de autenticação, forçamos o logout
		if (error.message === "Não autorizado") {
			const { logout } = useAuthStore.getState();
			logout();
		}
	});

	socket.on("disconnect", (reason) => {
		console.log("Socket desconectado:", reason);
	});

	// Configura os listeners de chat
	setupChatListeners();

	return socket;
};

const setupChatListeners = () => {
	const chatStore = useChatStore.getState();

	// Recebe uma nova mensagem
	socket.on("new_message", (message) => {
		chatStore.addMessage(message);

		// Marca como lida se a conversa estiver aberta
		if (chatStore.activeConversation?._id === message.conversation) {
			markMessageAsRead(message._id);
		}
	});

	// Recebe notificação de leitura de mensagem
	socket.on("message_read", ({ messageId, userId }) => {
		chatStore.updateMessageReadStatus(messageId, userId);
	});

	// Recebe atualização de status online
	socket.on("user_status_change", ({ userId, status, lastSeen }) => {
		chatStore.updateUserStatus(userId, status, lastSeen);
	});

	// Recebe nova conversa ou grupo
	socket.on("new_conversation", (conversation) => {
		chatStore.addConversation(conversation);
	});

	// Recebe atualização de conversa (novo membro, saída, etc)
	socket.on("conversation_updated", (conversation) => {
		chatStore.updateConversation(conversation);
	});

	// Recebe solicitação de amizade
	socket.on("friend_request", (request) => {
		chatStore.addFriendRequest(request);
	});

	// Amizade aceita
	socket.on("friend_request_accepted", (friendship) => {
		chatStore.updateFriendship(friendship);
	});

	// Notificação de digitação
	socket.on("typing", ({ conversationId, userId, isTyping }) => {
		chatStore.setUserTyping(conversationId, userId, isTyping);
	});
};

// Métodos para enviar eventos ao servidor
export const sendMessage = (conversationId, content, attachments = []) => {
	if (!socket?.connected) return;

	socket.emit("send_message", {
		conversation: conversationId,
		content,
		attachments,
	});
};

export const markMessageAsRead = (messageId) => {
	if (!socket?.connected) return;

	socket.emit("mark_as_read", { messageId });
};

export const sendTypingStatus = (conversationId, isTyping) => {
	if (!socket?.connected) return;

	socket.emit("typing", { conversationId, isTyping });
};

export const createConversation = (
	userIds,
	isGroup = false,
	groupName = null
) => {
	if (!socket?.connected) return;

	socket.emit("create_conversation", {
		userIds,
		isGroup,
		name: groupName,
	});
};

export const sendFriendRequest = (userId) => {
	if (!socket?.connected) return;

	socket.emit("send_friend_request", { userId });
};

export const acceptFriendRequest = (requestId) => {
	if (!socket?.connected) return;

	socket.emit("accept_friend_request", { requestId });
};

export const getSocket = () => socket;

export default {
	initializeSocket,
	sendMessage,
	markMessageAsRead,
	sendTypingStatus,
	createConversation,
	sendFriendRequest,
	acceptFriendRequest,
	getSocket,
};
