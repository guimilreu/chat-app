// server/controllers/user.controller.js
const User = require("../models/user.model");

// Buscar usuários
exports.searchUsers = async (req, res) => {
	try {
		const { q } = req.query;

		if (!q || q.length < 2) {
			return res
				.status(400)
				.json({ message: "A busca deve ter pelo menos 2 caracteres" });
		}

		// Exclui o usuário atual e aqueles que ele bloqueou
		const excludedIds = [req.user._id, ...(req.user.blockedUsers || [])];

		// Busca por nome ou email
		const users = await User.find({
			$and: [
				{ _id: { $nin: excludedIds } },
				{
					$or: [
						{ displayName: { $regex: q, $options: "i" } },
						{ email: { $regex: q, $options: "i" } },
					],
				},
			],
		})
			.select("displayName email avatar status")
			.limit(10);

		res.json(users);
	} catch (error) {
		console.error("Erro ao buscar usuários:", error);
		res.status(500).json({ message: "Erro ao buscar usuários" });
	}
};

// Obter perfil do usuário
exports.getUserProfile = async (req, res) => {
	try {
		const user = await User.findById(req.user._id).select(
			"-socketId -blockedUsers"
		);

		if (!user) {
			return res.status(404).json({ message: "Usuário não encontrado" });
		}

		res.json(user);
	} catch (error) {
		console.error("Erro ao obter perfil do usuário:", error);
		res.status(500).json({ message: "Erro ao obter perfil do usuário" });
	}
};

// Atualizar perfil do usuário
exports.updateUserProfile = async (req, res) => {
	try {
		const { displayName, bio, status } = req.body;

		// Validações básicas
		if (displayName && displayName.trim().length < 2) {
			return res
				.status(400)
				.json({ message: "Nome deve ter pelo menos 2 caracteres" });
		}

		if (bio && bio.trim().length > 200) {
			return res
				.status(400)
				.json({ message: "Bio deve ter no máximo 200 caracteres" });
		}

		// Campos que podem ser atualizados
		const updateFields = {};
		if (displayName) updateFields.displayName = displayName.trim();
		if (bio !== undefined) updateFields.bio = bio.trim();
		if (status) updateFields.status = status;

		const updatedUser = await User.findByIdAndUpdate(
			req.user._id,
			updateFields,
			{ new: true }
		).select("-socketId -blockedUsers");

		res.json(updatedUser);
	} catch (error) {
		console.error("Erro ao atualizar perfil do usuário:", error);
		res.status(500).json({
			message: "Erro ao atualizar perfil do usuário",
		});
	}
};

// Obter status de um usuário
exports.getUserStatus = async (req, res) => {
	try {
		const { userId } = req.params;

		const user = await User.findById(userId).select("status lastSeen");

		if (!user) {
			return res.status(404).json({ message: "Usuário não encontrado" });
		}

		res.json({
			status: user.status,
			lastSeen: user.lastSeen,
			isOnline: user.status === "online",
		});
	} catch (error) {
		console.error("Erro ao obter status do usuário:", error);
		res.status(500).json({ message: "Erro ao obter status do usuário" });
	}
};
