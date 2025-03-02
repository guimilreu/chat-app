// server/routes/message.routes.js
const express = require("express");
const router = express.Router();
const messageController = require('../controllers/message.controller');
const authMiddleware = require("../middleware/auth");

// Todas as rotas requerem autenticação
router.use(authMiddleware.authenticate);

// Ações em mensagens específicas
router.delete("/:messageId", messageController.deleteMessage);
router.post("/:messageId/reactions", messageController.addReaction);
router.delete(
	"/:messageId/reactions/:reactionId",
	messageController.removeReaction
);

module.exports = router;
