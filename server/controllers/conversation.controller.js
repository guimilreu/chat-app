// server/controllers/conversation.controller.js
const Conversation = require("../models/conversation.model");
const Message = require("../models/message.model");
const User = require("../models/user.model");

// Obter todas as conversas do usuário
exports.getConversations = async (req, res) => {
	try {
		const userId = req.user._id;

		// Busca todas as conversas onde o usuário é participante
		const conversations = await Conversation.find({ participants: userId })
			.populate("participants", "displayName avatar status lastSeen")
			.populate("lastMessage")
			.populate("admins", "displayName")
			.sort({ updatedAt: -1 });

		// Para cada conversa, calcula número de mensagens não lidas
		const conversationsWithUnreadCount = await Promise.all(
			conversations.map(async (conversation) => {
				const convoObj = conversation.toObject();

				// Conta mensagens não lidas
				if (conversation.lastMessage) {
					const unreadCount = await Message.countDocuments({
						conversation: conversation._id,
						readBy: { $ne: userId },
						sender: { $ne: userId },
					});

					convoObj.unreadCount = unreadCount;
				} else {
					convoObj.unreadCount = 0;
				}

				return convoObj;
			})
		);

		res.json(conversationsWithUnreadCount);
	} catch (error) {
		console.error("Erro ao obter conversas:", error);
		res.status(500).json({ message: "Erro ao obter conversas" });
	}
};

// Criar nova conversa/grupo
exports.createConversation = async (req, res) => {
	try {
		const { participants, isGroup, name } = req.body;
		const userId = req.user._id;

		// Validações
		if (!participants || !Array.isArray(participants)) {
			return res.status(400).json({ message: "Participantes inválidos" });
		}

		if (isGroup && !name) {
			return res
				.status(400)
				.json({ message: "Nome do grupo é obrigatório" });
		}

		// Certifica que o criador também é participante
		const allParticipants = [
			...new Set([userId.toString(), ...participants]),
		];

		// Para conversas diretas, verifica se já existe
		if (!isGroup && allParticipants.length === 2) {
			const existingConversation = await Conversation.findOne({
				isGroup: false,
				participants: { $all: allParticipants, $size: 2 },
			}).populate("participants", "displayName avatar status lastSeen");

			if (existingConversation) {
				return res.json(existingConversation);
			}
		}

		// Cria nova conversa
		const newConversation = new Conversation({
			name: isGroup ? name : undefined,
			isGroup,
			participants: allParticipants,
			admins: isGroup ? [userId] : [],
			createdBy: userId,
		});

		await newConversation.save();

		// Popula os dados dos participantes para retornar
		await newConversation.populate(
			"participants",
			"displayName avatar status lastSeen"
		);

		res.status(201).json(newConversation);
	} catch (error) {
		console.error("Erro ao criar conversa:", error);
		res.status(500).json({ message: "Erro ao criar conversa" });
	}
};

// Obter conversa por ID
exports.getConversationById = async (req, res) => {
	try {
		const { conversationId } = req.params;

		// A conversa já foi carregada pelo middleware isConversationParticipant
		const conversation = req.conversation;

		await conversation.populate(
			"participants",
			"displayName avatar status lastSeen"
		);
		await conversation.populate("admins", "displayName avatar");
		await conversation.populate("lastMessage");

		res.json(conversation);
	} catch (error) {
		console.error("Erro ao obter conversa:", error);
		res.status(500).json({ message: "Erro ao obter conversa" });
	}
};

// Obter mensagens de uma conversa
exports.getConversationMessages = async (req, res) => {
	try {
		const { conversationId } = req.params;
		const { before, limit = 30 } = req.query;

		// Configura a query para paginação
		const query = { conversation: conversationId };

		if (before) {
			query.createdAt = { $lt: new Date(before) };
		}

		// Busca mensagens
		const messages = await Message.find(query)
			.populate("sender", "displayName avatar")
			.populate({
				path: "replyTo",
				populate: {
					path: "sender",
					select: "displayName",
				},
			})
			.sort({ createdAt: -1 })
			.limit(parseInt(limit));

		// Retorna em ordem cronológica
		res.json(messages.reverse());
	} catch (error) {
		console.error("Erro ao obter mensagens:", error);
		res.status(500).json({ message: "Erro ao obter mensagens" });
	}
};

