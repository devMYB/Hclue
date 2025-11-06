import React, { useState } from "react";
import { CreditCard, CheckCircle, AlertCircle } from "lucide-react";
import { apiService } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

interface StripeCheckoutProps {
  tierId: "basic" | "pro";
  tierName: string;
  price: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  tierId,
  tierName,
  price,
  onSuccess,
  onError,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use same URL logic as ApiService to avoid mixed content errors
      const isNgrok = window.location.hostname.includes('ngrok');
      const isHttps = window.location.protocol === 'https:';
      
      let API_BASE_URL;
      if (isNgrok || isHttps) {
        // For ngrok or HTTPS, use relative URL (Vite proxy will handle it)
        API_BASE_URL = '';
      } else {
        // For local development, use network IP
        API_BASE_URL = 'http://90.0.0.3:8000';
      }

      const token = localStorage.getItem('ideaflow_access_token');
      console.log(
        "Creating checkout session for tier:",
        tierId,
        "with user ID:",
        user?.id,
      );

      const response = await fetch(
        `${API_BASE_URL}/api/payment/create-checkout-session`,
        {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
            "X-User-ID": user?.id || "",
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: JSON.stringify({ tier_id: tierId }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Checkout session error:", response.status, errorText);
        throw new Error(
          `Failed to create checkout session: ${response.status}`,
        );
      }

      const data = await response.json();

      if (data.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkout_url;
      } else {
        throw new Error("Failed to create checkout session");
      }
    } catch (err: any) {
      console.error("Checkout error details:", err);
      const errorMessage = err.message || "Failed to start checkout process";
      setError(errorMessage);
      onError?.(errorMessage);

      // For debugging - show more detailed error info
      if (err.name === "TypeError" && err.message.includes("fetch")) {
        setError("Network error - please check your internet connection");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{tierName}</h3>
        <span className="text-2xl font-bold text-green-600">{price}</span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      <button
        onClick={handleSubscribe}
        disabled={loading}
        className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
          loading
            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
            : tierId === "basic"
              ? "bg-gradient-to-r from-blue-600 to-blue-700 text-black hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl"
              : "bg-gradient-to-r from-purple-600 to-purple-700 text-black hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl"
        }`}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Creating checkout...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Subscribe to {tierName}
          </>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center mt-3">
        Secure payment processed by Stripe
      </p>
    </div>
  );
};

export default StripeCheckout;
