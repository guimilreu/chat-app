// client/src/components/chat/ConversationItem.js
import React from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BsPerson, BsPeople } from "react-icons/bs";

const ConversationItem = ({
	conversation,
	name,
	avatar,
	status,
	lastMessage,
	unreadCount,
	isActive,
	onClick,
	isGroup,
}) => {
	// Formata data da última mensagem
	const formatMessageDate = (date) => {
		if (!date) return "";

		return formatDistanceToNow(new Date(date), {
			addSuffix: true,
			locale: ptBR,
		});
	};

	// Trunca conteúdo da mensagem
	const truncateContent = (content, maxLength = 30) => {
		if (!content) return "";
		if (content.length <= maxLength) return content;

		return content.substring(0, maxLength) + "...";
	};

	// Texto da última mensagem
	const getLastMessageText = () => {
		if (!lastMessage) return "Nenhuma mensagem";

		if (lastMessage.isDeleted) {
			return "Esta mensagem foi excluída";
		}

		if (lastMessage.attachments?.length > 0) {
			if (lastMessage.content) {
				return lastMessage.content;
			}

			const attachmentType = lastMessage.attachments[0].type;

			switch (attachmentType) {
				case "image":
					return "Imagem";
				case "video":
					return "Vídeo";
				case "audio":
					return "Áudio";
				default:
					return "Arquivo";
			}
		}

		return lastMessage.content || "";
	};

	return (
		<div
			className={`px-4 py-3 cursor-pointer transition-colors ${
				isActive
					? "bg-indigo-50 border-l-4 border-indigo-500"
					: "hover:bg-gray-50 border-l-4 border-transparent"
			}`}
			onClick={onClick}
		>
			<div className="flex items-start">
				{/* Avatar */}
				<div className="relative">
					{avatar ? (
						<img
							src={avatar}
							alt={name}
							className="w-12 h-12 rounded-full object-cover"
						/>
					) : (
						<div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
							{isGroup ? (
								<BsPeople className="text-indigo-600 text-xl" />
							) : (
								<BsPerson className="text-indigo-600 text-xl" />
							)}
						</div>
					)}

					{/* Status indicator (only for direct chats) */}
					{!isGroup && status && (
						<span
							className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
								status === "online"
									? "bg-green-500"
									: status === "away"
									? "bg-yellow-500"
									: status === "busy"
									? "bg-red-500"
									: "bg-gray-400"
							}`}
						/>
					)}
				</div>

				{/* Content */}
				<div className="ml-3 flex-1 min-w-0">
					<div className="flex justify-between items-start">
						<h3
							className={`text-sm font-medium ${
								unreadCount > 0
									? "text-gray-900 font-semibold"
									: "text-gray-700"
							} truncate`}
						>
							{name}
						</h3>

						{lastMessage && (
							<span className="text-xs text-gray-500">
								{formatMessageDate(lastMessage.createdAt)}
							</span>
						)}
					</div>

					<p
						className={`text-sm ${
							unreadCount > 0
								? "text-gray-900 font-medium"
								: "text-gray-500"
						} truncate`}
					>
						{getLastMessageText()}
					</p>
				</div>

				{/* Unread badge */}
				{unreadCount > 0 && (
					<div className="ml-2 bg-indigo-600 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
						{unreadCount > 9 ? "9+" : unreadCount}
					</div>
				)}
			</div>
		</div>
	);
};

export default ConversationItem;
