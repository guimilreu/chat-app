// server/server.js
require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");

// Rotas
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const conversationRoutes = require("./routes/conversation.routes");
const messageRoutes = require("./routes/message.routes");
const friendRoutes = require("./routes/friend.routes");

// Socket handlers
const socketAuthMiddleware = require("./middleware/socketAuth");
const socketHandlers = require("./socketHandlers");

// Configurações
require("./config/passport");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
	  origin: "*", // Em desenvolvimento
	  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	  credentials: true
	}
  });

io.on("connection", (socket) => {
	console.log("New socket connection:", socket.id);
	// Your socket handlers
});

// Configuração do MongoDB
mongoose
	.connect(process.env.MONGO_URI || "mongodb://localhost:27017/chat-app")
	.then(() => console.log("MongoDB conectado"))
	.catch((err) => console.error("Erro na conexão com MongoDB:", err));

// Middlewares
app.use(
	cors({
		origin: process.env.CLIENT_URL || "http://localhost:5173", // Vite usa 5173 por padrão
		credentials: true,
	})
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
	session({
		secret: process.env.SESSION_SECRET || "secret-chat-session",
		resave: false,
		saveUninitialized: false,
		store: MongoStore.create({
			mongoUrl:
				process.env.MONGO_URI || "mongodb://localhost:27017/chat-app",
			collectionName: "sessions",
		}),
		cookie: {
			maxAge: 1000 * 60 * 60 * 24 * 7, // 1 semana
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
		},
	})
);

// Configuração do Passport.js
app.use(passport.initialize());
app.use(passport.session());

// Rotas API
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/friends", friendRoutes);

// Configuração para produção
if (process.env.NODE_ENV === "production") {
	app.use(express.static(path.join(__dirname, "../client/build")));

	app.get("*", (req, res) => {
		res.sendFile(path.join(__dirname, "../client/build", "index.html"));
	});
}

// Configuração do Socket.io
io.use(socketAuthMiddleware);
socketHandlers(io);

// Erro 404
app.use((req, res) => {
	res.status(404).json({ message: "Rota não encontrada" });
});

// Tratamento de erros
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(err.statusCode || 500).json({
		message: err.message || "Erro interno do servidor",
	});
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
	console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = { app, server, io };
