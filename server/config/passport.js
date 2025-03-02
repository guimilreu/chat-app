// server/config/passport.js
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const User = require("../models/user.model");

// JWT Options
const jwtOptions = {
	jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
	secretOrKey: process.env.JWT_SECRET || "jwt-secret-key",
};

// Serialização do usuário para a sessão
passport.serializeUser((user, done) => {
	done(null, user.id);
});

// Deserialização do usuário da sessão
passport.deserializeUser(async (id, done) => {
	try {
		const user = await User.findById(id).select("-password");
		done(null, user);
	} catch (error) {
		done(error, null);
	}
});

// Estratégia JWT para autenticação de API
passport.use(
	new JwtStrategy(
		{
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKey: process.env.JWT_SECRET,
		},
		async (jwtPayload, done) => {
			try {
				// Adicione console.log para debug
				console.log("JWT payload recebido:", jwtPayload);

				const user = await User.findById(jwtPayload.id).select(
					"-password"
				);

				if (!user) {
					console.log(
						"Usuário não encontrado com ID:",
						jwtPayload.id
					);
					return done(null, false);
				}

				console.log("Usuário autenticado:", user.displayName);
				return done(null, user);
			} catch (error) {
				console.error("Erro na estratégia JWT:", error);
				return done(error, false);
			}
		}
	)
);

// Estratégia Google OAuth
passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
			callbackURL: `${
				process.env.API_URL || "http://localhost:5000"
			}/api/auth/google/callback`,
			scope: ["profile", "email"],
		},
		async (accessToken, refreshToken, profile, done) => {
			try {
				// Verifica se o usuário já existe
				let user = await User.findOne({ googleId: profile.id });

				if (user) {
					// Atualiza informações do usuário
					user.lastLogin = new Date();
					await user.save();
					return done(null, user);
				}

				// Cria novo usuário
				const newUser = new User({
					googleId: profile.id,
					email: profile.emails[0].value,
					displayName: profile.displayName,
					firstName: profile.name.givenName || "",
					lastName: profile.name.familyName || "",
					avatar: profile.photos[0].value,
					status: "online",
				});

				await newUser.save();
				return done(null, newUser);
			} catch (error) {
				return done(error, false);
			}
		}
	)
);

module.exports = passport;