// Enviar mensagem em uma conversa
exports.sendMessage = async (req, res) => {
	try {
		const { conversationId } = req.params;
		const { content, attachments = [], replyTo } = req.body;
		const userId = req.user._id;

		// Validações básicas
		if (
			(!content || content.trim() === "") &&
			(!attachments || attachments.length === 0)
		) {
			return res.status(400).json({ message: "Mensagem vazia" });
		}

		// Verifica replyTo se existir
		if (replyTo) {
			const replyMessage = await Message.findById(replyTo);
			if (
				!replyMessage ||
				replyMessage.conversation.toString() !== conversationId
			) {
				return res
					.status(400)
					.json({ message: "Mensagem de resposta inválida" });
			}
		}

		// Cria nova mensagem
		const newMessage = new Message({
			conversation: conversationId,
			sender: userId,
			content: content ? content.trim() : undefined,
			attachments,
			replyTo,
			readBy: [userId], // Já marca como lida pelo remetente
		});

		await newMessage.save();

		// Atualiza última mensagem da conversa
		await Conversation.findByIdAndUpdate(conversationId, {
			lastMessage: newMessage._id,
			updatedAt: new Date(),
		});

		// Popula dados do remetente para retornar
		await newMessage.populate("sender", "displayName avatar");

		res.status(201).json(newMessage);
	} catch (error) {
		console.error("Erro ao enviar mensagem:", error);
		res.status(500).json({ message: "Erro ao enviar mensagem" });
	}
};

// Marcar conversa como lida
exports.markConversationAsRead = async (req, res) => {
	try {
		const { conversationId } = req.params;
		const userId = req.user._id;

		// Busca todas as mensagens não lidas pelo usuário nesta conversa
		const unreadMessages = await Message.find({
			conversation: conversationId,
			readBy: { $ne: userId },
			sender: { $ne: userId }, // Exclui mensagens enviadas pelo próprio usuário
		});

		// Marca todas como lidas
		await Promise.all(
			unreadMessages.map((message) =>
				Message.findByIdAndUpdate(message._id, {
					$addToSet: { readBy: userId },
				})
			)
		);

		res.json({ success: true, count: unreadMessages.length });
	} catch (error) {
		console.error("Erro ao marcar conversa como lida:", error);
		res.status(500).json({ message: "Erro ao marcar conversa como lida" });
	}
};

// Adicionar participantes a um grupo
exports.addParticipants = async (req, res) => {
	try {
		const { conversationId } = req.params;
		const { userIds } = req.body;

		if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
			return res
				.status(400)
				.json({ message: "Lista de usuários inválida" });
		}

		// A verificação de grupo já é feita no middleware isGroupAdmin

		// Adiciona novos participantes
		const updatedConversation = await Conversation.findByIdAndUpdate(
			conversationId,
			{ $addToSet: { participants: { $each: userIds } } },
			{ new: true }
		).populate("participants", "displayName avatar status lastSeen");

		res.json(updatedConversation);
	} catch (error) {
		console.error("Erro ao adicionar participantes:", error);
		res.status(500).json({ message: "Erro ao adicionar participantes" });
	}
};

// Remover participante de um grupo
exports.removeParticipant = async (req, res) => {
	try {
		const { conversationId, userId } = req.params;

		// Verifica se o usuário não é o único admin
		const conversation = await Conversation.findById(conversationId);

		if (
			conversation.admins.some((id) => id.toString() === userId) &&
			conversation.admins.length === 1
		) {
			return res
				.status(400)
				.json({
					message:
						"Não é possível remover o único administrador do grupo",
				});
		}

		// Remove o usuário de participantes e admins
		const updatedConversation = await Conversation.findByIdAndUpdate(
			conversationId,
			{
				$pull: {
					participants: userId,
					admins: userId,
				},
			},
			{ new: true }
		).populate("participants", "displayName avatar status lastSeen");

		res.json(updatedConversation);
	} catch (error) {
		console.error("Erro ao remover participante:", error);
		res.status(500).json({ message: "Erro ao remover participante" });
	}
};

// Atualizar dados da conversa (nome, foto de grupo)
exports.updateConversation = async (req, res) => {
	try {
		const { conversationId } = req.params;
		const { name, groupAvatar } = req.body;

		// Campos que podem ser atualizados
		const updateFields = {};
		if (name !== undefined) updateFields.name = name.trim();
		if (groupAvatar !== undefined) updateFields.groupAvatar = groupAvatar;

		const updatedConversation = await Conversation.findByIdAndUpdate(
			conversationId,
			updateFields,
			{ new: true }
		).populate("participants", "displayName avatar status lastSeen");

		res.json(updatedConversation);
	} catch (error) {
		console.error("Erro ao atualizar conversa:", error);
		res.status(500).json({ message: "Erro ao atualizar conversa" });
	}
};
