// server/routes/auth.routes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth");

// Google OAuth
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleCallback);

// Login com token Google (client-side)
router.post("/google-callback", authController.googleLoginCallback);

// Obter dados do usuário atual
router.get("/me", authMiddleware.authenticate, authController.me);

// Logout
router.post("/logout", authMiddleware.authenticate, authController.logout);

// Refresh token
router.post("/refresh-token", authController.refreshToken);

module.exports = router;
