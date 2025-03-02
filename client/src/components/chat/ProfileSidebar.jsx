// client/src/components/chat/ProfileSidebar.js
import React, { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import {
	BsX,
	BsCamera,
	BsPencil,
	BsShield,
	BsBell,
	BsMoon,
	BsTrash,
} from "react-icons/bs";

const ProfileSidebar = ({ user, onClose }) => {
	const { updateProfile } = useAuthStore();

	const [isEditing, setIsEditing] = useState(false);
	const [displayName, setDisplayName] = useState(user?.displayName || "");
	const [bio, setBio] = useState(user?.bio || "");
	const [status, setStatus] = useState(user?.status || "online");
	const [loading, setLoading] = useState(false);

	// Opções de status
	const statusOptions = [
		{ value: "online", label: "Online", color: "bg-green-500" },
		{ value: "away", label: "Ausente", color: "bg-yellow-500" },
		{ value: "busy", label: "Ocupado", color: "bg-red-500" },
		{ value: "offline", label: "Invisível", color: "bg-gray-400" },
	];

	// Função para salvar alterações do perfil
	const handleSaveProfile = async () => {
		setLoading(true);

		try {
			await updateProfile({
				displayName,
				bio,
				status,
			});

			setIsEditing(false);
		} catch (error) {
			console.error("Erro ao atualizar perfil:", error);
		} finally {
			setLoading(false);
		}
	};

	// Cancela edição e restaura valores originais
	const handleCancelEdit = () => {
		setDisplayName(user?.displayName || "");
		setBio(user?.bio || "");
		setStatus(user?.status || "online");
		setIsEditing(false);
	};

	return (
		<div className="w-80 bg-white border-l border-gray-200 h-full flex flex-col">
			{/* Cabeçalho */}
			<div className="p-4 border-b border-gray-200 flex justify-between items-center">
				<h2 className="text-lg font-semibold text-gray-800">
					{isEditing ? "Editar Perfil" : "Perfil"}
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
				{/* Avatar e capa */}
				<div className="relative mb-6">
					<div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-lg"></div>

					<div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
						<div className="relative">
							<img
								src={user?.avatar}
								alt={user?.displayName}
								className="w-20 h-20 rounded-full border-4 border-white object-cover"
							/>

							{isEditing && (
								<button className="absolute bottom-0 right-0 p-1 bg-indigo-600 text-white rounded-full">
									<BsCamera />
								</button>
							)}
						</div>
					</div>
				</div>

				{/* Informações do perfil */}
				<div className="mt-10 space-y-4">
					{isEditing ? (
						// Modo de edição
						<>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Nome de exibição
								</label>
								<input
									type="text"
									value={displayName}
									onChange={(e) =>
										setDisplayName(e.target.value)
									}
									className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Bio
								</label>
								<textarea
									value={bio}
									onChange={(e) => setBio(e.target.value)}
									rows="3"
									className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
								/>
								<p className="text-xs text-gray-500 mt-1">
									{bio.length}/100 caracteres
								</p>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Status
								</label>
								<div className="grid grid-cols-2 gap-2">
									{statusOptions.map((option) => (
										<button
											key={option.value}
											onClick={() =>
												setStatus(option.value)
											}
											className={`p-2 border rounded-lg flex items-center space-x-2 ${
												status === option.value
													? "border-indigo-500 bg-indigo-50"
													: "border-gray-300 hover:bg-gray-50"
											}`}
										>
											<span
												className={`w-3 h-3 rounded-full ${option.color}`}
											></span>
											<span className="text-sm">
												{option.label}
											</span>
										</button>
									))}
								</div>
							</div>

							<div className="flex space-x-2 pt-4">
								<button
									onClick={handleCancelEdit}
									className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
								>
									Cancelar
								</button>
								<button
									onClick={handleSaveProfile}
									disabled={loading || !displayName.trim()}
									className={`flex-1 py-2 rounded-lg text-white ${
										loading || !displayName.trim()
											? "bg-indigo-300 cursor-not-allowed"
											: "bg-indigo-600 hover:bg-indigo-700"
									}`}
								>
									{loading ? "Salvando..." : "Salvar"}
								</button>
							</div>
						</>
					) : (
						// Modo de visualização
						<>
							<div className="text-center">
								<h3 className="text-xl font-semibold text-gray-800">
									{user?.displayName}
								</h3>
								<div className="flex items-center justify-center mt-1">
									<span
										className={`w-3 h-3 rounded-full ${
											user?.status === "online"
												? "bg-green-500"
												: user?.status === "away"
												? "bg-yellow-500"
												: user?.status === "busy"
												? "bg-red-500"
												: "bg-gray-400"
										}`}
									></span>
									<span className="text-sm text-gray-500 ml-1">
										{user?.status === "online"
											? "Online"
											: user?.status === "away"
											? "Ausente"
											: user?.status === "busy"
											? "Ocupado"
											: "Offline"}
									</span>
								</div>
								<p className="text-sm text-gray-600 mt-2">
									{user?.email}
								</p>
							</div>

							{user?.bio && (
								<div className="mt-4">
									<p className="text-sm text-gray-700">
										{user.bio}
									</p>
								</div>
							)}

							<button
								onClick={() => setIsEditing(true)}
								className="mt-4 w-full py-2 border border-indigo-500 rounded-lg text-indigo-600 hover:bg-indigo-50 flex items-center justify-center space-x-2"
							>
								<BsPencil />
								<span>Editar Perfil</span>
							</button>
						</>
					)}
				</div>

				{/* Seções adicionais (apenas modo visualização) */}
				{!isEditing && (
					<div className="mt-6 space-y-4">
						<div className="border-t border-gray-200 pt-4">
							<h4 className="font-medium text-gray-800 mb-2">
								Configurações
							</h4>

							<ul className="space-y-2">
								<li>
									<button className="w-full py-2 px-3 flex items-center text-left hover:bg-gray-50 rounded-lg">
										<BsShield className="text-gray-500 mr-3" />
										<span className="text-sm">
											Privacidade
										</span>
									</button>
								</li>
								<li>
									<button className="w-full py-2 px-3 flex items-center text-left hover:bg-gray-50 rounded-lg">
										<BsBell className="text-gray-500 mr-3" />
										<span className="text-sm">
											Notificações
										</span>
									</button>
								</li>
								<li>
									<button className="w-full py-2 px-3 flex items-center text-left hover:bg-gray-50 rounded-lg">
										<BsMoon className="text-gray-500 mr-3" />
										<span className="text-sm">
											Aparência
										</span>
									</button>
								</li>
							</ul>
						</div>

						<div className="border-t border-gray-200 pt-4">
							<button className="w-full py-2 px-3 flex items-center text-left text-red-600 hover:bg-red-50 rounded-lg">
								<BsTrash className="mr-3" />
								<span className="text-sm">Excluir conta</span>
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default ProfileSidebar;
