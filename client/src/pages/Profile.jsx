// client/src/pages/Profile.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import {
	BsArrowLeft,
	BsCamera,
	BsPersonCircle,
	BsPencil,
	BsShield,
	BsBell,
	BsMoon,
} from "react-icons/bs";
import Loader from "../components/common/Loader";
import Header from "../components/layout/Header";

const Profile = () => {
	const navigate = useNavigate();
	const { user, isAuthenticated, isLoading, updateProfile } = useAuthStore();

	const [isEditing, setIsEditing] = useState(false);
	const [displayName, setDisplayName] = useState("");
	const [bio, setBio] = useState("");
	const [status, setStatus] = useState("online");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	// Status options
	const statusOptions = [
		{ value: "online", label: "Online", color: "bg-green-500" },
		{ value: "away", label: "Ausente", color: "bg-yellow-500" },
		{ value: "busy", label: "Ocupado", color: "bg-red-500" },
		{ value: "offline", label: "Invisível", color: "bg-gray-400" },
	];

	// Inicializa dados do perfil quando o usuário for carregado
	useEffect(() => {
		if (user) {
			setDisplayName(user.displayName || "");
			setBio(user.bio || "");
			setStatus(user.status || "online");
		}
	}, [user]);

	// Redirects to login if not authenticated
	useEffect(() => {
		if (!isLoading && !isAuthenticated) {
			navigate("/login");
		}
	}, [isAuthenticated, isLoading, navigate]);

	// Save profile changes
	const handleSaveProfile = async () => {
		if (!displayName.trim()) {
			setError("Nome de exibição é obrigatório");
			return;
		}

		setSaving(true);
		setError(null);

		try {
			await updateProfile({
				displayName: displayName.trim(),
				bio: bio.trim(),
				status,
			});

			setIsEditing(false);
		} catch (err) {
			setError(err.response?.data?.message || "Erro ao atualizar perfil");
		} finally {
			setSaving(false);
		}
	};

	// Cancel editing and reset to original values
	const handleCancelEdit = () => {
		setDisplayName(user.displayName || "");
		setBio(user.bio || "");
		setStatus(user.status || "online");
		setIsEditing(false);
		setError(null);
	};

	if (isLoading) {
		return <Loader fullScreen message="Carregando perfil..." />;
	}

	if (!user) {
		return null; // will redirect in the useEffect
	}

	return (
		<div className="min-h-screen bg-gray-100 flex flex-col">
			<Header user={user} />

			<div className="flex-1 max-w-2xl mx-auto w-full p-4">
				<div className="bg-white rounded-xl shadow-md overflow-hidden">
					{/* Cover and Back Button */}
					<div className="relative">
						<div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
						<button
							onClick={() => navigate("/chat")}
							className="absolute top-4 left-4 bg-white bg-opacity-80 p-2 rounded-full text-gray-700 hover:bg-opacity-100"
						>
							<BsArrowLeft className="text-xl" />
						</button>

						{/* Profile Picture */}
						<div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
							<div className="relative">
								{user.avatar ? (
									<img
										src={user.avatar}
										alt={user.displayName}
										className="w-32 h-32 rounded-full border-4 border-white object-cover"
									/>
								) : (
									<div className="w-32 h-32 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center">
										<BsPersonCircle className="text-gray-400 text-5xl" />
									</div>
								)}

								{isEditing && (
									<button className="absolute bottom-2 right-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700">
										<BsCamera />
									</button>
								)}
							</div>
						</div>
					</div>

					{/* Profile Content */}
					<div className="pt-20 pb-6 px-6">
						{isEditing ? (
							/* Editing Mode */
							<div className="space-y-4">
								<div>
									<label
										htmlFor="displayName"
										className="block text-sm font-medium text-gray-700 mb-1"
									>
										Nome de exibição
									</label>
									<input
										id="displayName"
										type="text"
										value={displayName}
										onChange={(e) =>
											setDisplayName(e.target.value)
										}
										className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										placeholder="Seu nome"
									/>
								</div>

								<div>
									<label
										htmlFor="bio"
										className="block text-sm font-medium text-gray-700 mb-1"
									>
										Bio
									</label>
									<textarea
										id="bio"
										value={bio}
										onChange={(e) => setBio(e.target.value)}
										rows="3"
										maxLength="200"
										className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
										placeholder="Conte um pouco sobre você"
									/>
									<p className="text-xs text-gray-500 text-right mt-1">
										{bio.length}/200 caracteres
									</p>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Status
									</label>
									<div className="grid grid-cols-4 gap-2">
										{statusOptions.map((option) => (
											<button
												key={option.value}
												onClick={() =>
													setStatus(option.value)
												}
												className={`p-2 border rounded-lg flex items-center justify-center space-x-2 ${
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

								{error && (
									<div className="p-2 bg-red-100 text-red-700 rounded-md text-sm">
										{error}
									</div>
								)}

								<div className="flex space-x-2 pt-4">
									<button
										onClick={handleCancelEdit}
										className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
									>
										Cancelar
									</button>
									<button
										onClick={handleSaveProfile}
										disabled={saving || !displayName.trim()}
										className={`flex-1 py-2 rounded-lg text-white ${
											saving || !displayName.trim()
												? "bg-indigo-300 cursor-not-allowed"
												: "bg-indigo-600 hover:bg-indigo-700"
										}`}
									>
										{saving ? "Salvando..." : "Salvar"}
									</button>
								</div>
							</div>
						) : (
							/* Display Mode */
							<div>
								<div className="text-center">
									<h1 className="text-2xl font-bold text-gray-800">
										{user.displayName}
									</h1>
									<div className="flex items-center justify-center mt-1">
										<span
											className={`w-3 h-3 rounded-full ${
												user.status === "online"
													? "bg-green-500"
													: user.status === "away"
													? "bg-yellow-500"
													: user.status === "busy"
													? "bg-red-500"
													: "bg-gray-400"
											}`}
										></span>
										<span className="text-sm text-gray-500 ml-1">
											{user.status === "online"
												? "Online"
												: user.status === "away"
												? "Ausente"
												: user.status === "busy"
												? "Ocupado"
												: "Offline"}
										</span>
									</div>
									<p className="text-gray-600 mt-2">
										{user.email}
									</p>
								</div>

								{user.bio && (
									<div className="mt-6 text-center">
										<p className="text-gray-700">
											{user.bio}
										</p>
									</div>
								)}

								<div className="mt-8">
									<button
										onClick={() => setIsEditing(true)}
										className="w-full py-2 border border-indigo-500 rounded-lg text-indigo-600 hover:bg-indigo-50 flex items-center justify-center space-x-2"
									>
										<BsPencil />
										<span>Editar Perfil</span>
									</button>
								</div>

								<div className="mt-8 pt-6 border-t border-gray-200">
									<h2 className="text-lg font-semibold text-gray-700 mb-4">
										Configurações
									</h2>

									<ul className="space-y-2">
										<li>
											<button className="w-full py-3 px-4 flex items-center text-left hover:bg-gray-50 rounded-lg">
												<BsShield className="text-gray-500 mr-3" />
												<div>
													<span className="font-medium text-gray-800">
														Privacidade e Segurança
													</span>
													<p className="text-sm text-gray-500">
														Gerencie suas
														configurações de
														privacidade
													</p>
												</div>
											</button>
										</li>
										<li>
											<button className="w-full py-3 px-4 flex items-center text-left hover:bg-gray-50 rounded-lg">
												<BsBell className="text-gray-500 mr-3" />
												<div>
													<span className="font-medium text-gray-800">
														Notificações
													</span>
													<p className="text-sm text-gray-500">
														Configure como deseja
														ser notificado
													</p>
												</div>
											</button>
										</li>
										<li>
											<button className="w-full py-3 px-4 flex items-center text-left hover:bg-gray-50 rounded-lg">
												<BsMoon className="text-gray-500 mr-3" />
												<div>
													<span className="font-medium text-gray-800">
														Aparência
													</span>
													<p className="text-sm text-gray-500">
														Personalize sua
														experiência visual
													</p>
												</div>
											</button>
										</li>
									</ul>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default Profile;
