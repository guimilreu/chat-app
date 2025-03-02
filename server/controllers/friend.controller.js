// server/controllers/friend.controller.js
const User = require("../models/user.model");
const FriendRequest = require("../models/friendRequest.model");

// Obter lista de amigos
exports.getFriends = async (req, res) => {
	try {
		const userId = req.user._id;

		// Busca o usuário com a lista de amigos populada
		const user = await User.findById(userId).populate(
			"friends",
			"displayName email avatar status lastSeen"
		);

		res.json(user.friends || []);
	} catch (error) {
		console.error("Erro ao obter lista de amigos:", error);
		res.status(500).json({ message: "Erro ao obter lista de amigos" });
	}
};

// Obter solicitações de amizade pendentes
exports.getFriendRequests = async (req, res) => {
	try {
		const userId = req.user._id;

		// Busca solicitações recebidas pendentes
		const requests = await FriendRequest.find({
			recipient: userId,
			status: "pending",
		}).populate("sender", "displayName email avatar");

		res.json(requests);
	} catch (error) {
		console.error("Erro ao obter solicitações de amizade:", error);
		res.status(500).json({
			message: "Erro ao obter solicitações de amizade",
		});
	}
};

// Enviar solicitação de amizade
exports.sendFriendRequest = async (req, res) => {
	try {
		const { userId, message } = req.body;
		const senderId = req.user._id;

		if (!userId) {
			return res
				.status(400)
				.json({ message: "ID do usuário é obrigatório" });
		}

		// Verifica se não está enviando para si mesmo
		if (userId === senderId.toString()) {
			return res
				.status(400)
				.json({
					message: "Você não pode enviar solicitação para si mesmo",
				});
		}

		// Verifica se o destinatário existe
		const recipient = await User.findById(userId);
		if (!recipient) {
			return res.status(404).json({ message: "Usuário não encontrado" });
		}

		// Verifica se já são amigos
		if (req.user.friends.includes(userId)) {
			return res.status(400).json({ message: "Vocês já são amigos" });
		}

		// Verifica se já existe uma solicitação pendente
		const existingRequest = await FriendRequest.findBetweenUsers(
			senderId,
			userId
		);

		if (existingRequest) {
			// Se o usuário atual é o remetente de uma solicitação pendente
			if (
				existingRequest.sender.equals(senderId) &&
				existingRequest.status === "pending"
			) {
				return res
					.status(400)
					.json({
						message:
							"Você já enviou uma solicitação para este usuário",
					});
			}

			// Se o usuário atual é o destinatário de uma solicitação pendente
			if (
				existingRequest.recipient.equals(senderId) &&
				existingRequest.status === "pending"
			) {
				return res
					.status(400)
					.json({
						message:
							"Este usuário já enviou uma solicitação para você",
					});
			}

			// Se a solicitação foi rejeitada, permite enviar novamente
			if (existingRequest.status === "rejected") {
				existingRequest.sender = senderId;
				existingRequest.recipient = userId;
				existingRequest.status = "pending";
				existingRequest.message = message;

				await existingRequest.save();
				await existingRequest.populate(
					"sender",
					"displayName email avatar"
				);

				return res.status(201).json(existingRequest);
			}
		}

		// Cria nova solicitação
		const newRequest = new FriendRequest({
			sender: senderId,
			recipient: userId,
			status: "pending",
			message,
		});

		await newRequest.save();
		await newRequest.populate("sender", "displayName email avatar");

		res.status(201).json(newRequest);
	} catch (error) {
		console.error("Erro ao enviar solicitação de amizade:", error);
		res.status(500).json({
			message: "Erro ao enviar solicitação de amizade",
		});
	}
};

// Responder a uma solicitação de amizade (aceitar/rejeitar)
exports.respondToFriendRequest = async (req, res) => {
	try {
		const { requestId } = req.params;
		const { status } = req.body;
		const userId = req.user._id;

		// Valida status
		if (status !== "accepted" && status !== "rejected") {
			return res.status(400).json({ message: "Status inválido" });
		}

		// Busca a solicitação
		const request = await FriendRequest.findById(requestId);

		if (!request) {
			return res
				.status(404)
				.json({ message: "Solicitação não encontrada" });
		}

		// Verifica se o usuário é o destinatário
		if (!request.recipient.equals(userId)) {
			return res
				.status(403)
				.json({
					message:
						"Você não tem permissão para responder a esta solicitação",
				});
		}

		// Verifica se a solicitação já foi respondida
		if (request.status !== "pending") {
			return res
				.status(400)
				.json({ message: "Esta solicitação já foi respondida" });
		}

		// Atualiza status
		request.status = status;
		await request.save();

		// Se aceita, adiciona ambos à lista de amigos um do outro
		if (status === "accepted") {
			await User.findByIdAndUpdate(request.sender, {
				$addToSet: { friends: request.recipient },
			});

			await User.findByIdAndUpdate(request.recipient, {
				$addToSet: { friends: request.sender },
			});

			// Busca detalhes do novo amigo para retornar
			const friend = await User.findById(request.sender).select(
				"displayName email avatar status lastSeen"
			);

			return res.json({
				request,
				friend,
			});
		}

		res.json({ request });
	} catch (error) {
		console.error("Erro ao responder solicitação de amizade:", error);
		res.status(500).json({
			message: "Erro ao responder solicitação de amizade",
		});
	}
};

// Remover amigo
exports.removeFriend = async (req, res) => {
	try {
		const { friendId } = req.params;
		const userId = req.user._id;

		// Verifica se é realmente um amigo
		const user = await User.findById(userId);
		if (!user.friends.includes(friendId)) {
			return res
				.status(400)
				.json({ message: "Usuário não está na sua lista de amigos" });
		}

		// Remove da lista de amigos de ambos
		await User.findByIdAndUpdate(userId, {
			$pull: { friends: friendId },
		});

		await User.findByIdAndUpdate(friendId, {
			$pull: { friends: userId },
		});

		res.json({ success: true, message: "Amigo removido com sucesso" });
	} catch (error) {
		console.error("Erro ao remover amigo:", error);
		res.status(500).json({ message: "Erro ao remover amigo" });
	}
};
