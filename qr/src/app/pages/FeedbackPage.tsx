import { useNavigate } from "react-router";
import { FridgeIcon } from "../components/FridgeIcon";

export function FeedbackPage() {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate("/", { replace: true });
  };

  const handleContactUs = () => {
    window.location.href = "mailto:support@orvio.app";
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Beverage cooler icon illustration */}
        <div className="flex justify-center">
          <FridgeIcon className="w-40 h-52 opacity-60" />
        </div>

        {/* Feedback message */}
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold text-gray-900">
            We're sorry we missed you
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            You did not complete your session. We'd love to improve your experience.
          </p>
          <p className="text-base text-gray-500 pt-2">
            What could we do better?
          </p>
        </div>

        {/* Supporting text */}
        <div className="pt-2">
          <p className="text-base text-gray-600">
            Help us improve your experience by sharing your feedback.
          </p>
        </div>

        {/* Action buttons */}
        <div className="space-y-3 pt-4">
          {/* Primary Contact Us button */}
          <button
            onClick={handleContactUs}
            className="w-full min-h-[56px] bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium py-4 px-6 rounded-2xl shadow-sm transition-colors duration-200 text-lg touch-manipulation"
          >
            Contact Us
          </button>
        </div>
      </div>
    </div>
  );
}