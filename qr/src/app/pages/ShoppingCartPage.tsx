import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { io, Socket } from "socket.io-client";

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface CartApiItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

const SESSION_DURATION_SECONDS = 120;
const ONE_TIME_EXTENSION_SECONDS = 120;
const AUTO_COMPLETE_SECONDS = 10;
const SESSION_STATE_SYNC_INTERVAL_MS = 5000;

export function ShoppingCartPage() {
  const navigate = useNavigate();
  const [isCompletingPurchase, setIsCompletingPurchase] = useState(false);
  const [isCancellingSession, setIsCancellingSession] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  const [isCartLoading, setIsCartLoading] = useState(true);
  const [cartTotalFromServer, setCartTotalFromServer] = useState<number | null>(null);

  // Session countdown timer (reload-safe, derived from backend start time)
  const [timeRemaining, setTimeRemaining] = useState(SESSION_DURATION_SECONDS);
  const [sessionEndsAtMs, setSessionEndsAtMs] = useState<number | null>(null);
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [autoCompleteCountdown, setAutoCompleteCountdown] = useState(AUTO_COMPLETE_SECONDS);
  const [hasUsedOneTimeExtension, setHasUsedOneTimeExtension] = useState(false);
  const hasRedirectedToFeedbackRef = useRef(false);
  const presenceSocketRef = useRef<Socket | null>(null);

  const getBaseUrl = () => {
    const url = import.meta.env.VITE_BACKEND_URL;
    if (url && String(url).trim()) {
      return String(url).replace(/\/$/, "");
    }
    return "/api";
  };

  const getSocketServerUrl = () => {
    const url = import.meta.env.VITE_BACKEND_URL;
    if (url && String(url).trim()) {
      return String(url).replace(/\/$/, "");
    }

    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:3000`;
  };

  const getRemainingSeconds = (endsAtMs: number) => {
    return Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000));
  };

  const getExtensionUsedStorageKey = (transactionId: string) => {
    return `orvio_one_time_extension_used_${transactionId}`;
  };

  const getSessionEndsAtStorageKey = (transactionId: string) => {
    return `orvio_session_ends_at_${transactionId}`;
  };

  const clearSessionExtensionState = (transactionId: string) => {
    localStorage.removeItem(getExtensionUsedStorageKey(transactionId));
    localStorage.removeItem(getSessionEndsAtStorageKey(transactionId));
  };

  const redirectToMissedYou = useCallback(() => {
    if (hasRedirectedToFeedbackRef.current) {
      return;
    }

    hasRedirectedToFeedbackRef.current = true;
    const transactionId = localStorage.getItem("orvio_transaction_id");
    if (transactionId) {
      clearSessionExtensionState(transactionId);
    }
    localStorage.removeItem("orvio_transaction_id");
    navigate("/feedback", { replace: true });
  }, [navigate]);

  const mapCartItems = (items: CartApiItem[]): CartItem[] => {
    return items.map((item) => ({
      id: item.product_id,
      name: item.name,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unit_price || 0),
    }));
  };

  const loadSessionCart = async (transactionId: string, silent = false): Promise<CartItem[]> => {
    if (!transactionId) {
      return [];
    }

    if (!silent) {
      setIsCartLoading(true);
    }

    const response = await fetch(
      `${getBaseUrl()}/sessions/${encodeURIComponent(transactionId)}/cart`
    );
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      cart?: CartApiItem[];
      total_price?: number;
    };

    if (!response.ok) {
      throw new Error(payload.message || payload.error || "Failed to load cart.");
    }

    const nextCartItems = mapCartItems(payload.cart || []);
    setCartItems(nextCartItems);
    setCartTotalFromServer(Number(payload.total_price || 0));
    setCompleteError(null);
    setIsCartLoading(false);
    return nextCartItems;
  };

  const syncSessionStateWithBackend = useCallback(async () => {
    if (isCompletingPurchase || isCancellingSession) {
      return;
    }

    const deviceId = localStorage.getItem("orvio_device_id");
    const transactionId = localStorage.getItem("orvio_transaction_id");

    if (!deviceId || !transactionId) {
      return;
    }

    const response = await fetch(
      `${getBaseUrl()}/devices/${encodeURIComponent(deviceId)}/sessions/current`
    );

    const payload = (await response.json().catch(() => ({}))) as {
      has_active_session?: boolean;
      transaction_id?: string | null;
      error?: string;
      message?: string;
    };

    if (!response.ok) {
      throw new Error(payload.message || payload.error || "Failed to sync session state.");
    }

    const backendTransactionId = payload.transaction_id || null;
    const isActiveForCurrentTransaction =
      payload.has_active_session === true &&
      backendTransactionId !== null &&
      backendTransactionId === transactionId;

    if (!isActiveForCurrentTransaction) {
      redirectToMissedYou();
    }
  }, [isCancellingSession, isCompletingPurchase, redirectToMissedYou]);

  const adjustCartItemQuantity = async (productId: string, delta: number) => {
    const transactionId = localStorage.getItem("orvio_transaction_id");
    if (!transactionId) {
      throw new Error("Transaction not found. Please scan the QR again.");
    }

    setUpdatingItemId(productId);
    setCompleteError(null);

    try {
      const response = await fetch(
        `${getBaseUrl()}/sessions/${encodeURIComponent(transactionId)}/cart/items/${encodeURIComponent(productId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ delta }),
        }
      );

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        cart?: CartApiItem[];
        total_price?: number;
      };

      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Failed to update item quantity.");
      }

      const nextItems = mapCartItems(payload.cart || []);
      setCartItems(nextItems);
      setCartTotalFromServer(Number(payload.total_price || 0));
    } finally {
      setUpdatingItemId(null);
    }
  };


  // Countdown is based on DB start_time so refresh does not reset the timer.
  useEffect(() => {
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

        const activeTransactionId = payload.transaction_id || localStorage.getItem("orvio_transaction_id");

        if (activeTransactionId) {
          localStorage.setItem("orvio_transaction_id", activeTransactionId);
          setActiveTransactionId(activeTransactionId);
        }

        const startedAtMs = new Date(payload.started_at).getTime();
        if (Number.isNaN(startedAtMs)) {
          throw new Error("Invalid session start time.");
        }

        const initialEndsAtMs = startedAtMs + SESSION_DURATION_SECONDS * 1000;

        let resolvedEndsAtMs = initialEndsAtMs;
        let persistedExtensionUsed = false;

        if (activeTransactionId) {
          persistedExtensionUsed =
            localStorage.getItem(getExtensionUsedStorageKey(activeTransactionId)) === "1";

          const persistedEndsAtRaw = localStorage.getItem(
            getSessionEndsAtStorageKey(activeTransactionId)
          );
          const persistedEndsAtMs = persistedEndsAtRaw ? Number(persistedEndsAtRaw) : Number.NaN;

          if (Number.isFinite(persistedEndsAtMs) && persistedEndsAtMs > resolvedEndsAtMs) {
            resolvedEndsAtMs = persistedEndsAtMs;
          }
        }

        const initialRemaining = getRemainingSeconds(resolvedEndsAtMs);
        if (cancelled) {
          return;
        }

        setHasUsedOneTimeExtension(persistedExtensionUsed);
        setSessionEndsAtMs(resolvedEndsAtMs);
        setTimeRemaining(initialRemaining);

        if (initialRemaining <= 0) {
          setShowExpirationModal(true);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "Failed to initialize session timer.";
        setCompleteError(message);
        setTimeRemaining(0);
        setIsCartLoading(false);
      }
    };

    void initializeCountdown();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeTransactionId) {
      const localTransactionId = localStorage.getItem("orvio_transaction_id");
      if (localTransactionId) {
        setActiveTransactionId(localTransactionId);
      }
      return;
    }

    let cancelled = false;

    const fetchCart = async (silent: boolean) => {
      try {
        await loadSessionCart(activeTransactionId, silent);
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "Failed to load cart.";
        setCompleteError(message);
        setIsCartLoading(false);
      }
    };

    void fetchCart(false);
    const pollTimer = setInterval(() => {
      void fetchCart(true);
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
    };
  }, [activeTransactionId]);

  useEffect(() => {
    const runSync = () => {
      void syncSessionStateWithBackend().catch((error) => {
        if (hasRedirectedToFeedbackRef.current) {
          return;
        }
        const message = error instanceof Error ? error.message : "Failed to sync session state.";
        setCompleteError(message);
      });
    };

    runSync();

    const intervalId = setInterval(runSync, SESSION_STATE_SYNC_INTERVAL_MS);
    const onVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        runSync();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityOrFocus);
    window.addEventListener("focus", onVisibilityOrFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
      window.removeEventListener("focus", onVisibilityOrFocus);
    };
  }, [syncSessionStateWithBackend]);

  useEffect(() => {
    if (!activeTransactionId || isCompletingPurchase || isCancellingSession) {
      return;
    }

    const deviceId = localStorage.getItem("orvio_device_id");
    if (!deviceId) {
      return;
    }

    const socket = io(getSocketServerUrl(), {
      transports: ["websocket", "polling"],
    });

    presenceSocketRef.current = socket;

    const registerPresence = () => {
      socket.emit(
        "register_session_presence",
        {
          device_id: deviceId,
          transaction_id: activeTransactionId,
        },
        (ack?: { ok?: boolean; message?: string }) => {
          if (ack?.ok) {
            return;
          }

          const message = ack?.message || "Failed to register websocket session presence.";
          const normalized = message.toLowerCase();

          if (normalized.includes("not active") || normalized.includes("not found") || normalized.includes("mismatch")) {
            redirectToMissedYou();
            return;
          }

          setCompleteError(message);
        }
      );
    };

    socket.on("connect", registerPresence);

    return () => {
      socket.emit("unregister_session_presence");
      socket.off("connect", registerPresence);
      socket.disconnect();
      if (presenceSocketRef.current?.id === socket.id) {
        presenceSocketRef.current = null;
      }
    };
  }, [activeTransactionId, isCancellingSession, isCompletingPurchase, redirectToMissedYou]);

  useEffect(() => {
    if (sessionEndsAtMs === null) {
      return;
    }

    const updateRemaining = () => {
      const remaining = getRemainingSeconds(sessionEndsAtMs);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        setShowExpirationModal(true);
      }
    };

    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);
    return () => clearInterval(timer);
  }, [sessionEndsAtMs]);

  // 10-second auto-complete countdown in modal
  useEffect(() => {
    if (showExpirationModal) {
      setAutoCompleteCountdown(AUTO_COMPLETE_SECONDS);

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

  const handleCompletePurchase = () => {
    void finalizeAndCompletePurchase();
  };

  const handleIncreaseItem = (productId: string) => {
    void adjustCartItemQuantity(productId, 1).catch((error) => {
      const message = error instanceof Error ? error.message : "Failed to update item quantity.";
      setCompleteError(message);
    });
  };

  const handleDecreaseItem = (productId: string) => {
    void adjustCartItemQuantity(productId, -1).catch((error) => {
      const message = error instanceof Error ? error.message : "Failed to update item quantity.";
      setCompleteError(message);
    });
  };

  const handleExtendSessionOnce = () => {
    if (hasUsedOneTimeExtension) {
      return;
    }

    const transactionId = localStorage.getItem("orvio_transaction_id");
    const now = Date.now();
    const baseEndsAtMs = sessionEndsAtMs ? Math.max(sessionEndsAtMs, now) : now;
    const extendedEndsAtMs = baseEndsAtMs + ONE_TIME_EXTENSION_SECONDS * 1000;

    if (transactionId) {
      localStorage.setItem(getExtensionUsedStorageKey(transactionId), "1");
      localStorage.setItem(getSessionEndsAtStorageKey(transactionId), String(extendedEndsAtMs));
    }

    setSessionEndsAtMs(extendedEndsAtMs);
    setTimeRemaining(ONE_TIME_EXTENSION_SECONDS);
    setShowExpirationModal(false);
    setHasUsedOneTimeExtension(true);
    setCompleteError(null);
  };

  const finalizeAndCompletePurchase = async () => {
    setCompleteError(null);
    setIsCompletingPurchase(true);

    try {
      const transactionId = localStorage.getItem("orvio_transaction_id");
      const deviceId = localStorage.getItem("orvio_device_id");
      let latestCartItems = [...cartItems];

      if (transactionId && deviceId) {
        latestCartItems = await loadSessionCart(transactionId, true);

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

        clearSessionExtensionState(transactionId);
      }

      localStorage.setItem("purchaseItems", JSON.stringify(latestCartItems));
      localStorage.removeItem("orvio_transaction_id");
      navigate(latestCartItems.length > 0 ? "/completed" : "/no-items", { replace: true });
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

        clearSessionExtensionState(transactionId);
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
    if (cartTotalFromServer !== null) {
      return cartTotalFromServer;
    }
    return cartItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-md min-h-screen flex flex-col">
        <header className="px-5 pt-8 pb-5 flex items-center justify-between">
          <h1 className="text-[clamp(1.25rem,3.2vw,1.75rem)] font-semibold text-[#101828]">
            Your Shopping Cart
          </h1>
          <div
            className={`rounded-lg px-3 py-1.5 font-semibold text-base leading-none ${
              timeRemaining <= 10 ? "bg-red-100 text-red-600" : "bg-blue-50 text-blue-600"
            }`}
          >
            {formatTime(timeRemaining)}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pb-4">
          {isCartLoading ? (
            <p className="py-12 text-center text-sm text-gray-500">Loading cart...</p>
          ) : cartItems.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">No products detected yet.</p>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="py-4 border-b border-[#f3f4f6] last:border-b-0">
                <p className="text-base font-medium text-[#101828]">{item.name}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-medium text-[#364153] min-w-8">{item.quantity}x</span>
                    <button
                      onClick={() => handleDecreaseItem(item.id)}
                      disabled={
                        updatingItemId === item.id ||
                        isCompletingPurchase ||
                        isCancellingSession
                      }
                      aria-label={`Decrease ${item.name}`}
                      className="w-11 h-11 rounded-full bg-[#f3f4f6] text-xl text-[#364153] disabled:opacity-50"
                    >
                      -
                    </button>
                    <button
                      onClick={() => handleIncreaseItem(item.id)}
                      disabled={
                        updatingItemId === item.id ||
                        isCompletingPurchase ||
                        isCancellingSession
                      }
                      aria-label={`Increase ${item.name}`}
                      className="w-11 h-11 rounded-full bg-[#f3f4f6] text-xl text-[#364153] disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[#6a7282]">${item.unitPrice.toFixed(2)} each</p>
                    <p className="text-xl font-semibold text-[#101828]">
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </main>

        <footer className="border-t border-[#f3f4f6] px-5 pt-4 pb-6 space-y-4">
          <div className="bg-[#f9fafb] rounded-2xl px-4 py-4 flex items-center justify-between">
            <span className="text-[1.125rem] font-semibold text-[#101828]">Total</span>
            <span className="text-[2rem] leading-none font-bold text-[#101828]">
              ${getTotalPrice().toFixed(2)}
            </span>
          </div>

          <button
            onClick={handleCompletePurchase}
            disabled={isCompletingPurchase || isCancellingSession || isCartLoading}
            className="w-full min-h-14 rounded-2xl bg-[#2b7fff] text-white text-lg font-medium disabled:bg-gray-300"
          >
            {isCompletingPurchase ? "Completing Purchase..." : "Complete & Confirm Purchase"}
          </button>

          {completeError && (
            <p className="text-sm text-center text-red-600">{completeError}</p>
          )}

          <p className="text-center text-sm text-[#4a5565]">
            Need more help?{" "}
            <button
              onClick={handleCancelSession}
              disabled={isCancellingSession || isCompletingPurchase}
              className="text-[#1447e6] underline disabled:opacity-60"
            >
              Contact us
            </button>
          </p>
        </footer>

        {showExpirationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
              <h2 className="text-xl font-semibold text-[#101828] text-center">Session Time Expired</h2>
              <p className="mt-2 text-center text-[#4a5565]">Would you like to complete your purchase?</p>

              <div className="mt-4 rounded-xl bg-gray-50 p-4 text-center">
                <p className="text-sm text-gray-600">Auto-completing in</p>
                <p className="text-3xl font-bold text-blue-600">{autoCompleteCountdown}s</p>
              </div>

              <div className="mt-4 space-y-3">
                {!hasUsedOneTimeExtension && (
                  <button
                    onClick={handleExtendSessionOnce}
                    disabled={isCancellingSession || isCompletingPurchase}
                    className="w-full min-h-14 rounded-2xl bg-amber-400 text-amber-950 font-medium disabled:bg-gray-300"
                  >
                    Add 120 Seconds (One Time)
                  </button>
                )}

                <button
                  onClick={handleCompletePurchase}
                  disabled={isCompletingPurchase}
                  className="w-full min-h-14 rounded-2xl bg-[#2b7fff] text-white font-medium disabled:bg-gray-300"
                >
                  Complete Purchase
                </button>

                <button
                  onClick={handleCancelSession}
                  disabled={isCancellingSession || isCompletingPurchase}
                  className="w-full min-h-14 rounded-2xl border border-gray-300 text-gray-700 font-medium disabled:opacity-60"
                >
                  {isCancellingSession ? "Cancelling Session..." : "Cancel Session"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
