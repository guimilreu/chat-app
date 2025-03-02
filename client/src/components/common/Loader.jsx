// client/src/components/common/Loader.js
import React from "react";

const Loader = ({ message = "Carregando...", fullScreen = false }) => {
	if (fullScreen) {
		return (
			<div className="fixed inset-0 bg-white bg-opacity-75 flex flex-col items-center justify-center z-50">
				<div className="spinner">
					<div className="bounce1"></div>
					<div className="bounce2"></div>
					<div className="bounce3"></div>
				</div>
				<p className="mt-4 text-gray-700">{message}</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center justify-center py-8">
			<div className="spinner">
				<div className="bounce1"></div>
				<div className="bounce2"></div>
				<div className="bounce3"></div>
			</div>
			<p className="mt-4 text-gray-500 text-sm">{message}</p>
		</div>
	);
};

export default Loader;
