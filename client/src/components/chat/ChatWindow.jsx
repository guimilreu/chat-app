// client/src/components/chat/ChatWindow.js
import React, { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../store/authStore";
import { useChatStore } from "../../store/chatStore";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	BsArrowLeft,
	BsThreeDotsVertical,
	BsPaperclip,
	BsEmojiSmile,
	BsSend,
	BsPerson,
	BsCheck,
	BsCheckAll,
} from "react-icons/bs";
import Loader from "../common/Loader";
import MessageItem from "./MessageItem";
import socketService from "../../services/socketService";
import EmojiPicker from "emoji-picker-react";

const ChatWindow = ({ conversation, onBack }) => {
	const { user } = useAuthStore();
	const {
		messages,
		isLoading,
		fetchMessages,
		loadMoreMessages,
		typingUsers,
	} = useChatStore();

	const [messageText, setMessageText] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [attachments, setAttachments] = useState([]);
	const [hasMoreMessages, setHasMoreMessages] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);

	const messagesEndRef = useRef(null);
	const messagesContainerRef = useRef(null);
	const typingTimeoutRef = useRef(null);

	// Carregar mensagens quando a conversa mudar
	useEffect(() => {
		if (conversation?._id) {
			fetchMessages(conversation._id);
			setHasMoreMessages(true);
		}
	}, [conversation, fetchMessages]);

	// Scroll para o final quando novas mensagens chegarem
	useEffect(() => {
		if (messagesEndRef.current && !loadingMore) {
			messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages, loadingMore]);

	// Detecta digitação e envia status
	useEffect(() => {
		if (!messageText) {
			if (isTyping) {
				setIsTyping(false);
				socketService.sendTypingStatus(conversation._id, false);
			}
			return;
		}

		// Se não estava digitando, sinaliza que começou
		if (!isTyping) {
			setIsTyping(true);
			socketService.sendTypingStatus(conversation._id, true);
		}

		// Limpa o timeout anterior se existir
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current);
		}

		// Define novo timeout
		typingTimeoutRef.current = setTimeout(() => {
			setIsTyping(false);
			socketService.sendTypingStatus(conversation._id, false);
		}, 3000);

		// Limpa o timeout quando o componente for desmontado
		return () => {
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current);
			}
		};
	}, [messageText, isTyping, conversation?._id]);

	// Scroll infinito para carregar mais mensagens
	const handleScroll = async () => {
		if (messagesContainerRef.current && hasMoreMessages && !loadingMore) {
			const { scrollTop } = messagesContainerRef.current;

			if (scrollTop === 0) {
				setLoadingMore(true);

				// Calcula altura atual para manter a posição
				const scrollHeight = messagesContainerRef.current.scrollHeight;

				// Carrega mais mensagens
				if (messages.length > 0) {
					const oldestMessage = messages[0];
					const newMessages = await loadMoreMessages(
						conversation._id,
						oldestMessage.createdAt
					);

					// Verifica se há mais mensagens para carregar
					if (!newMessages || newMessages.length === 0) {
						setHasMoreMessages(false);
					}

					// Restaura a posição de scroll
					setTimeout(() => {
						const newScrollHeight =
							messagesContainerRef.current.scrollHeight;
						messagesContainerRef.current.scrollTop =
							newScrollHeight - scrollHeight;
						setLoadingMore(false);
					}, 100);
				} else {
					setLoadingMore(false);
				}
			}
		}
	};

	// Enviar mensagem
	const handleSendMessage = () => {
		if (
			(!messageText || messageText.trim() === "") &&
			attachments.length === 0
		)
			return;

		socketService.sendMessage(
			conversation._id,
			messageText.trim(),
			attachments
		);
		setMessageText("");
		setAttachments([]);
		setShowEmojiPicker(false);
	};

	// Adicionar emoji ao texto
	const handleEmojiClick = (emojiData) => {
		setMessageText((prev) => prev + emojiData.emoji);
	};

	// Lidar com arquivos anexados
	const handleFileAttachment = (e) => {
		const files = Array.from(e.target.files);

		// Processar arquivos e criar URLs locais para preview
		const newAttachments = files.map((file) => {
			return {
				file,
				type: file.type.startsWith("image/")
					? "image"
					: file.type.startsWith("video/")
					? "video"
					: file.type.startsWith("audio/")
					? "audio"
					: "file",
				name: file.name,
				size: file.size,
				url: URL.createObjectURL(file),
				mimeType: file.type,
			};
		});

		setAttachments((prev) => [...prev, ...newAttachments]);

		// Limpa o input para permitir selecionar o mesmo arquivo novamente
		e.target.value = null;
	};

	// Remover anexo
	const handleRemoveAttachment = (index) => {
		setAttachments((prev) => {
			const newAttachments = [...prev];
			const removed = newAttachments.splice(index, 1)[0];

			// Revoga URL para liberar memória
			if (removed.url.startsWith("blob:")) {
				URL.revokeObjectURL(removed.url);
			}

			return newAttachments;
		});
	};

	// Formatar data para o cabeçalho
	const formatHeaderDate = (date) => {
		if (!date) return "";
		return new Date(date).toLocaleDateString("pt-BR", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	// Gerar nome da conversa
	const getConversationName = () => {
		if (conversation.isGroup) return conversation.name || "Grupo";

		const otherParticipant = conversation.participants?.find(
			(p) => p._id !== user?._id
		);

		return otherParticipant?.displayName || "Chat";
	};

	// Gerar avatar da conversa
	const getConversationAvatar = () => {
		if (conversation.isGroup) return conversation.groupAvatar || null;

		const otherParticipant = conversation.participants?.find(
			(p) => p._id !== user?._id
		);

		return otherParticipant?.avatar || null;
	};

	// Obter usuários que estão digitando
	const getTypingIndicator = () => {
		const typingUsersList = typingUsers[conversation._id] || [];

		// Filtra o usuário atual
		const otherTypingUsers = typingUsersList.filter(
			(id) => id !== user?._id
		);

		if (otherTypingUsers.length === 0) return null;

		// Busca nomes dos usuários que estão digitando
		const typingNames = otherTypingUsers.map((userId) => {
			const participant = conversation.participants?.find(
				(p) => p._id === userId
			);
			return participant?.displayName || "Alguém";
		});

		if (typingNames.length === 1) {
			return `${typingNames[0]} está digitando...`;
		} else if (typingNames.length === 2) {
			return `${typingNames[0]} e ${typingNames[1]} estão digitando...`;
		} else {
			return "Várias pessoas estão digitando...";
		}
	};

	// Gerar status da conversa
	const getConversationStatus = () => {
		if (conversation.isGroup) {
			return `${conversation.participants?.length || 0} participantes`;
		}

		const otherParticipant = conversation.participants?.find(
			(p) => p._id !== user?._id
		);

		if (!otherParticipant) return "";

		if (otherParticipant.status === "online") return "Online";
		if (otherParticipant.lastSeen) {
			return `Visto por último ${formatDistanceToNow(
				new Date(otherParticipant.lastSeen),
				{
					addSuffix: true,
					locale: ptBR,
				}
			)}`;
		}

		return "Offline";
	};

	return (
		<div className="flex flex-col h-full">
			{/* Cabeçalho */}
			<div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center">
				{onBack && (
					<button
						onClick={onBack}
						className="mr-2 text-gray-600 hover:text-gray-900"
					>
						<BsArrowLeft className="text-xl" />
					</button>
				)}

				<div className="flex items-center flex-1">
					{getConversationAvatar() ? (
						<img
							src={getConversationAvatar()}
							alt={getConversationName()}
							className="w-10 h-10 rounded-full object-cover"
						/>
					) : (
						<div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
							{conversation.isGroup ? (
								<BsPeople className="text-indigo-600 text-xl" />
							) : (
								<BsPerson className="text-indigo-600 text-xl" />
							)}
						</div>
					)}

					<div className="ml-3">
						<h2 className="text-lg font-semibold text-gray-800">
							{getConversationName()}
						</h2>
						<p className="text-xs text-gray-500">
							{getConversationStatus()}
						</p>
					</div>
				</div>

				<button className="text-gray-600 hover:text-gray-900 p-2">
					<BsThreeDotsVertical />
				</button>
			</div>

			{/* Área de mensagens */}
			<div
				ref={messagesContainerRef}
				className="flex-1 overflow-y-auto p-4 bg-gray-50"
				onScroll={handleScroll}
			>
				{isLoading ? (
					<Loader message="Carregando mensagens..." />
				) : (
					<>
						{loadingMore && (
							<div className="flex justify-center my-2">
								<div className="text-sm text-gray-500">
									Carregando mensagens anteriores...
								</div>
							</div>
						)}

						{messages.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full">
								<div className="text-lg text-gray-500 mb-2">
									Nenhuma mensagem
								</div>
								<p className="text-sm text-gray-400">
									Seja o primeiro a enviar uma mensagem nesta
									conversa
								</p>
							</div>
						) : (
							<>
								{messages.map((message, index) => {
									// Verificar se precisa exibir data
									const showDate =
										index === 0 ||
										new Date(
											message.createdAt
										).toDateString() !==
											new Date(
												messages[index - 1].createdAt
											).toDateString();

									return (
										<React.Fragment key={message._id}>
											{showDate && (
												<div className="flex justify-center my-4">
													<div className="bg-gray-200 rounded-full px-3 py-1 text-xs text-gray-600">
														{formatHeaderDate(
															message.createdAt
														)}
													</div>
												</div>
											)}

											<MessageItem
												message={message}
												isMine={
													message.sender._id ===
													user?._id
												}
												showSender={
													conversation.isGroup &&
													message.sender._id !==
														user?._id
												}
											/>
										</React.Fragment>
									);
								})}
							</>
						)}

						{/* Indicador de digitação */}
						{getTypingIndicator() && (
							<div className="flex items-center mt-2 ml-4">
								<div className="typing-indicator">
									<span></span>
									<span></span>
									<span></span>
								</div>
								<span className="text-xs text-gray-500 ml-2">
									{getTypingIndicator()}
								</span>
							</div>
						)}

						<div ref={messagesEndRef} />
					</>
				)}
			</div>

			{/* Área de anexos */}
			{attachments.length > 0 && (
				<div className="p-2 bg-gray-100 border-t border-gray-200 flex flex-wrap gap-2">
					{attachments.map((attachment, index) => (
						<div
							key={index}
							className="relative bg-white rounded-md p-2 border border-gray-300"
						>
							{attachment.type === "image" ? (
								<img
									src={attachment.url}
									alt={attachment.name}
									className="h-20 w-auto object-cover rounded"
								/>
							) : (
								<div className="flex items-center">
									<div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-2">
										<BsPaperclip className="text-indigo-600" />
									</div>
									<span className="text-sm truncate max-w-xs">
										{attachment.name}
									</span>
								</div>
							)}

							<button
								className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
								onClick={() => handleRemoveAttachment(index)}
							>
								×
							</button>
						</div>
					))}
				</div>
			)}

			{/* Área de input */}
			<div className="p-3 bg-white border-t border-gray-200">
				<div className="flex items-end gap-2">
					<div className="relative flex-1">
						<textarea
							value={messageText}
							onChange={(e) => setMessageText(e.target.value)}
							placeholder="Digite sua mensagem..."
							className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
							rows="1"
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									handleSendMessage();
								}
							}}
						/>

						<div className="absolute bottom-2 right-2 flex gap-2">
							<button
								type="button"
								className="text-gray-500 hover:text-indigo-600 relative"
								onClick={() =>
									setShowEmojiPicker((prev) => !prev)
								}
							>
								<BsEmojiSmile />
							</button>

							<label className="text-gray-500 hover:text-indigo-600 cursor-pointer">
								<BsPaperclip />
								<input
									type="file"
									className="hidden"
									onChange={handleFileAttachment}
									multiple
								/>
							</label>
						</div>

						{showEmojiPicker && (
							<div className="absolute bottom-12 right-0 z-10">
								<EmojiPicker
									onEmojiClick={handleEmojiClick}
									width={300}
									height={400}
								/>
							</div>
						)}
					</div>

					<button
						onClick={handleSendMessage}
						disabled={
							(!messageText || messageText.trim() === "") &&
							attachments.length === 0
						}
						className={`p-3 rounded-full ${
							(!messageText || messageText.trim() === "") &&
							attachments.length === 0
								? "bg-gray-200 text-gray-400 cursor-not-allowed"
								: "bg-indigo-600 text-white hover:bg-indigo-700"
						}`}
					>
						<BsSend />
					</button>
				</div>
			</div>
		</div>
	);
};

export default ChatWindow;
