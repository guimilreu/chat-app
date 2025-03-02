// client/src/components/layout/Header.js
import React from "react";
import { BsBell, BsGear, BsSearch, BsPersonCircle } from "react-icons/bs";
import { useChatStore } from "../../store/chatStore";

const Header = ({ user, toggleProfileSidebar }) => {
	const { friendRequests } = useChatStore();
	const [showSearch, setShowSearch] = React.useState(false);

	return (
		<header className="bg-white border-b border-gray-200 py-2 px-4">
			<div className="flex items-center justify-between">
				{/* Logo e título */}
				<div className="flex items-center space-x-3">
					<h1 className="text-xl font-bold text-indigo-700">
						ChatSync
					</h1>
					<span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
						Beta
					</span>
				</div>

				{/* Busca expandível */}
				<div
					className={`flex-1 mx-4 transition-all duration-300 ${
						showSearch ? "max-w-xl" : "max-w-0 overflow-hidden"
					}`}
				>
					<div className="relative">
						<input
							type="text"
							placeholder="Buscar mensagens, conversas, arquivos..."
							className="w-full p-2 pl-10 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
						/>
						<BsSearch className="absolute left-3 top-3 text-gray-400" />
					</div>
				</div>

				{/* Ações */}
				<div className="flex items-center space-x-3">
					{/* Botão de Busca */}
					<button
						onClick={() => setShowSearch(!showSearch)}
						className="p-2 text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-full"
					>
						<BsSearch className="text-lg" />
					</button>

					{/* Notificações */}
					<div className="relative">
						<button className="p-2 text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-full">
							<BsBell className="text-lg" />
						</button>

						{friendRequests.length > 0 && (
							<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
								{friendRequests.length > 9
									? "9+"
									: friendRequests.length}
							</span>
						)}
					</div>

					{/* Configurações */}
					<button className="p-2 text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-full">
						<BsGear className="text-lg" />
					</button>

					{/* Avatar do usuário */}
					<button
						onClick={toggleProfileSidebar}
						className="flex items-center space-x-2 p-1 hover:bg-gray-100 rounded-lg"
					>
						{user?.avatar ? (
							<img
								src={user.avatar}
								alt={user.displayName}
								className="w-8 h-8 rounded-full object-cover"
							/>
						) : (
							<BsPersonCircle className="w-8 h-8 text-gray-600" />
						)}
						<span className="text-sm font-medium text-gray-800 hidden md:block">
							{user?.displayName || "Usuário"}
						</span>
					</button>
				</div>
			</div>
		</header>
	);
};

export default Header;
