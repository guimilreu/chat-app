// server/routes/user.routes.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth");

// Rotas públicas
router.get("/search", authMiddleware.authenticate, userController.searchUsers);

// Rotas protegidas
router.get(
	"/profile",
	authMiddleware.authenticate,
	userController.getUserProfile
);
router.put(
	"/profile",
	authMiddleware.authenticate,
	userController.updateUserProfile
);
router.get(
	"/status/:userId",
	authMiddleware.authenticate,
	userController.getUserStatus
);

module.exports = router;
