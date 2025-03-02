// server/models/conversation.model.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ConversationSchema = new Schema(
	{
		name: {
			type: String,
			trim: true,
		},
		isGroup: {
			type: Boolean,
			default: false,
		},
		participants: [
			{
				type: Schema.Types.ObjectId,
				ref: "User",
			},
		],
		admins: [
			{
				type: Schema.Types.ObjectId,
				ref: "User",
			},
		],
		groupAvatar: {
			type: String,
		},
		lastMessage: {
			type: Schema.Types.ObjectId,
			ref: "Message",
		},
		unreadCount: {
			type: Number,
			default: 0,
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{
		timestamps: true,
	}
);

// Método para verificar se o usuário é participante
ConversationSchema.methods.hasParticipant = function (userId) {
	return this.participants.some((p) => p.equals(userId));
};

// Método para verificar se o usuário é admin (para grupos)
ConversationSchema.methods.isAdmin = function (userId) {
	return this.admins.some((a) => a.equals(userId));
};

// Método de ajuda para obter o nome da conversa para um usuário específico
ConversationSchema.methods.getNameForUser = function (userId, participants) {
	// Se for grupo, retorna o nome do grupo
	if (this.isGroup) return this.name;

	// Para conversas diretas, retorna o nome do outro participante
	if (!participants || !participants.length) return "Chat";

	// Encontra o outro participante
	const otherUser = participants.find((p) => !p._id.equals(userId));
	return otherUser ? otherUser.displayName : "Chat";
};

// Índices
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessage: 1 });

const Conversation = mongoose.model("Conversation", ConversationSchema);

module.exports = Conversation;
