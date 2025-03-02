// server/routes/friend.routes.js
const express = require("express");
const router = express.Router();
const friendController = require("../controllers/friend.controller");
const authMiddleware = require("../middleware/auth");

// Todas as rotas requerem autenticação
router.use(authMiddleware.authenticate);

// Rotas de amizade
router.get("/", friendController.getFriends);
router.get("/requests", friendController.getFriendRequests);
router.post("/requests", friendController.sendFriendRequest);
router.put("/requests/:requestId", friendController.respondToFriendRequest);
router.delete("/:friendId", friendController.removeFriend);

module.exports = router;
