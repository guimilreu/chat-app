// client/src/pages/Chat.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import socketService from "../services/socketService";

// Componentes
import Sidebar from "../components/chat/Sidebar";
import ConversationList from "../components/chat/ConversationList";
import ChatWindow from "../components/chat/ChatWindow";
import EmptyState from "../components/chat/EmptyState";
import ProfileSidebar from "../components/chat/ProfileSidebar";
import Header from "../components/layout/Header";
import Loader from "../components/common/Loader";

const Chat = () => {
	const navigate = useNavigate();
	const {
		user,
		isAuthenticated,
		isLoading: authLoading,
		checkAuth,
	} = useAuthStore();
	const {
		activeConversation,
		conversations,
		fetchConversations,
		isLoading: chatLoading,
		setActiveConversation,
	} = useChatStore();

	const [showProfileSidebar, setShowProfileSidebar] = useState(false);
	const [mobileView, setMobileView] = useState(window.innerWidth < 768);
	const [showConversations, setShowConversations] = useState(true);

	// Verifica autenticação
	useEffect(() => {
		const checkAuthentication = async () => {
			const isAuth = await checkAuth();
			if (!isAuth) {
				navigate("/login");
			}
		};

		// checkAuthentication();
	}, [isAuthenticated, authLoading, navigate]);

	// Configura Socket.io após autenticação
	useEffect(() => {
		if (isAuthenticated && user) {
			socketService.initializeSocket();

			return () => {
				const socket = socketService.getSocket();
				if (socket) {
					socket.disconnect();
				}
			};
		}
	}, [isAuthenticated, user]);

	// Carrega conversas iniciais
	useEffect(() => {
		if (isAuthenticated) {
			fetchConversations();
		}
	}, [isAuthenticated, fetchConversations]);

	// Listener para redimensionamento da tela
	useEffect(() => {
		const handleResize = () => {
			setMobileView(window.innerWidth < 768);

			// Em mobile, mostra conversas se não tiver conversa ativa
			if (window.innerWidth < 768 && !activeConversation) {
				setShowConversations(true);
			}
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [activeConversation]);

	// Função para selecionar conversa
	const handleSelectConversation = (conversation) => {
		setActiveConversation(conversation._id);

		// Em mobile, esconde a lista de conversas
		if (mobileView) {
			setShowConversations(false);
		}
	};

	// Função para voltar para a lista de conversas (mobile)
	const handleBackToList = () => {
		setShowConversations(true);
	};

	// Função para abrir/fechar sidebar de perfil
	const toggleProfileSidebar = () => {
		setShowProfileSidebar(!showProfileSidebar);
	};

	if (authLoading) {
		return <Loader fullScreen message="Autenticando..." />;
	}

	if (!isAuthenticated) {
		return null; // Será redirecionado no useEffect
	}

	return (
		<div className="flex flex-col h-screen bg-gray-100">
			<Header user={user} toggleProfileSidebar={toggleProfileSidebar} />

			<div className="flex flex-1 overflow-hidden">
				{/* Sidebar com menu principal */}
				<Sidebar user={user} />

				{/* Container principal */}
				<div className="flex flex-1 overflow-hidden">
					{/* Lista de conversas - visível em desktop ou quando ativo em mobile */}
					{(!mobileView || showConversations) && (
						<div
							className={`${
								mobileView ? "w-full" : "w-80"
							} bg-white border-r border-gray-200 flex flex-col`}
						>
							<ConversationList
								conversations={conversations}
								activeId={activeConversation?._id}
								onSelectConversation={handleSelectConversation}
								isLoading={chatLoading}
							/>
						</div>
					)}

					{/* Janela de chat - visível em desktop ou quando não exibe lista em mobile */}
					{(!mobileView || !showConversations) && (
						<div className="flex-1 flex flex-col bg-white">
							{activeConversation ? (
								<ChatWindow
									conversation={activeConversation}
									onBack={
										mobileView ? handleBackToList : null
									}
								/>
							) : (
								<EmptyState message="Selecione uma conversa ou inicie um novo chat" />
							)}
						</div>
					)}

					{/* Sidebar de perfil - visível quando ativado */}
					{showProfileSidebar && (
						<ProfileSidebar
							user={user}
							onClose={toggleProfileSidebar}
						/>
					)}
				</div>
			</div>
		</div>
	);
};

export default Chat;
