import { FridgeIcon } from "../components/FridgeIcon";

export function NoItemsPage() {
	const handleContactUs = () => {
		window.location.href = "mailto:support@orvio.app";
	};

	return (
		<div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
			<div className="w-full max-w-md text-center space-y-7">
				<div className="flex justify-center">
					<FridgeIcon className="w-36 h-48 opacity-60" />
				</div>

				<h1 className="text-3xl font-semibold text-gray-900">
					No Items Taken
				</h1>

				<p className="text-lg text-gray-600 leading-relaxed">
					You didn&apos;t select any items during your session.
				</p>

				<p className="text-base text-gray-500 leading-relaxed">
					Is there something we can help you with?
				</p>

				<p className="text-base text-gray-600 leading-relaxed px-2">
					We&apos;d love to hear your feedback about your experience.
				</p>

				<button
					onClick={handleContactUs}
					className="w-full min-h-[56px] bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium py-4 px-6 rounded-2xl shadow-sm transition-colors duration-200 text-lg touch-manipulation"
				>
					Contact Us
				</button>
			</div>
		</div>
	);
}
