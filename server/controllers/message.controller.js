// server/controllers/message.controller.js
const Message = require("../models/message.model");
const Conversation = require("../models/conversation.model");

// Deletar mensagem
exports.deleteMessage = async (req, res) => {
	try {
		const { messageId } = req.params;
		const userId = req.user._id;

		// Busca a mensagem
		const message = await Message.findById(messageId);

		if (!message) {
			return res.status(404).json({ message: "Mensagem não encontrada" });
		}

		// Verifica se o usuário é o remetente da mensagem
		if (message.sender.toString() !== userId.toString()) {
			return res
				.status(403)
				.json({
					message:
						"Você não tem permissão para excluir esta mensagem",
				});
		}

		// Soft delete (marca como excluída)
		message.isDeleted = true;
		message.deletedAt = new Date();
		message.content = null;
		message.attachments = [];

		await message.save();

		// Se for a última mensagem da conversa, busca a mensagem anterior
		const conversation = await Conversation.findById(message.conversation);

		if (
			conversation.lastMessage &&
			conversation.lastMessage.toString() === messageId
		) {
			// Busca a mensagem mais recente não excluída
			const lastValidMessage = await Message.findOne({
				conversation: conversation._id,
				isDeleted: false,
			}).sort({ createdAt: -1 });

			if (lastValidMessage) {
				conversation.lastMessage = lastValidMessage._id;
			} else {
				conversation.lastMessage = null;
			}

			await conversation.save();
		}

		res.json({ success: true });
	} catch (error) {
		console.error("Erro ao excluir mensagem:", error);
		res.status(500).json({ message: "Erro ao excluir mensagem" });
	}
};

// Adicionar reação a uma mensagem
exports.addReaction = async (req, res) => {
	try {
		const { messageId } = req.params;
		const { type } = req.body;
		const userId = req.user._id;

		if (!type) {
			return res
				.status(400)
				.json({ message: "Tipo de reação é obrigatório" });
		}

		// Busca a mensagem
		const message = await Message.findById(messageId);

		if (!message) {
			return res.status(404).json({ message: "Mensagem não encontrada" });
		}

		// Verifica se a mensagem pertence a uma conversa que o usuário participa
		const conversation = await Conversation.findOne({
			_id: message.conversation,
			participants: userId,
		});

		if (!conversation) {
			return res
				.status(403)
				.json({
					message:
						"Você não tem permissão para acessar esta mensagem",
				});
		}

		// Remove reação existente do mesmo usuário
		const reactions = message.reactions.filter(
			(reaction) => reaction.user.toString() !== userId.toString()
		);

		// Adiciona nova reação
		reactions.push({
			user: userId,
			type,
		});

		// Atualiza mensagem com nova lista de reações
		message.reactions = reactions;
		await message.save();

		// Popula usuários que reagiram
		await message.populate("reactions.user", "displayName avatar");

		res.json(message);
	} catch (error) {
		console.error("Erro ao adicionar reação:", error);
		res.status(500).json({ message: "Erro ao adicionar reação" });
	}
};

// Remover reação de uma mensagem
exports.removeReaction = async (req, res) => {
	try {
		const { messageId, reactionId } = req.params;
		const userId = req.user._id;

		// Busca a mensagem
		const message = await Message.findById(messageId);

		if (!message) {
			return res.status(404).json({ message: "Mensagem não encontrada" });
		}

		// Verifica se o usuário é dono da reação ou remetente da mensagem
		const reaction = message.reactions.id(reactionId);

		if (!reaction) {
			return res.status(404).json({ message: "Reação não encontrada" });
		}

		if (
			reaction.user.toString() !== userId.toString() &&
			message.sender.toString() !== userId.toString()
		) {
			return res
				.status(403)
				.json({
					message: "Você não tem permissão para remover esta reação",
				});
		}

		// Remove a reação
		reaction.remove();
		await message.save();

		res.json(message);
	} catch (error) {
		console.error("Erro ao remover reação:", error);
		res.status(500).json({ message: "Erro ao remover reação" });
	}
};
