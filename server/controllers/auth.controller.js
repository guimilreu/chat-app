// server/controllers/auth.controller.js
const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const passport = require("passport");

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "jwt-secret-key";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";

// Gera token JWT
const generateToken = (user) => {
	console.log("Gerando token para usuário:", user._id);
	return jwt.sign(
		{
			id: user._id.toString(), // Garante que seja string
			email: user.email,
		},
		JWT_SECRET,
		{ expiresIn: JWT_EXPIRY }
	);
};

// Inicia autenticação com Google
exports.googleAuth = passport.authenticate("google", {
	scope: ["profile", "email"],
});

// Callback para autenticação Google
exports.googleCallback = (req, res, next) => {
	passport.authenticate("google", { session: false }, (err, user) => {
		if (err) return next(err);

		if (!user) {
			return res.redirect(
				`${
					process.env.CLIENT_URL || "http://localhost:3000"
				}/login?error=auth_failed`
			);
		}

		// Gera token JWT
		const token = generateToken(user);

		// Atualiza status para online
		user.status = "online";
		user.lastLogin = new Date();
		user.save();

		// Redireciona para o cliente com token como query param
		return res.redirect(
			`${
				process.env.CLIENT_URL || "http://localhost:3000"
			}/auth/callback?token=${token}`
		);
	})(req, res, next);
};

// Login com Google token ID (client-side)
exports.googleLoginCallback = async (req, res) => {
	try {
		const { token: googleToken } = req.body;

		// Verifica o token Google
		const ticket = await client.verifyIdToken({
			idToken: googleToken,
			audience: process.env.GOOGLE_CLIENT_ID,
		});

		const payload = ticket.getPayload();
		const { sub: googleId, email, name, picture } = payload;

		// Verifica se o usuário existe
		let user = await User.findOne({ googleId });

		if (!user) {
			// Cria novo usuário
			user = new User({
				googleId,
				email,
				displayName: name,
				firstName: payload.given_name || "",
				lastName: payload.family_name || "",
				avatar: picture,
				status: "online",
			});

			await user.save();
		} else {
			// Atualiza dados do usuário
			user.status = "online";
			user.lastLogin = new Date();
			await user.save();
		}

		// Gera token JWT
		const jwtToken = generateToken(user);

		res.status(200).json({
			token: jwtToken,
			user: user.toJSON(),
		});
	} catch (error) {
		console.error("Erro na autenticação Google:", error);
		res.status(401).json({ message: "Falha na autenticação" });
	}
};

// Obter dados do usuário atual
exports.me = async (req, res) => {
	try {
		// Atualiza último acesso
		req.user.lastSeen = new Date();
		await req.user.save();

		res.status(200).json(req.user.toJSON());
	} catch (error) {
		console.error("Erro ao obter dados do usuário:", error);
		res.status(500).json({ message: "Erro ao obter dados do usuário" });
	}
};

// Logout
exports.logout = async (req, res) => {
	try {
		// Atualiza status para offline
		if (req.user) {
			req.user.status = "offline";
			req.user.lastSeen = new Date();
			req.user.socketId = null;
			await req.user.save();
		}

		req.logout((err) => {
			if (err) {
				return next(err);
			}
			res.status(200).json({ message: "Logout realizado com sucesso" });
		});
	} catch (error) {
		console.error("Erro ao fazer logout:", error);
		res.status(500).json({ message: "Erro ao fazer logout" });
	}
};

// Refresh Token
exports.refreshToken = async (req, res) => {
	try {
		const { refreshToken } = req.cookies;

		if (!refreshToken) {
			return res
				.status(401)
				.json({ message: "Refresh token não fornecido" });
		}

		// Verifica refresh token
		jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, async (err, decoded) => {
			if (err) {
				return res
					.status(401)
					.json({ message: "Refresh token inválido ou expirado" });
			}

			// Busca usuário
			const user = await User.findById(decoded.id);

			if (!user) {
				return res
					.status(401)
					.json({ message: "Usuário não encontrado" });
			}

			// Gera novo token JWT
			const token = generateToken(user);

			res.json({ token });
		});
	} catch (error) {
		console.error("Erro ao renovar token:", error);
		res.status(500).json({ message: "Erro ao renovar token" });
	}
};
