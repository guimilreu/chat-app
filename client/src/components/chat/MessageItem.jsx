// client/src/components/chat/MessageItem.js
import React, { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	BsCheckAll,
	BsCheck,
	BsThreeDotsVertical,
	BsReply,
	BsTrash,
	BsEmojiSmile,
} from "react-icons/bs";

const MessageItem = ({ message, isMine, showSender }) => {
	const [showOptions, setShowOptions] = useState(false);

	// Formata hora da mensagem
	const formatMessageTime = (date) => {
		return format(new Date(date), "HH:mm");
	};

	// Formata o conteúdo da mensagem com quebras de linha
	const formatContent = (content) => {
		if (!content) return null;

		return content.split("\n").map((line, index) => (
			<React.Fragment key={index}>
				{line}
				{index !== content.split("\n").length - 1 && <br />}
			</React.Fragment>
		));
	};

	// Renderiza status de leitura
	const renderReadStatus = () => {
		if (!isMine) return null;

		const isRead = message.readBy && message.readBy.length > 1;

		return isRead ? (
			<BsCheckAll className="text-indigo-500" />
		) : (
			<BsCheck className="text-gray-500" />
		);
	};

	// Renderiza anexos da mensagem
	const renderAttachments = () => {
		if (!message.attachments || message.attachments.length === 0)
			return null;

		return (
			<div className="mt-1 space-y-2">
				{message.attachments.map((attachment, index) => {
					switch (attachment.type) {
						case "image":
							return (
								<img
									key={index}
									src={attachment.url}
									alt="Imagem"
									className="max-w-xs rounded-md cursor-pointer"
									onClick={() =>
										window.open(attachment.url, "_blank")
									}
								/>
							);
						case "video":
							return (
								<video
									key={index}
									src={attachment.url}
									className="max-w-xs rounded-md"
									controls
								/>
							);
						case "audio":
							return (
								<audio
									key={index}
									src={attachment.url}
									className="max-w-full"
									controls
								/>
							);
						default:
							return (
								<div
									key={index}
									className="bg-white p-2 rounded-md border border-gray-200 flex items-center"
								>
									<svg
										className="w-6 h-6 text-gray-600 mr-2"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										></path>
									</svg>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">
											{attachment.name}
										</p>
										<p className="text-xs text-gray-500">
											{attachment.size
												? Math.round(
														attachment.size / 1024
												  ) + " KB"
												: "Arquivo"}
										</p>
									</div>
									<a
										href={attachment.url}
										download={attachment.name}
										className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
										target="_blank"
										rel="noopener noreferrer"
									>
										Baixar
									</a>
								</div>
							);
					}
				})}
			</div>
		);
	};

	return (
		<div
			className={`mb-4 flex ${isMine ? "justify-end" : "justify-start"}`}
			onMouseEnter={() => setShowOptions(true)}
			onMouseLeave={() => setShowOptions(false)}
		>
			<div
				className={`relative max-w-[70%] ${
					isMine
						? "bg-indigo-100 text-gray-800 rounded-tl-lg rounded-tr-sm rounded-bl-lg rounded-br-lg"
						: "bg-white text-gray-800 rounded-tl-sm rounded-tr-lg rounded-bl-lg rounded-br-lg shadow"
				} px-4 py-2`}
			>
				{/* Nome do remetente (para grupos) */}
				{showSender && (
					<div className="text-xs font-semibold text-indigo-700 mb-1">
						{message.sender.displayName}
					</div>
				)}

				{/* Mensagem respondida */}
				{message.replyTo && (
					<div className="mb-2 p-2 bg-gray-100 border-l-2 border-indigo-500 rounded text-xs text-gray-600">
						<div className="font-semibold">
							{message.replyTo.sender._id === message.sender._id
								? "Você"
								: message.replyTo.sender.displayName}
						</div>
						<div className="truncate">
							{message.replyTo.content || "Anexo"}
						</div>
					</div>
				)}

				{/* Conteúdo da mensagem */}
				{message.content && (
					<div className="text-sm whitespace-pre-line">
						{formatContent(message.content)}
					</div>
				)}

				{/* Anexos */}
				{renderAttachments()}

				{/* Opções e hora */}
				<div className="flex items-center justify-end mt-1 space-x-1">
					{showOptions && (
						<div className="flex gap-1 text-gray-500">
							<button
								className="p-1 hover:text-indigo-700 text-xs"
								title="Responder"
							>
								<BsReply />
							</button>

							<button
								className="p-1 hover:text-indigo-700 text-xs"
								title="Reagir"
							>
								<BsEmojiSmile />
							</button>

							{isMine && (
								<button
									className="p-1 hover:text-red-600 text-xs"
									title="Excluir"
								>
									<BsTrash />
								</button>
							)}
						</div>
					)}

					<div className="flex items-center text-[10px] text-gray-500 ml-1">
						{formatMessageTime(message.createdAt)}
						{message.isEdited && (
							<span className="ml-1">editado</span>
						)}
						<span className="ml-1">{renderReadStatus()}</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default MessageItem;
