// server/routes/conversation.routes.js
const express = require("express");
const router = express.Router();
const conversationController = require("../controllers/conversation.controller");
const authMiddleware = require("../middleware/auth");

// Rotas protegidas por autenticação
router.get(
	"/",
	authMiddleware.authenticate,
	conversationController.getConversations
);
router.post(
	"/",
	authMiddleware.authenticate,
	conversationController.createConversation
);
router.get(
	"/:conversationId",
	authMiddleware.authenticate,
	authMiddleware.isConversationParticipant,
	conversationController.getConversationById
);
router.get(
	"/:conversationId/messages",
	authMiddleware.authenticate,
	authMiddleware.isConversationParticipant,
	conversationController.getConversationMessages
);
router.post(
	"/:conversationId/messages",
	authMiddleware.authenticate,
	authMiddleware.isConversationParticipant,
	conversationController.sendMessage
);
router.post(
	"/:conversationId/read",
	authMiddleware.authenticate,
	authMiddleware.isConversationParticipant,
	conversationController.markConversationAsRead
);

// Rotas para grupos (requerem permissão de administrador)
router.post(
	"/:conversationId/participants",
	authMiddleware.authenticate,
	authMiddleware.isGroupAdmin,
	conversationController.addParticipants
);
router.delete(
	"/:conversationId/participants/:userId",
	authMiddleware.authenticate,
	authMiddleware.isGroupAdmin,
	conversationController.removeParticipant
);
router.put(
	"/:conversationId",
	authMiddleware.authenticate,
	authMiddleware.isGroupAdmin,
	conversationController.updateConversation
);

module.exports = router;
