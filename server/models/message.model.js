// server/models/message.model.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AttachmentSchema = new Schema({
	type: {
		type: String,
		enum: ["image", "video", "audio", "file"],
		required: true,
	},
	url: {
		type: String,
		required: true,
	},
	name: String,
	size: Number,
	mimeType: String,
	width: Number,
	height: Number,
	duration: Number,
});

const MessageSchema = new Schema(
	{
		conversation: {
			type: Schema.Types.ObjectId,
			ref: "Conversation",
			required: true,
		},
		sender: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		content: {
			type: String,
		},
		attachments: [AttachmentSchema],
		readBy: [
			{
				type: Schema.Types.ObjectId,
				ref: "User",
			},
		],
		replyTo: {
			type: Schema.Types.ObjectId,
			ref: "Message",
		},
		isDeleted: {
			type: Boolean,
			default: false,
		},
		isEdited: {
			type: Boolean,
			default: false,
		},
		deletedAt: {
			type: Date,
		},
		reactions: [
			{
				user: {
					type: Schema.Types.ObjectId,
					ref: "User",
				},
				type: {
					type: String,
				},
			},
		],
	},
	{
		timestamps: true,
	}
);

// Método para verificar se a mensagem foi lida por um usuário
MessageSchema.methods.isReadBy = function (userId) {
	return this.readBy.some((id) => id.equals(userId));
};

// Método para verificar se a mensagem tem conteúdo ou anexos
MessageSchema.methods.hasContent = function () {
	return Boolean(this.content) || this.attachments.length > 0;
};

// Método para formatar mensagem para API
MessageSchema.methods.toJSON = function () {
	const message = this.toObject();

	// Se a mensagem foi deletada, remove o conteúdo
	if (message.isDeleted) {
		message.content = "Esta mensagem foi excluída";
		message.attachments = [];
	}

	return message;
};

// Índices
MessageSchema.index({ conversation: 1, createdAt: -1 });

const Message = mongoose.model("Message", MessageSchema);

module.exports = Message;
