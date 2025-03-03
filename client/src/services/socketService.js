// client/src/services/socketService.js
import { io } from "socket.io-client";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";

let socket;

export const initializeSocket = () => {
	// Evita inicializar o socket várias vezes
	if (socket && socket.connected) {
		console.log("Socket já conectado, reaproveitando conexão existente");
		return socket;
	}

	const token = localStorage.getItem("token");

	if (!token) {
		console.error("Não há token para conectar ao socket");
		return null;
	}

	// Close any existing connection first
	if (socket) {
		console.log("Fechando conexão socket existente");
		socket.disconnect();
	}

	// URL do servidor vindo do ambiente
	const serverUrl =
		import.meta.env.VITE_API_URL?.replace("/api", "") ||
		"http://localhost:3000";

	console.log(`Inicializando conexão socket para ${serverUrl}`);

	// Cria a conexão com o socket.io
	socket = io(serverUrl, {
		auth: { token },
		transports: ["websocket", "polling"],
		reconnectionAttempts: 5,
		reconnectionDelay: 2000,
		reconnection: true,
		forceNew: true,
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
		console.log("Nova mensagem recebida:", message);
		chatStore.addMessage(message);

		// Marca como lida se a conversa estiver aberta
		if (chatStore.activeConversation?._id === message.conversation) {
			markMessageAsRead(message._id);
		}
	});

	// Recebe notificação de leitura de mensagem
	socket.on("message_read", ({ messageId, userId }) => {
		console.log(`Mensagem ${messageId} lida pelo usuário ${userId}`);
		chatStore.updateMessageReadStatus(messageId, userId);
	});

	// Recebe atualização de status online
	socket.on("user_status_change", ({ userId, status, lastSeen }) => {
		console.log(`Status do usuário ${userId} alterado para ${status}`);
		chatStore.updateUserStatus(userId, status, lastSeen);
	});

	// Recebe nova conversa ou grupo
	socket.on("new_conversation", (conversation) => {
		console.log("Nova conversa recebida:", conversation);
		chatStore.addConversation(conversation);
	});

	// Recebe atualização de conversa (novo membro, saída, etc)
	socket.on("conversation_updated", (conversation) => {
		console.log("Conversa atualizada:", conversation);
		chatStore.updateConversation(conversation);
	});

	// Recebe solicitação de amizade
	socket.on("friend_request", (request) => {
		console.log("Nova solicitação de amizade:", request);
		chatStore.addFriendRequest(request);
	});

	// Amizade aceita
	socket.on("friend_request_accepted", (friendship) => {
		console.log("Solicitação de amizade aceita:", friendship);
		chatStore.updateFriendship(friendship);
	});

	// Notificação de digitação
	socket.on("typing", ({ conversationId, userId, isTyping }) => {
		console.log(
			`Usuário ${userId} ${
				isTyping ? "digitando" : "parou de digitar"
			} na conversa ${conversationId}`
		);
		chatStore.setUserTyping(conversationId, userId, isTyping);
	});
};

// Métodos para enviar eventos ao servidor
export const sendMessage = (conversationId, content, attachments = []) => {
	if (!socket?.connected) {
		console.error("Socket não conectado. Tentando reconectar...");
		socket = initializeSocket();
		if (!socket?.connected) {
			console.error("Falha ao reconectar socket");
			return;
		}
	}

	console.log(`Enviando mensagem para conversa ${conversationId}`);
	socket.emit("send_message", {
		conversation: conversationId,
		content,
		attachments,
	});
};

export const markMessageAsRead = (messageId) => {
    if (!socket?.connected) return;

    console.log(`Marcando mensagem ${messageId} como lida`);
    socket.emit("mark_as_read", { messageId });
};

export const sendTypingStatus = (conversationId, isTyping) => {
    if (!socket?.connected) return;

    socket.emit("typing", { conversationId, isTyping });
};

export const createConversation = (userIds, isGroup = false, groupName = null) => {
    if (!socket?.connected) {
        console.error("Socket não conectado ao criar conversa");
        return;
    }

    console.log(`Criando ${isGroup ? 'grupo' : 'conversa'} com usuários:`, userIds);
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
