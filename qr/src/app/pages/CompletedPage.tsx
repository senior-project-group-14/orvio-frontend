import { CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router";
import { FridgeIcon } from "../components/FridgeIcon";

export function CompletedPage() {
  const navigate = useNavigate();

  const handleViewPurchase = () => {
    navigate("/purchase-details", { replace: true });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Large success checkmark icon - BLUE */}
        <div className="flex justify-center">
          <div className="w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-20 h-20 text-blue-500" strokeWidth={2.5} />
          </div>
        </div>

        {/* Success message */}
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold text-gray-900">
            Thank you for choosing us!
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Your session has been successfully completed.
          </p>
        </div>

        {/* Fridge icon illustration for brand identity */}
        <div className="w-full py-4 flex justify-center">
          <FridgeIcon className="w-40 h-48 opacity-60" />
        </div>

        {/* View Purchase button */}
        <div className="pt-4">
          <button
            onClick={handleViewPurchase}
            className="w-full min-h-[56px] bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium py-4 px-6 rounded-2xl shadow-sm transition-colors duration-200 text-lg touch-manipulation"
          >
            View My Purchase
          </button>
        </div>
      </div>
    </div>
  );
}