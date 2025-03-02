// client/src/components/chat/NewConversationModal.js
import React, { useState, useEffect } from "react";
import { useChatStore } from "../../store/chatStore";
import { BsX, BsPerson, BsPeople, BsSearch, BsCheck } from "react-icons/bs";

const NewConversationModal = ({ onClose, onConversationCreated }) => {
	const {
		searchUsers,
		users,
		createConversation,
		isLoading,
		error,
		clearError,
	} = useChatStore();

	const [searchTerm, setSearchTerm] = useState("");
	const [isGroup, setIsGroup] = useState(false);
	const [groupName, setGroupName] = useState("");
	const [selectedUsers, setSelectedUsers] = useState([]);
	const [step, setStep] = useState(1); // 1: selecionar usuários, 2: configurar grupo (se for grupo)

	// Pesquisa usuários quando o termo mudar
	useEffect(() => {
		if (searchTerm.length >= 2) {
			const timer = setTimeout(() => {
				searchUsers(searchTerm);
			}, 300);

			return () => clearTimeout(timer);
		}
	}, [searchTerm, searchUsers]);

	// Limpa erro ao montar componente
	useEffect(() => {
		clearError();
	}, [clearError]);

	// Seleciona/desseleciona usuário
	const toggleUser = (user) => {
		if (selectedUsers.some((u) => u._id === user._id)) {
			setSelectedUsers(selectedUsers.filter((u) => u._id !== user._id));
		} else {
			setSelectedUsers([...selectedUsers, user]);
		}
	};

	// Avança para o próximo passo
	const handleNextStep = () => {
		if (isGroup) {
			setStep(2);
		} else {
			handleCreateConversation();
		}
	};

	// Cria conversa
	const handleCreateConversation = async () => {
		if (!isGroup && selectedUsers.length !== 1) {
			return;
		}

		if (isGroup && (selectedUsers.length < 2 || !groupName.trim())) {
			return;
		}

		const userIds = selectedUsers.map((user) => user._id);

		const newConversation = await createConversation(
			userIds,
			isGroup,
			isGroup ? groupName.trim() : null
		);

		if (newConversation) {
			onConversationCreated(newConversation);
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
				{/* Cabeçalho */}
				<div className="p-4 border-b border-gray-200 flex justify-between items-center">
					<h2 className="text-lg font-semibold text-gray-800">
						{step === 1 ? "Nova Conversa" : "Configurar Grupo"}
					</h2>
					<button
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700"
					>
						<BsX className="text-xl" />
					</button>
				</div>

				{/* Conteúdo */}
				<div className="flex-1 overflow-y-auto p-4">
					{step === 1 ? (
						<>
							{/* Seleção de tipo */}
							<div className="flex mb-4 bg-gray-100 rounded-lg p-1">
								<button
									className={`flex-1 py-2 rounded-md text-sm font-medium ${
										!isGroup
											? "bg-white text-indigo-600 shadow"
											: "text-gray-700 hover:bg-gray-200"
									}`}
									onClick={() => setIsGroup(false)}
								>
									<div className="flex items-center justify-center gap-2">
										<BsPerson />
										<span>Chat Individual</span>
									</div>
								</button>
								<button
									className={`flex-1 py-2 rounded-md text-sm font-medium ${
										isGroup
											? "bg-white text-indigo-600 shadow"
											: "text-gray-700 hover:bg-gray-200"
									}`}
									onClick={() => setIsGroup(true)}
								>
									<div className="flex items-center justify-center gap-2">
										<BsPeople />
										<span>Grupo</span>
									</div>
								</button>
							</div>

							{/* Barra de busca */}
							<div className="relative mb-4">
								<input
									type="text"
									value={searchTerm}
									onChange={(e) =>
										setSearchTerm(e.target.value)
									}
									placeholder="Buscar usuários..."
									className="w-full p-2 pl-10 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								/>
								<BsSearch className="absolute left-3 top-3 text-gray-400" />
							</div>

							{/* Lista de usuários */}
							<div className="space-y-2">
								{isLoading ? (
									<div className="text-center py-4">
										<div
											className="spinner-border text-indigo-500"
											role="status"
										>
											<span className="sr-only">
												Carregando...
											</span>
										</div>
									</div>
								) : (
									<>
										{users.length === 0 ? (
											<div className="text-center py-4 text-gray-500">
												{searchTerm.length < 2
													? "Digite pelo menos 2 caracteres para buscar"
													: "Nenhum usuário encontrado"}
											</div>
										) : (
											users.map((user) => (
												<div
													key={user._id}
													className={`flex items-center p-3 rounded-lg cursor-pointer ${
														selectedUsers.some(
															(u) =>
																u._id ===
																user._id
														)
															? "bg-indigo-50 border border-indigo-200"
															: "hover:bg-gray-100"
													}`}
													onClick={() =>
														toggleUser(user)
													}
												>
													{user.avatar ? (
														<img
															src={user.avatar}
															alt={
																user.displayName
															}
															className="w-10 h-10 rounded-full object-cover"
														/>
													) : (
														<div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
															<BsPerson className="text-indigo-600 text-xl" />
														</div>
													)}

													<div className="ml-3 flex-1">
														<p className="text-sm font-medium text-gray-900">
															{user.displayName}
														</p>
														<p className="text-xs text-gray-500">
															{user.email}
														</p>
													</div>

													{selectedUsers.some(
														(u) =>
															u._id === user._id
													) && (
														<div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
															<BsCheck className="text-white" />
														</div>
													)}
												</div>
											))
										)}
									</>
								)}
							</div>

							{/* Selecionados */}
							{selectedUsers.length > 0 && (
								<div className="mt-4">
									<h3 className="text-sm font-medium text-gray-700 mb-2">
										Selecionados ({selectedUsers.length})
									</h3>
									<div className="flex flex-wrap gap-2">
										{selectedUsers.map((user) => (
											<div
												key={user._id}
												className="flex items-center bg-indigo-100 rounded-full px-3 py-1"
											>
												<span className="text-xs text-indigo-800">
													{user.displayName}
												</span>
												<button
													className="ml-1 text-indigo-600 hover:text-indigo-800"
													onClick={(e) => {
														e.stopPropagation();
														toggleUser(user);
													}}
												>
													<BsX />
												</button>
											</div>
										))}
									</div>
								</div>
							)}
						</>
					) : (
						// Configuração de grupo (step 2)
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Nome do Grupo
								</label>
								<input
									type="text"
									value={groupName}
									onChange={(e) =>
										setGroupName(e.target.value)
									}
									placeholder="Ex: Amigos da faculdade"
									className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Participantes ({selectedUsers.length})
								</label>
								<div className="p-3 bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
									{selectedUsers.map((user) => (
										<div
											key={user._id}
											className="flex items-center py-1"
										>
											{user.avatar ? (
												<img
													src={user.avatar}
													alt={user.displayName}
													className="w-6 h-6 rounded-full object-cover"
												/>
											) : (
												<div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
													<BsPerson className="text-indigo-600 text-xs" />
												</div>
											)}
											<span className="ml-2 text-sm text-gray-800">
												{user.displayName}
											</span>
										</div>
									))}
								</div>
							</div>
						</div>
					)}

					{/* Mensagens de erro */}
					{error && (
						<div className="mt-4 p-2 bg-red-100 text-red-800 rounded-md text-sm">
							{error}
						</div>
					)}
				</div>

				{/* Rodapé com botões */}
				<div className="p-4 border-t border-gray-200 flex justify-between">
					{step === 1 ? (
						<>
							<button
								onClick={onClose}
								className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
							>
								Cancelar
							</button>
							<button
								onClick={handleNextStep}
								disabled={
									(!isGroup && selectedUsers.length !== 1) ||
									(isGroup && selectedUsers.length < 2)
								}
								className={`px-4 py-2 text-sm text-white rounded-md ${
									(!isGroup && selectedUsers.length !== 1) ||
									(isGroup && selectedUsers.length < 2)
										? "bg-indigo-300 cursor-not-allowed"
										: "bg-indigo-600 hover:bg-indigo-700"
								}`}
							>
								{isGroup ? "Próximo" : "Iniciar Conversa"}
							</button>
						</>
					) : (
						<>
							<button
								onClick={() => setStep(1)}
								className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
							>
								Voltar
							</button>
							<button
								onClick={handleCreateConversation}
								disabled={!groupName.trim()}
								className={`px-4 py-2 text-sm text-white rounded-md ${
									!groupName.trim()
										? "bg-indigo-300 cursor-not-allowed"
										: "bg-indigo-600 hover:bg-indigo-700"
								}`}
							>
								Criar Grupo
							</button>
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default NewConversationModal;
