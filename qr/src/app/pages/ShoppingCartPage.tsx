import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Minus } from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

const SESSION_DURATION_SECONDS = 30;

export function ShoppingCartPage() {
  const navigate = useNavigate();
  const [isCompletingPurchase, setIsCompletingPurchase] = useState(false);
  const [isCancellingSession, setIsCancellingSession] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  
  // Mock cart data with pricing - simulating AI-detected items
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { id: "1", name: "Sparkling Water", quantity: 2, unitPrice: 2.99 },
    { id: "2", name: "Orange Juice", quantity: 1, unitPrice: 4.99 },
    { id: "3", name: "Greek Yogurt", quantity: 3, unitPrice: 3.49 },
  ]);

  // Session countdown timer (reload-safe, derived from backend start time)
  const [timeRemaining, setTimeRemaining] = useState(SESSION_DURATION_SECONDS);
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [autoCompleteCountdown, setAutoCompleteCountdown] = useState(10);

  const getBaseUrl = () => {
    const url = import.meta.env.VITE_BACKEND_URL;
    if (url && String(url).trim()) {
      return String(url).replace(/\/$/, "");
    }
    return "/api";
  };

  const getRemainingSeconds = (startedAtMs: number) => {
    const elapsedSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
    return Math.max(0, SESSION_DURATION_SECONDS - elapsedSeconds);
  };

  // Countdown is based on DB start_time so refresh does not reset the timer.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const initializeCountdown = async () => {
      try {
        const deviceId = localStorage.getItem("orvio_device_id");
        if (!deviceId) {
          throw new Error("Device ID not found. Please scan QR again.");
        }

        const response = await fetch(
          `${getBaseUrl()}/devices/${encodeURIComponent(deviceId)}/sessions/current`
        );

        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
          has_active_session?: boolean;
          transaction_id?: string | null;
          started_at?: string | null;
        };

        if (!response.ok) {
          throw new Error(payload.message || payload.error || "Failed to load session.");
        }

        if (!payload.has_active_session || !payload.started_at) {
          throw new Error("Active session not found.");
        }

        if (payload.transaction_id) {
          localStorage.setItem("orvio_transaction_id", payload.transaction_id);
        }

        const startedAtMs = new Date(payload.started_at).getTime();
        if (Number.isNaN(startedAtMs)) {
          throw new Error("Invalid session start time.");
        }

        const initialRemaining = getRemainingSeconds(startedAtMs);
        if (cancelled) {
          return;
        }

        setTimeRemaining(initialRemaining);

        if (initialRemaining <= 0) {
          setShowExpirationModal(true);
          return;
        }

        timer = setInterval(() => {
          const remaining = getRemainingSeconds(startedAtMs);
          setTimeRemaining(remaining);

          if (remaining <= 0) {
            if (timer) {
              clearInterval(timer);
            }
            setShowExpirationModal(true);
          }
        }, 1000);
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "Failed to initialize session timer.";
        setCompleteError(message);
        setTimeRemaining(0);
      }
    };

    void initializeCountdown();

    return () => {
      cancelled = true;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, []);

  // 10-second auto-complete countdown in modal
  useEffect(() => {
    if (showExpirationModal) {
      const autoCompleteTimer = setInterval(() => {
        setAutoCompleteCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(autoCompleteTimer);
            handleCompletePurchase();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(autoCompleteTimer);
    }
  }, [showExpirationModal]);

  const handleDecreaseQuantity = (itemId: string) => {
    setCartItems((prevItems) =>
      prevItems
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity: Math.max(0, item.quantity - 1) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleCompletePurchase = () => {
    void finalizeAndCompletePurchase();
  };

  const finalizeAndCompletePurchase = async () => {
    setCompleteError(null);
    setIsCompletingPurchase(true);

    try {
      const transactionId = localStorage.getItem("orvio_transaction_id");
      const deviceId = localStorage.getItem("orvio_device_id");

      if (transactionId && deviceId) {
        const endResponse = await fetch(
          `${getBaseUrl()}/devices/${encodeURIComponent(deviceId)}/sessions/${encodeURIComponent(transactionId)}/end`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ended_at: new Date().toISOString(),
            }),
          }
        );

        const endPayload = (await endResponse.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };

        if (!endResponse.ok) {
          throw new Error(endPayload.message || endPayload.error || "Failed to end session.");
        }

        const confirmResponse = await fetch(
          `${getBaseUrl()}/sessions/${encodeURIComponent(transactionId)}/confirm`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          }
        );

        const confirmPayload = (await confirmResponse.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };

        if (!confirmResponse.ok) {
          throw new Error(confirmPayload.message || confirmPayload.error || "Failed to confirm transaction.");
        }
      }

      localStorage.setItem("purchaseItems", JSON.stringify(cartItems));
      localStorage.removeItem("orvio_transaction_id");
      navigate("/completed", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to complete purchase.";
      setCompleteError(message);
    } finally {
      setIsCompletingPurchase(false);
    }
  };

  const handleCancelSession = () => {
    void finalizeAndCancelSession();
  };

  const finalizeAndCancelSession = async () => {
    setCompleteError(null);
    setIsCancellingSession(true);

    try {
      const transactionId = localStorage.getItem("orvio_transaction_id");
      const deviceId = localStorage.getItem("orvio_device_id");

      if (transactionId && deviceId) {
        const endResponse = await fetch(
          `${getBaseUrl()}/devices/${encodeURIComponent(deviceId)}/sessions/${encodeURIComponent(transactionId)}/end`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ended_at: new Date().toISOString(),
              cancelled: true,
            }),
          }
        );

        const endPayload = (await endResponse.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };

        if (!endResponse.ok) {
          throw new Error(endPayload.message || endPayload.error || "Failed to cancel session.");
        }
      }

      setCartItems([]);
      localStorage.removeItem("orvio_transaction_id");
      navigate("/feedback", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to cancel session.";
      setCompleteError(message);
    } finally {
      setIsCancellingSession(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTotalPrice = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with timer */}
      <div className="px-6 pt-8 pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            Your Shopping Cart
          </h1>
          <div className={`text-lg font-semibold px-3 py-1 rounded-lg ${
            timeRemaining <= 10 
              ? "bg-red-100 text-red-600" 
              : "bg-blue-50 text-blue-600"
          }`}>
            {formatTime(timeRemaining)}
          </div>
        </div>
      </div>

      {/* Cart items list */}
      <div className="flex-1 px-6 overflow-y-auto pb-4">
        {cartItems.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400 text-center">
              Your cart is empty
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {cartItems.map((item, index) => (
              <div key={item.id}>
                <div className="py-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-base text-gray-900 font-medium flex-1">{item.name}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Quantity in "3x" format */}
                      <span className="text-base text-gray-700 font-medium min-w-[32px]">
                        {item.quantity}x
                      </span>
                      {/* Minus button */}
                      <button
                        onClick={() => handleDecreaseQuantity(item.id)}
                        className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors duration-200"
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        <Minus className="w-5 h-5 text-gray-700" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        ${item.unitPrice.toFixed(2)} each
                      </p>
                      <p className="text-base text-gray-900 mt-1 font-semibold">
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
                {index < cartItems.length - 1 && (
                  <div className="h-px bg-gray-100" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary section */}
      <div className="px-6 pb-6 pt-4 border-t border-gray-100">
        <div className="bg-gray-50 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-lg text-gray-900 font-semibold">Total</span>
            <span className="text-2xl font-bold text-gray-900">
              ${getTotalPrice().toFixed(2)}
            </span>
          </div>
        </div>

        <button
          onClick={handleCompletePurchase}
          disabled={cartItems.length === 0 || isCompletingPurchase || isCancellingSession}
          className="w-full min-h-[56px] bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-2xl shadow-sm transition-colors duration-200 text-lg touch-manipulation"
        >
          {isCompletingPurchase ? "Completing Purchase..." : "Complete & Confirm Purchase"}
        </button>
        {completeError && (
          <p className="text-sm text-red-600 text-center leading-relaxed mt-3">
            {completeError}
          </p>
        )}

        {/* Support text */}
        <p className="text-center text-sm text-gray-600 mt-4">
          Need more help?{" "}
          <a
            href="#contact"
            className="text-blue-700 hover:text-blue-800 underline"
          >
            Contact us
          </a>
        </p>
      </div>

      {/* Session Expiration Modal */}
      {showExpirationModal && (
        <div className="fixed inset-0 flex items-center justify-center px-6 z-50">
          {/* Blurred background overlay */}
          <div className="absolute inset-0 backdrop-blur-md bg-black/20" />
          
          {/* Modal card */}
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative z-10">
            <div className="text-center space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                Session Time Expired
              </h2>
              <p className="text-lg text-gray-600">
                Would you like to complete your purchase?
              </p>
              
              {/* Auto-complete countdown */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-2">
                  Auto-completing in
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  {autoCompleteCountdown}s
                </p>
              </div>

              {/* Action buttons */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleCompletePurchase}
                  className="w-full min-h-[56px] bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium py-4 px-6 rounded-2xl shadow-sm transition-colors duration-200 text-lg touch-manipulation"
                >
                  Complete Purchase
                </button>
                <button
                  onClick={handleCancelSession}
                  disabled={isCancellingSession || isCompletingPurchase}
                  className="w-full min-h-[56px] bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-medium py-4 px-6 rounded-2xl border-2 border-gray-300 transition-colors duration-200 text-lg touch-manipulation"
                >
                  {isCancellingSession ? "Cancelling Session..." : "Cancel Session"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}