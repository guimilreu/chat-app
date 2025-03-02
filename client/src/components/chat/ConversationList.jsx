// client/src/components/chat/ConversationList.js
import React, { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { useChatStore } from "../../store/chatStore";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// Componentes e ícones
import Loader from "../common/Loader";
import { BsSearch, BsPlus, BsPerson, BsPeople } from "react-icons/bs";
import NewConversationModal from "./NewConversationModal";
import ConversationItem from "./ConversationItem";

const ConversationList = ({
	conversations = [],
	activeId,
	onSelectConversation,
	isLoading,
}) => {
	const { user } = useAuthStore();
	const { unreadCount } = useChatStore();

	const [searchTerm, setSearchTerm] = useState("");
	const [showNewChatModal, setShowNewChatModal] = useState(false);

	// Filtra conversas baseado na busca
	const filteredConversations = conversations.filter((conversation) => {
		if (!searchTerm) return true;

		// Para grupos, procura no nome do grupo
		if (conversation.isGroup && conversation.name) {
			return conversation.name
				.toLowerCase()
				.includes(searchTerm.toLowerCase());
		}

		// Para conversas diretas, procura no nome dos participantes
		const otherParticipants =
			conversation.participants?.filter((p) => p._id !== user?._id) || [];

		return otherParticipants.some((p) =>
			p.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
		);
	});

	// Agrupa por conversas recentes e outras
	const recentConversations = filteredConversations.filter(
		(c) => c.lastMessage || c.unreadCount > 0
	);

	const otherConversations = filteredConversations.filter(
		(c) => !c.lastMessage && c.unreadCount === 0
	);

	// Obtém nome da conversa
	const getConversationName = (conversation) => {
		if (conversation.isGroup) return conversation.name || "Grupo";

		const otherParticipant = conversation.participants?.find(
			(p) => p._id !== user?._id
		);

		return otherParticipant?.displayName || "Chat";
	};

	// Obtém avatar da conversa
	const getConversationAvatar = (conversation) => {
		if (conversation.isGroup) return conversation.groupAvatar || null;

		const otherParticipant = conversation.participants?.find(
			(p) => p._id !== user?._id
		);

		return otherParticipant?.avatar || null;
	};

	// Obtém status online da conversa (para chats diretos)
	const getConversationStatus = (conversation) => {
		if (conversation.isGroup) return null;

		const otherParticipant = conversation.participants?.find(
			(p) => p._id !== user?._id
		);

		return otherParticipant?.status || "offline";
	};

	// Formata último acesso
	const formatLastSeen = (date) => {
		if (!date) return "Nunca";

		return formatDistanceToNow(new Date(date), {
			addSuffix: true,
			locale: ptBR,
		});
	};

	return (
		<>
			<div className="h-full flex flex-col overflow-hidden">
				{/* Cabeçalho */}
				<div className="p-4 border-b border-gray-200">
					<h2 className="text-xl font-semibold text-gray-800">
						Conversas
					</h2>
					<p className="text-sm text-gray-500">
						{unreadCount > 0
							? `${unreadCount} ${
									unreadCount === 1
										? "mensagem não lida"
										: "mensagens não lidas"
							  }`
							: "Todas as mensagens lidas"}
					</p>

					{/* Barra de busca */}
					<div className="mt-3 relative">
						<input
							type="text"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder="Buscar conversas..."
							className="w-full p-2 pl-10 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
						/>
						<BsSearch className="absolute left-3 top-3 text-gray-400" />
					</div>

					{/* Botão novo chat */}
					<button
						onClick={() => setShowNewChatModal(true)}
						className="w-full mt-3 flex items-center justify-center gap-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
					>
						<BsPlus className="text-xl" />
						<span>Nova Conversa</span>
					</button>
				</div>

				{/* Lista de conversas */}
				<div className="flex-1 overflow-y-auto">
					{isLoading ? (
						<Loader message="Carregando conversas..." />
					) : (
						<>
							{filteredConversations.length === 0 ? (
								<div className="p-4 text-center text-gray-500">
									{searchTerm
										? "Nenhuma conversa encontrada"
										: "Nenhuma conversa iniciada"}
								</div>
							) : (
								<>
									{/* Conversas recentes */}
									{recentConversations.length > 0 && (
										<div className="mb-2">
											<div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
												RECENTES
											</div>

											{recentConversations.map(
												(conversation) => (
													<ConversationItem
														key={conversation._id}
														conversation={
															conversation
														}
														name={getConversationName(
															conversation
														)}
														avatar={getConversationAvatar(
															conversation
														)}
														status={getConversationStatus(
															conversation
														)}
														lastMessage={
															conversation.lastMessage
														}
														unreadCount={
															conversation.unreadCount
														}
														isActive={
															activeId ===
															conversation._id
														}
														onClick={() =>
															onSelectConversation(
																conversation
															)
														}
														isGroup={
															conversation.isGroup
														}
													/>
												)
											)}
										</div>
									)}

									{/* Outras conversas */}
									{otherConversations.length > 0 && (
										<div>
											<div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
												OUTRAS CONVERSAS
											</div>

											{otherConversations.map(
												(conversation) => (
													<ConversationItem
														key={conversation._id}
														conversation={
															conversation
														}
														name={getConversationName(
															conversation
														)}
														avatar={getConversationAvatar(
															conversation
														)}
														status={getConversationStatus(
															conversation
														)}
														lastMessage={null}
														unreadCount={0}
														isActive={
															activeId ===
															conversation._id
														}
														onClick={() =>
															onSelectConversation(
																conversation
															)
														}
														isGroup={
															conversation.isGroup
														}
													/>
												)
											)}
										</div>
									)}
								</>
							)}
						</>
					)}
				</div>

				{/* Footer com status de usuário */}
				<div className="p-3 border-t border-gray-200 bg-gray-50">
					<div className="flex items-center">
						<div className="relative">
							<img
								src={user?.avatar}
								alt={user?.displayName}
								className="w-10 h-10 rounded-full object-cover"
							/>
							<span
								className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
									user?.status === "online"
										? "bg-green-500"
										: user?.status === "away"
										? "bg-yellow-500"
										: user?.status === "busy"
										? "bg-red-500"
										: "bg-gray-400"
								}`}
							/>
						</div>
						<div className="ml-3 flex-1">
							<p className="text-sm font-medium text-gray-900 truncate">
								{user?.displayName}
							</p>
							<p className="text-xs text-gray-500">
								{user?.status === "online"
									? "Online"
									: user?.status === "away"
									? "Ausente"
									: user?.status === "busy"
									? "Ocupado"
									: "Offline"}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Modal para nova conversa */}
			{showNewChatModal && (
				<NewConversationModal
					onClose={() => setShowNewChatModal(false)}
					onConversationCreated={(conversation) => {
						setShowNewChatModal(false);
						onSelectConversation(conversation);
					}}
				/>
			)}
		</>
	);
};

export default ConversationList;
