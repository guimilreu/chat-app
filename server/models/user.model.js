// server/models/user.model.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema(
	{
		googleId: {
			type: String,
			unique: true,
			sparse: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			lowercase: true,
		},
		displayName: {
			type: String,
			required: true,
		},
		firstName: {
			type: String,
		},
		lastName: {
			type: String,
		},
		avatar: {
			type: String,
			default: function () {
				// Avatar padrão usando as iniciais do nome
				const initials = this.displayName
					? this.displayName
							.split(" ")
							.map((n) => n[0])
							.join("")
							.toUpperCase()
					: "?";
				return `https://ui-avatars.com/api/?name=${initials}&background=random`;
			},
		},
		bio: {
			type: String,
			default: "",
		},
		status: {
			type: String,
			enum: ["online", "offline", "away", "busy"],
			default: "offline",
		},
		lastSeen: {
			type: Date,
			default: Date.now,
		},
		lastLogin: {
			type: Date,
			default: Date.now,
		},
		friends: [
			{
				type: Schema.Types.ObjectId,
				ref: "User",
			},
		],
		blockedUsers: [
			{
				type: Schema.Types.ObjectId,
				ref: "User",
			},
		],
		settings: {
			theme: {
				type: String,
				enum: ["light", "dark", "system"],
				default: "system",
			},
			notifications: {
				sound: {
					type: Boolean,
					default: true,
				},
				desktop: {
					type: Boolean,
					default: true,
				},
				email: {
					type: Boolean,
					default: false,
				},
			},
			privacy: {
				lastSeen: {
					type: String,
					enum: ["everyone", "friends", "nobody"],
					default: "everyone",
				},
				profilePhoto: {
					type: String,
					enum: ["everyone", "friends", "nobody"],
					default: "everyone",
				},
			},
		},
		socketId: {
			type: String,
			default: null,
		},
	},
	{
		timestamps: true,
	}
);

// Método para verificar se o usuário está online
UserSchema.methods.isOnline = function () {
	return this.status === "online" && this.socketId !== null;
};

// Método para verificar se dois usuários são amigos
UserSchema.methods.isFriendOf = function (userId) {
	return this.friends.includes(userId);
};

// Método para verificar se o usuário bloqueou alguém
UserSchema.methods.hasBlocked = function (userId) {
	return this.blockedUsers.includes(userId);
};

// Método para serializar usuário para resposta API
UserSchema.methods.toJSON = function () {
	const user = this.toObject();

	// Remove campos sensíveis
	delete user.googleId;
	delete user.socketId;
	delete user.blockedUsers;

	// Formata campos extras
	user.isOnline = this.isOnline();

	return user;
};

const User = mongoose.model("User", UserSchema);

module.exports = User;