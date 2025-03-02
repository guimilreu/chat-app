// server/middleware/socketAuth.js
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const JWT_SECRET = process.env.JWT_SECRET || "jwt-secret-key";

// Middleware de autenticação para Socket.io
module.exports = async (socket, next) => {
	try {
		const token = socket.handshake.auth.token;

		if (!token) {
			return next(new Error("Não autorizado"));
		}

		// Verifica token JWT
		const decoded = jwt.verify(token, JWT_SECRET);

		// Busca usuário
		const user = await User.findById(decoded.id);

		if (!user) {
			return next(new Error("Usuário não encontrado"));
		}

		// Atualiza status e ID do socket
		user.status = "online";
		user.socketId = socket.id;
		user.lastSeen = new Date();
		await user.save();

		// Armazena usuário no socket
		socket.user = user;

		next();
	} catch (error) {
		console.error("Erro de autenticação no socket:", error.message);
		next(new Error("Não autorizado"));
	}
};
