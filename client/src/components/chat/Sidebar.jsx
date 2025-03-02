// client/src/components/chat/Sidebar.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useChatStore } from "../../store/chatStore";
import {
	BsChatDots,
	BsPeople,
	BsBell,
	BsGear,
	BsBoxArrowRight,
	BsMoon,
	BsSun,
	BsPerson,
} from "react-icons/bs";

const Sidebar = ({ user }) => {
	const navigate = useNavigate();
	const { logout } = useAuthStore();
	const { unreadCount, friendRequests } = useChatStore();

	const [darkMode, setDarkMode] = React.useState(
		window.matchMedia("(prefers-color-scheme: dark)").matches
	);

	// Função para alternar tema claro/escuro
	const toggleDarkMode = () => {
		setDarkMode(!darkMode);
		// Aqui você implementaria a troca real do tema
	};

	// Função para fazer logout
	const handleLogout = async () => {
		await logout();
		navigate("/login");
	};

	// Itens do menu
	const menuItems = [
		{
			icon: BsChatDots,
			label: "Chats",
			badge: unreadCount > 0 ? unreadCount : null,
			badgeColor: "bg-indigo-600",
			action: () => navigate("/chat"),
		},
		{
			icon: BsPerson,
			label: "Perfil",
			action: () => navigate("/profile"),
		},
		{
			icon: BsPeople,
			label: "Amigos",
			action: () => navigate("/friends"),
		},
		{
			icon: BsBell,
			label: "Notificações",
			badge: friendRequests.length > 0 ? friendRequests.length : null,
			badgeColor: "bg-yellow-500",
			action: () => navigate("/notifications"),
		},
		{
			icon: BsGear,
			label: "Configurações",
			action: () => navigate("/settings"),
		},
	];

	return (
		<div className="w-16 lg:w-20 bg-indigo-800 text-white flex flex-col items-center py-6">
			{/* Logo */}
			<div className="mb-8">
				<div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
					<BsChatDots className="text-indigo-800 text-xl" />
				</div>
			</div>

			{/* Menu de navegação */}
			<div className="flex-1 flex flex-col items-center space-y-6">
				{menuItems.map((item, index) => (
					<div
						key={index}
						className="relative group"
						onClick={item.action}
					>
						<button className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-700 hover:bg-indigo-600 transition-colors">
							<item.icon className="text-xl" />
						</button>

						{/* Badge (se houver) */}
						{item.badge && (
							<span
								className={`absolute -top-1 -right-1 flex items-center justify-center ${item.badgeColor} text-white text-xs font-bold rounded-full w-5 h-5`}
							>
								{item.badge > 9 ? "9+" : item.badge}
							</span>
						)}

						{/* Tooltip */}
						<div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap">
							{item.label}
						</div>
					</div>
				))}
			</div>

			{/* Ações inferiores */}
			<div className="mt-auto space-y-6">
				{/* Alternar tema */}
				<button
					onClick={toggleDarkMode}
					className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-700 hover:bg-indigo-600 transition-colors group relative"
				>
					{darkMode ? (
						<BsSun className="text-xl" />
					) : (
						<BsMoon className="text-xl" />
					)}

					{/* Tooltip */}
					<div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap">
						Modo {darkMode ? "Claro" : "Escuro"}
					</div>
				</button>

				{/* Logout */}
				<button
					onClick={handleLogout}
					className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-700 hover:bg-red-600 transition-colors group relative"
				>
					<BsBoxArrowRight className="text-xl" />

					{/* Tooltip */}
					<div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap">
						Sair
					</div>
				</button>
			</div>
		</div>
	);
};

export default Sidebar;
