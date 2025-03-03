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
					replyTo,
				} = data;

				console.log(
					`Recebendo mensagem para conversa ${conversationId}`
				);

				// Verificações básicas
				if (
					!conversationId ||
					(!content && (!attachments || attachments.length === 0))
				) {
					console.log("Dados de mensagem inválidos");
					return;
				}

				// Busca a conversa
				const conversation = await Conversation.findById(
					conversationId
				);
				if (!conversation) {
					console.log("Conversa não encontrada");
					return;
				}

				// Verifica se é participante
				if (
					!conversation.participants.some(
						(p) => p.toString() === user._id.toString()
					)
				) {
					console.log("Usuário não é participante da conversa");
					return;
				}

				// Cria nova mensagem
				const newMessage = new Message({
					conversation: conversationId,
					sender: user._id,
					content: content ? content.trim() : undefined,
					attachments,
					replyTo,
					readBy: [user._id], // Já marca como lida pelo remetente
				});

				await newMessage.save();

				// Popula o remetente para enviar dados completos
				await newMessage.populate("sender", "displayName avatar");

				if (replyTo) {
					await newMessage.populate({
						path: "replyTo",
						populate: {
							path: "sender",
							select: "displayName",
						},
					});
				}

				// Atualiza a conversa com a última mensagem
				await Conversation.findByIdAndUpdate(conversationId, {
					lastMessage: newMessage._id,
					updatedAt: new Date(),
				});

				console.log(
					`Enviando mensagem para sala conversation:${conversationId}`
				);
				// Envia para todos na sala da conversa
				io.to(`conversation:${conversationId}`).emit(
					"new_message",
					newMessage
				);

				// Notificações para usuários offline ou em outras conversas
				conversation.participants.forEach(async (participantId) => {
					const participantIdStr = participantId.toString();

					// Ignora o remetente
					if (participantIdStr === user._id.toString()) return;

					// Incrementa contador não lido na conversa para outros participantes
					await Conversation.findOneAndUpdate(
						{
							_id: conversationId,
							participants: participantId,
						},
						{ $inc: { unreadCount: 1 } }
					);

					// Notifica outros usuários online que não estejam na mesma conversa
					const receiverSocketId = onlineUsers.get(participantIdStr);
					if (receiverSocketId) {
						console.log(
							`Notificando usuário ${participantIdStr} sobre nova mensagem`
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
				if (
					message.readBy.some(
						(id) => id.toString() === user._id.toString()
					)
				)
					return;

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
				const userIdStr = user._id.toString();

				// Criar cópia dos IDs para não modificar o array original
				let participantIds = [...userIds];

				// Adiciona o próprio usuário se não estiver na lista
				if (!participantIds.includes(userIdStr)) {
					participantIds.push(userIdStr);
				}

				// Validações básicas
				if (participantIds.length < 2) return;
				if (isGroup && !name) return;

				// Para conversas diretas, verifica se já existe
				if (!isGroup && participantIds.length === 2) {
					const otherUserId = participantIds.find(
						(id) => id !== userIdStr
					);

					// Verifica se já existe conversa entre os dois
					const existingConversation = await Conversation.findOne({
						isGroup: false,
						participants: {
							$all: [user._id, otherUserId],
							$size: 2,
						},
					}).populate(
						"participants",
						"displayName avatar status lastSeen"
					);

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
					participants: participantIds,
					admins: isGroup ? [user._id] : [],
					createdBy: user._id,
				});

				await newConversation.save();

				// Popula os participantes
				await newConversation.populate(
					"participants",
					"displayName avatar status lastSeen"
				);

				// Cada participante entra na sala
				participantIds.forEach((userId) => {
					const participantSocketId = onlineUsers.get(userId);
					if (participantSocketId) {
						const participantSocket =
							io.sockets.sockets.get(participantSocketId);
						if (participantSocket) {
							participantSocket.join(
								`conversation:${newConversation._id}`
							);
						}
					}
				});

				// Notifica todos os participantes sobre a nova conversa
				participantIds.forEach((userId) => {
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
			for (const conversation of conversations) {
				console.log(
					`Usuário ${userId} entrando na sala conversation:${conversation._id}`
				);
				socket.join(`conversation:${conversation._id}`);
			}
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
