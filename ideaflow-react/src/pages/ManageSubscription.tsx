import React, { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSubscription } from "../contexts/SubscriptionContext";
import { Crown, Check, AlertCircle } from "lucide-react";
import StripeCheckout from "../components/StripeCheckout";
import { resolveApiBasePath } from "../utils/apiBase";

const ManageSubscription: React.FC = () => {
  const { user } = useAuth();
  const { subscription, subscriptionTiers, refreshSubscription } =
    useSubscription();

  const currentTier = subscriptionTiers.find(
    (tier) => tier.id === subscription.tier,
  );

  // Handle Stripe checkout success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id");

    if (sessionId && user) {
      handleStripeSuccess(sessionId);
    }
  }, [user]);

  const handleStripeSuccess = async (sessionId: string) => {
    try {
      const apiBase = resolveApiBasePath();
      const token = localStorage.getItem('ideaflow_access_token');

      const response = await fetch(
        `${apiBase}/payment/handle-success`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-ID": user?.id || "",
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: JSON.stringify({ session_id: sessionId }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        console.log("Payment success result:", result);
        
        // Remove session_id from URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
        
        // Force refresh subscription data immediately
        await refreshSubscription();
        
        // Also trigger a full page reload to ensure UI updates
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error("Failed to handle payment success:", errorData);
        alert(`Payment processing failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error handling payment success:", error);
    }
  };

  const handleManageBilling = () => {
    // Phase 2: Stripe customer portal will be implemented here
    alert("Stripe customer portal coming in Phase 2");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Manage Subscription
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your IdeaFlow subscription and billing
        </p>
      </div>

      {/* Current Plan */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-blue-900">
            Current Plan
          </h2>
          <button
            onClick={() => {
              refreshSubscription();
              alert("Subscription status refreshed!");
            }}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Status
          </button>
        </div>
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Crown className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">
                {currentTier?.name || "Basic Plan"}
              </h3>
              <p className="text-sm text-blue-700">
                {subscription.sessionsUsed || 0} of{" "}
                {(subscription.maxSessions || 4) >= 999999 ? 'Unlimited' : (subscription.maxSessions || 4)} sessions used this month
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-blue-900">
              {currentTier?.price ? `$${currentTier.price}/mo` : "$10/mo"}
            </div>
            <button
              onClick={handleManageBilling}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Manage Billing
            </button>
          </div>
        </div>
      </div>

      {/* Usage Overview */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Usage Overview
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Sessions this month</span>
              <span className="font-medium">
                {subscription.sessionsUsed || 0} /{" "}
                {(subscription.maxSessions || 4) >= 999999 ? 'Unlimited' : (subscription.maxSessions || 4)}
              </span>
            </div>
            {(subscription.maxSessions || 4) < 999999 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, ((subscription.sessionsUsed || 0) / (subscription.maxSessions || 4)) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">
                Max participants per session
              </span>
              <span className="font-medium">
                {(subscription.maxParticipants || 10) >= 999999 ? 'Unlimited' : (subscription.maxParticipants || 10)}
              </span>
            </div>
            <div className="text-sm text-blue-500">
              Unlimited participants can join your sessions up to this limit
            </div>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Available Plans
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {subscriptionTiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative p-6 border rounded-lg ${
                subscription.tier === tier.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-red-200 bg-white"
              }`}
            >
              {subscription.tier === tier.id && (
                <div className="absolute -top-3 left-6">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {tier.name}
                </h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-900">
                    ${tier.price}
                  </span>
                  <span className="text-blue-600">/month</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {subscription.tier === tier.id ? (
                <div className="w-full py-3 px-4 rounded-lg bg-green-100 text-green-700 text-center font-medium border border-green-200">
                  ✓ Current Plan
                </div>
              ) : tier.id === "free" ? (
                <div className="w-full py-3 px-4 rounded-lg bg-gray-100 text-gray-500 text-center font-medium">
                  Free Plan
                </div>
              ) : (
                <StripeCheckout
                  tierId={tier.id as "basic" | "pro"}
                  tierName={tier.name}
                  price={`$${tier.price}/mo`}
                  onSuccess={() => {
                    // Refresh subscription data after successful payment
                    window.location.reload();
                  }}
                  onError={(error) => {
                    console.error("Payment error:", error);
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Billing Information */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Billing Information
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">
                  Stripe Integration Coming Soon
                </p>
                <p className="text-sm text-yellow-700">
                  Full billing management will be available in Phase 2
                </p>
              </div>
            </div>
            <button
              onClick={handleManageBilling}
              className="text-yellow-600 hover:text-yellow-800 font-medium"
            >
              Learn More
            </button>
          </div>
        </div>

        {/* Stripe Integration Status */}
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-sm font-medium text-green-800 mb-2">
            ✓ Stripe Integration Active
          </h3>
          <p className="text-sm text-green-700 mb-3">
            Real Stripe checkout is working! Click any "Upgrade" button above to
            test with real payment processing.
          </p>
          <div className="text-sm text-green-600">
            <p>
              <strong>Test Card:</strong> 4242 4242 4242 4242
            </p>
            <p>
              <strong>Expiry:</strong> Any future date (e.g., 12/34)
            </p>
            <p>
              <strong>CVC:</strong> Any 3 digits (e.g., 123)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageSubscription;
