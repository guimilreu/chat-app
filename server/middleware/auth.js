// server/middleware/auth.js
const passport = require("passport");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Conversation = require("../models/conversation.model");

const JWT_SECRET = process.env.JWT_SECRET || "jwt-secret-key";

// Middleware de autenticação JWT
exports.authenticate = (req, res, next) => {
	console.log("Cabeçalhos recebidos:", req.headers);

	passport.authenticate("jwt", { session: false }, (err, user, info) => {
		if (err) {
			console.error("Erro na autenticação JWT:", err);
			return next(err);
		}

		if (!user) {
			console.error("Autenticação falhou. Info:", info);
			return res.status(401).json({
				message: "Não autorizado. Faça login novamente.",
			});
		}

		console.log("Usuário autenticado com sucesso:", user._id);
		req.user = user;
		return next();
	})(req, res, next);
};

// Middleware para verificar se é admin de grupo
exports.isGroupAdmin = async (req, res, next) => {
	try {
		const { conversationId } = req.params;
		const userId = req.user._id;

		const conversation = await Conversation.findById(conversationId)
			.populate("participants", "displayName avatar status")
			.populate("admins", "displayName avatar status");

		if (!conversation) {
			return res.status(404).json({ message: "Conversa não encontrada" });
		}

		// Verifica se é grupo
		if (!conversation.isGroup) {
			return res
				.status(400)
				.json({ message: "Esta operação só é válida para grupos" });
		}

		// Verifica se é admin
		if (!conversation.admins.some((admin) => admin._id.equals(userId))) {
			return res.status(403).json({
				message: "Apenas administradores podem realizar esta ação",
			});
		}

		req.conversation = conversation;
		next();
	} catch (error) {
		console.error("Erro ao verificar permissão de admin:", error);
		res.status(500).json({ message: "Erro ao verificar permissão" });
	}
};

// Middleware para verificar se é participante de conversa
exports.isConversationParticipant = async (req, res, next) => {
	try {
		const { conversationId } = req.params;
		const userId = req.user._id;

		const conversation = await Conversation.findById(conversationId);

		if (!conversation) {
			return res.status(404).json({ message: "Conversa não encontrada" });
		}

		// Verifica se é participante
		if (!conversation.participants.some((id) => id.equals(userId))) {
			return res.status(403).json({
				message: "Você não tem permissão para acessar esta conversa",
			});
		}

		req.conversation = conversation;
		next();
	} catch (error) {
		console.error("Erro ao verificar participação em conversa:", error);
		res.status(500).json({ message: "Erro ao verificar permissão" });
	}
};

// Middleware para verificar token JWT
exports.validateToken = (req, res, next) => {
	const token = req.headers.authorization?.split(" ")[1] || req.cookies.token;

	if (!token) {
		return res.status(401).json({ message: "Token não fornecido" });
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		req.userId = decoded.id;
		next();
	} catch (error) {
		return res.status(401).json({ message: "Token inválido ou expirado" });
	}
};

// Middleware para verificar propriedade do recurso
exports.isResourceOwner = (model, paramName = "id", idField = "_id") => {
	return async (req, res, next) => {
		try {
			const resourceId = req.params[paramName];
			const userId = req.user._id;

			const resource = await model.findById(resourceId);

			if (!resource) {
				return res
					.status(404)
					.json({ message: "Recurso não encontrado" });
			}

			// Verifica se o usuário é o proprietário
			if (!resource[idField].equals(userId)) {
				return res.status(403).json({
					message:
						"Você não tem permissão para modificar este recurso",
				});
			}

			req.resource = resource;
			next();
		} catch (error) {
			console.error("Erro ao verificar propriedade de recurso:", error);
			res.status(500).json({ message: "Erro ao verificar permissão" });
		}
	};
};
