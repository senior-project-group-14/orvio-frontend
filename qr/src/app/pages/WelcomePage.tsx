import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { FridgeIcon } from "../components/FridgeIcon";

export function WelcomePage() {
  const navigate = useNavigate();
  const { device_id } = useParams();
  const [isStartingSession, setIsStartingSession] = useState(false);

  const getBaseUrl = () => {
    const url = import.meta.env.VITE_BACKEND_URL;
    if (url && String(url).trim()) {
      return String(url).replace(/\/$/, "");
    }
    return "/api";
  };

  const handleStartSession = async () => {
    if (!device_id) {
      console.error("Device ID is missing from the URL.");
      return;
    }

    setIsStartingSession(true);

    try {
      const response = await fetch(`${getBaseUrl()}/devices/${encodeURIComponent(device_id)}/sessions/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_id,
          started_at: new Date().toISOString(),
          transaction_type: "QR",
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        transaction_id?: string;
        session_id?: string;
        device_id?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Failed to start session.");
      }
      const transactionId = payload.transaction_id || payload.session_id;
      if (transactionId) {
        localStorage.setItem("orvio_transaction_id", transactionId);
      }
      localStorage.setItem("orvio_device_id", payload.device_id || device_id);

      navigate("/cart", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start session.";
      console.error(message);
    } finally {
      setIsStartingSession(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Hero fridge visual - upper half */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12">
        <div className="w-full max-w-md">
          {/* Smart fridge icon illustration */}
          <div className="w-full mb-8 flex justify-center">
            <FridgeIcon className="w-48 h-64" />
          </div>

          {/* Welcome text */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-semibold text-gray-900">
              Welcome!
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Start your smart shopping session with our AI-powered cooler.
            </p>
            
            {/* Session information message */}
            <div className="pt-4 pb-2">
              <p className="text-base text-gray-700 leading-relaxed">
                Your 60-second session will begin as soon as you press Start Session.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Button in lower thumb-reach zone */}
      <div className="px-6 pb-8 pt-4">
        <button
          onClick={handleStartSession}
          disabled={isStartingSession}
          className="w-full min-h-[56px] bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium py-4 px-6 rounded-2xl shadow-sm transition-colors duration-200 text-lg touch-manipulation"
        >
          Start Session
        </button>
        
        {/* Disclaimer */}
        <p className="text-xs text-gray-400 text-center leading-relaxed mt-4">
          By starting the session, you agree to all applicable terms, conditions, and policies.
        </p>
      </div>
    </div>
  );
}