import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { X } from "lucide-react";
import { FridgeIcon } from "../components/FridgeIcon";

interface PurchaseItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export function PurchaseDetailsPage() {
  const navigate = useNavigate();
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);

  useEffect(() => {
    // Load purchase items from localStorage
    const storedItems = localStorage.getItem("purchaseItems");
    if (storedItems) {
      setPurchaseItems(JSON.parse(storedItems));
    } else {
      // If no items found, redirect to welcome
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const getTotalAmount = () => {
    return purchaseItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const handleClose = () => {
    navigate("/completed", { replace: true });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with close button */}
      <div className="px-6 pt-8 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            Purchase Details
          </h1>
          <button
            onClick={handleClose}
            className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Fridge icon at top */}
      <div className="px-6 pt-4 pb-2 flex justify-center">
        <FridgeIcon className="w-24 h-32 opacity-50" />
      </div>

      {/* Purchase items list - compact layout to fit 3+ items */}
      <div className="flex-1 px-6 py-2 overflow-y-auto">
        <div className="space-y-2">
          {purchaseItems.map((item, index) => (
            <div key={item.id}>
              <div className="py-3">
                <div className="flex justify-between items-start">
                  {/* Left side - product info */}
                  <div className="flex-1 pr-4">
                    <p className="text-base text-gray-900 font-medium leading-snug">
                      {item.name}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {item.quantity} × ${item.unitPrice.toFixed(2)} each
                    </p>
                  </div>
                  
                  {/* Right side - total price */}
                  <div className="text-right">
                    <p className="text-base text-gray-900 font-semibold">
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              {index < purchaseItems.length - 1 && (
                <div className="h-px bg-gray-100" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Total summary - fixed at bottom */}
      <div className="px-6 pb-6 pt-4 border-t-2 border-gray-200">
        <div className="bg-blue-50 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-lg text-gray-900 font-semibold">
              Total Amount Paid
            </span>
            <span className="text-2xl font-bold text-blue-600">
              ${getTotalAmount().toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}