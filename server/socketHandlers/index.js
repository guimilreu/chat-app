// server/socketHandlers/index.js
const User = require("../models/user.model");
const Conversation = require("../models/conversation.model");
const Message = require("../models/message.model");
const FriendRequest = require("../models/friendRequest.model");

module.exports = (io) => {
	// Mapa de usuários online (userId => socketId)
	const onlineUsers = new Map();

	// Quando um cliente se conecta
	io.on("connection", async (socket) => {
		const user = socket.user;

		// Adiciona ao mapa de usuários online
		onlineUsers.set(user._id.toString(), socket.id);

		console.log(
			`Novo usuário conectado: ${user.displayName} (${socket.id})`
		);

		// Notifica amigos sobre status online
		notifyStatusChange(user._id, "online");

		// Entra em todas as salas de conversas do usuário
		await joinUserRooms(socket, user._id);

		// Desconexão
		socket.on("disconnect", async () => {
			console.log(`Usuário desconectado: ${user.displayName}`);

			// Remove do mapa de usuários online
			onlineUsers.delete(user._id.toString());

			// Atualiza status para offline
			await User.findByIdAndUpdate(user._id, {
				status: "offline",
				lastSeen: new Date(),
				socketId: null,
			});

			// Notifica amigos sobre status offline
			notifyStatusChange(user._id, "offline", new Date());
		});

		// Eventos de mensagens

		// Enviar mensagem
		socket.on("send_message", async (data) => {
			try {
				const {
					conversation: conversationId,
					content,
					attachments = [],
				} = data;

				// Verificações básicas
				if (
					!conversationId ||
					(!content && (!attachments || attachments.length === 0))
				) {
					return;
				}

				// Busca a conversa
				const conversation = await Conversation.findById(
					conversationId
				);
				if (!conversation) return;

				// Verifica se é participante
				if (!conversation.participants.includes(user._id)) {
					return;
				}

				// Cria nova mensagem
				const newMessage = new Message({
					conversation: conversationId,
					sender: user._id,
					content,
					attachments,
					readBy: [user._id], // Já marca como lida pelo remetente
				});

				await newMessage.save();

				// Popula o remetente para enviar dados completos
				await newMessage.populate("sender", "displayName avatar");

				// Atualiza a conversa com a última mensagem
				conversation.lastMessage = newMessage._id;
				await conversation.save();

				// Envia para todos na sala da conversa
				io.to(`conversation:${conversationId}`).emit(
					"new_message",
					newMessage
				);

				// Notificações para usuários offline ou em outras conversas
				conversation.participants.forEach(async (participantId) => {
					// Ignora o remetente
					if (participantId.equals(user._id)) return;

					// Verifica se o receptor está online
					const receiverSocketId = onlineUsers.get(
						participantId.toString()
					);

					// Se estiver online mas em outra conversa
					if (receiverSocketId) {
						// Incrementa contador não lido na conversa
						await Conversation.findOneAndUpdate(
							{
								_id: conversationId,
								participants: participantId,
							},
							{ $inc: { unreadCount: 1 } }
						);
					}
				});
			} catch (error) {
				console.error("Erro ao enviar mensagem:", error);
			}
		});

		// Marca mensagem como lida
		socket.on("mark_as_read", async (data) => {
			try {
				const { messageId } = data;

				// Encontra a mensagem
				const message = await Message.findById(messageId);

				if (!message) return;

				// Verifica se já foi lida
				if (message.readBy.includes(user._id)) return;

				// Marca como lida
				message.readBy.push(user._id);
				await message.save();

				// Reseta contador não lido
				await Conversation.findOneAndUpdate(
					{
						_id: message.conversation,
						participants: user._id,
					},
					{ unreadCount: 0 }
				);

				// Notifica que a mensagem foi lida
				io.to(`conversation:${message.conversation}`).emit(
					"message_read",
					{
						messageId,
						userId: user._id,
					}
				);
			} catch (error) {
				console.error("Erro ao marcar mensagem como lida:", error);
			}
		});

		// Status de digitação
		socket.on("typing", async (data) => {
			try {
				const { conversationId, isTyping } = data;

				// Emite evento para todos na conversa
				socket.to(`conversation:${conversationId}`).emit("typing", {
					conversationId,
					userId: user._id,
					isTyping,
				});
			} catch (error) {
				console.error("Erro no status de digitação:", error);
			}
		});

		// Criar nova conversa
		socket.on("create_conversation", async (data) => {
			try {
				const { userIds, isGroup, name } = data;

				// Adiciona o próprio usuário se não estiver na lista
				if (!userIds.includes(user._id.toString())) {
					userIds.push(user._id.toString());
				}

				// Validações básicas
				if (userIds.length < 2) return;
				if (isGroup && !name) return;

				// Para conversas diretas, verifica se já existe
				if (!isGroup && userIds.length === 2) {
					const otherUserId = userIds.find(
						(id) => id !== user._id.toString()
					);

					// Verifica se já existe conversa entre os dois
					const existingConversation = await Conversation.findOne({
						isGroup: false,
						participants: {
							$all: [user._id, otherUserId],
						},
					}).populate("participants", "displayName avatar status");

					if (existingConversation) {
						// Entra na sala
						socket.join(`conversation:${existingConversation._id}`);

						// Retorna a conversa existente
						socket.emit("new_conversation", existingConversation);
						return;
					}
				}

				// Cria nova conversa
				const newConversation = new Conversation({
					name: isGroup ? name : undefined,
					isGroup,
					participants: userIds,
					admins: isGroup ? [user._id] : [],
					createdBy: user._id,
				});

				await newConversation.save();

				// Popula os participantes
				await newConversation.populate(
					"participants",
					"displayName avatar status"
				);

				// Cada participante entra na sala
				userIds.forEach((userId) => {
					const participantSocketId = onlineUsers.get(userId);
					if (participantSocketId) {
						io.sockets.sockets
							.get(participantSocketId)
							?.join(`conversation:${newConversation._id}`);
					}
				});

				// Notifica todos os participantes sobre a nova conversa
				userIds.forEach((userId) => {
					const participantSocketId = onlineUsers.get(userId);
					if (participantSocketId) {
						io.to(participantSocketId).emit(
							"new_conversation",
							newConversation
						);
					}
				});
			} catch (error) {
				console.error("Erro ao criar conversa:", error);
			}
		});

		// Solicitações de amizade

		// Enviar solicitação
		socket.on("send_friend_request", async (data) => {
			try {
				const { userId } = data;

				// Valida destinatário
				if (!userId || userId === user._id.toString()) return;

				// Verifica se já são amigos
				const sender = await User.findById(user._id);
				if (sender.friends.includes(userId)) return;

				// Verifica se já existe solicitação pendente
				const existingRequest = await FriendRequest.findBetweenUsers(
					user._id,
					userId
				);

				if (existingRequest) {
					// Se o usuário atual for o destinatário da solicitação pendente, aceita automaticamente
					if (
						existingRequest.recipient.equals(user._id) &&
						existingRequest.status === "pending"
					) {
						await acceptFriendRequest(existingRequest, user._id);
					}
					return;
				}

				// Cria nova solicitação
				const newRequest = new FriendRequest({
					sender: user._id,
					recipient: userId,
					status: "pending",
				});

				await newRequest.save();

				// Popula dados do remetente
				await newRequest.populate("sender", "displayName avatar");

				// Notifica o destinatário se estiver online
				const recipientSocketId = onlineUsers.get(userId);
				if (recipientSocketId) {
					io.to(recipientSocketId).emit("friend_request", newRequest);
				}
			} catch (error) {
				console.error("Erro ao enviar solicitação de amizade:", error);
			}
		});

		// Aceitar solicitação
		socket.on("accept_friend_request", async (data) => {
			try {
				const { requestId } = data;

				// Busca a solicitação
				const request = await FriendRequest.findById(requestId);

				if (
					!request ||
					!request.recipient.equals(user._id) ||
					request.status !== "pending"
				) {
					return;
				}

				// Aceita a solicitação
				await acceptFriendRequest(request, user._id);
			} catch (error) {
				console.error("Erro ao aceitar solicitação de amizade:", error);
			}
		});

		// Rejeitar solicitação
		socket.on("reject_friend_request", async (data) => {
			try {
				const { requestId } = data;

				// Busca a solicitação
				const request = await FriendRequest.findById(requestId);

				if (
					!request ||
					!request.recipient.equals(user._id) ||
					request.status !== "pending"
				) {
					return;
				}

				// Atualiza status
				request.status = "rejected";
				await request.save();

				// Notifica o remetente se estiver online
				const senderSocketId = onlineUsers.get(
					request.sender.toString()
				);
				if (senderSocketId) {
					io.to(senderSocketId).emit("friend_request_rejected", {
						requestId,
						userId: user._id,
					});
				}
			} catch (error) {
				console.error(
					"Erro ao rejeitar solicitação de amizade:",
					error
				);
			}
		});
	});

	// Função para entrar em todas as salas de conversas do usuário
	async function joinUserRooms(socket, userId) {
		try {
			// Busca todas as conversas do usuário
			const conversations = await Conversation.find({
				participants: userId,
			});

			// Entra em cada sala de conversa
			conversations.forEach((conversation) => {
				socket.join(`conversation:${conversation._id}`);
			});
		} catch (error) {
			console.error("Erro ao entrar nas salas do usuário:", error);
		}
	}

	// Função para notificar amigos sobre mudança de status
	async function notifyStatusChange(userId, status, lastSeen = null) {
		try {
			// Busca o usuário com seus amigos
			const user = await User.findById(userId).populate("friends");

			if (!user || !user.friends.length) return;

			// Notifica cada amigo
			user.friends.forEach((friend) => {
				const friendSocketId = onlineUsers.get(friend._id.toString());

				if (friendSocketId) {
					io.to(friendSocketId).emit("user_status_change", {
						userId,
						status,
						lastSeen,
					});
				}
			});
		} catch (error) {
			console.error("Erro ao notificar mudança de status:", error);
		}
	}

	// Função para aceitar solicitação de amizade
	async function acceptFriendRequest(request, userId) {
		try {
			// Atualiza status
			request.status = "accepted";
			await request.save();

			// Atualiza listas de amigos
			await User.findByIdAndUpdate(request.sender, {
				$addToSet: { friends: request.recipient },
			});

			await User.findByIdAndUpdate(request.recipient, {
				$addToSet: { friends: request.sender },
			});

			// Busca detalhes do amigo para o remetente
			const recipientDetails = await User.findById(
				request.recipient
			).select("displayName avatar status lastSeen");

			// Busca detalhes do amigo para o destinatário
			const senderDetails = await User.findById(request.sender).select(
				"displayName avatar status lastSeen"
			);

			// Notifica o remetente
			const senderSocketId = onlineUsers.get(request.sender.toString());
			if (senderSocketId) {
				io.to(senderSocketId).emit("friend_request_accepted", {
					requestId: request._id,
					friend: recipientDetails,
				});
			}

			// Notifica o destinatário
			const recipientSocketId = onlineUsers.get(
				request.recipient.toString()
			);
			if (recipientSocketId) {
				io.to(recipientSocketId).emit("friend_request_accepted", {
					requestId: request._id,
					friend: senderDetails,
				});
			}
		} catch (error) {
			console.error("Erro ao aceitar solicitação de amizade:", error);
		}
	}

	return {
		onlineUsers,
	};
};
