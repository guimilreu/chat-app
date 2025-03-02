// server/models/friendRequest.model.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const FriendRequestSchema = new Schema(
	{
		sender: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		recipient: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		status: {
			type: String,
			enum: ["pending", "accepted", "rejected"],
			default: "pending",
		},
		message: {
			type: String,
		},
	},
	{
		timestamps: true,
	}
);

// Verifica se existe uma solicitação entre dois usuários
FriendRequestSchema.statics.findBetweenUsers = function (user1Id, user2Id) {
	return this.findOne({
		$or: [
			{ sender: user1Id, recipient: user2Id },
			{ sender: user2Id, recipient: user1Id },
		],
	});
};

// Índices
FriendRequestSchema.index({ sender: 1, recipient: 1 }, { unique: true });
FriendRequestSchema.index({ recipient: 1, status: 1 });

const FriendRequest = mongoose.model("FriendRequest", FriendRequestSchema);

module.exports = FriendRequest;
