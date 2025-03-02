// client/src/components/chat/EmptyState.js
import React from "react";
import { BsChatDots } from "react-icons/bs";

const EmptyState = ({
	message = "Selecione uma conversa",
	icon: Icon = BsChatDots,
}) => {
	return (
		<div className="flex flex-col items-center justify-center h-full bg-gray-50 p-4">
			<div className="bg-indigo-100 rounded-full p-5 mb-4">
				<Icon className="text-indigo-600 text-3xl" />
			</div>
			<h2 className="text-xl font-semibold text-gray-700 mb-2">
				Nenhuma conversa selecionada
			</h2>
			<p className="text-gray-500 text-center max-w-md">{message}</p>
		</div>
	);
};

export default EmptyState;
