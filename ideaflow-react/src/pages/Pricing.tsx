import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { Check, Crown, Zap, Sparkles } from 'lucide-react';

const Pricing: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { subscription, subscriptionTiers, upgradeTo } = useSubscription();
  const navigate = useNavigate();
  
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    cardholderName: '',
    expiry: '',
    cvv: '',
    email: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectPlan = (tierId: string) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (tierId === 'free') {
      return; // Free plan is already active
    }
    
    setSelectedTier(tierId);
    setShowPaymentForm(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    const success = await upgradeTo(selectedTier);
    
    if (success) {
      setShowPaymentForm(false);
      setSelectedTier('');
      setPaymentData({
        cardNumber: '',
        cardholderName: '',
        expiry: '',
        cvv: '',
        email: ''
      });
      
      // Show success message and redirect
      alert('Successfully upgraded! Your new features are available immediately.');
      navigate('/dashboard');
    } else {
      alert('Upgrade failed. Please try again.');
    }
    
    setIsProcessing(false);
  };

  const getPlanIcon = (tierId: string) => {
    switch (tierId) {
      case 'free': return <Zap className="w-6 h-6" />;
      case 'pro': return <Crown className="w-6 h-6" />;
      case 'enterprise': return <Sparkles className="w-6 h-6" />;
      default: return <Zap className="w-6 h-6" />;
    }
  };

  const isPlanActive = (tierId: string) => {
    return subscription.tier === tierId;
  };

  if (showPaymentForm) {
    const selectedTierInfo = subscriptionTiers.find(t => t.id === selectedTier);
    
    return (
      <div className="max-w-md mx-auto">
        <div className="card">
          <h2 className="text-2xl font-bold text-center mb-6">
            Complete Your Upgrade
          </h2>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-lg">{selectedTierInfo?.name} Plan</h3>
            <p className="text-2xl font-bold text-primary-600">
              ${selectedTierInfo?.price}/month
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-blue-800">
              🔄 Demo Mode: Payment integration would be implemented here
            </p>
          </div>

          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="1234 5678 9012 3456"
                  value={paymentData.cardNumber}
                  onChange={(e) => setPaymentData({...paymentData, cardNumber: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="John Doe"
                  value={paymentData.cardholderName}
                  onChange={(e) => setPaymentData({...paymentData, cardholderName: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="MM/YY"
                  value={paymentData.expiry}
                  onChange={(e) => setPaymentData({...paymentData, expiry: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CVV
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="123"
                  value={paymentData.cvv}
                  onChange={(e) => setPaymentData({...paymentData, cvv: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                className="input"
                placeholder="john@example.com"
                value={paymentData.email}
                onChange={(e) => setPaymentData({...paymentData, email: e.target.value})}
                required
              />
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={() => setShowPaymentForm(false)}
                className="btn-secondary flex-1"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : `Complete Upgrade - $${selectedTierInfo?.price}/month`}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Choose Your IdeaFlow Plan
        </h1>
        <p className="text-xl text-gray-600">
          Unlock the full potential of collaborative ideation
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {subscriptionTiers.map((tier) => (
          <div
            key={tier.id}
            className={`card relative ${
              isPlanActive(tier.id) ? 'ring-2 ring-primary-500 bg-primary-50' : ''
            } ${tier.id === 'pro' ? 'scale-105 shadow-lg' : ''}`}
          >
            {tier.id === 'pro' && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}

            <div className="flex items-center space-x-3 mb-4">
              <div className={`p-2 rounded-lg ${
                tier.id === 'free' ? 'bg-gray-100 text-gray-600' :
                tier.id === 'pro' ? 'bg-yellow-100 text-yellow-600' :
                'bg-purple-100 text-purple-600'
              }`}>
                {getPlanIcon(tier.id)}
              </div>
              <h3 className="text-xl font-bold">{tier.name}</h3>
            </div>

            <div className="mb-6">
              <span className="text-3xl font-bold">${tier.price}</span>
              <span className="text-gray-600">/month</span>
            </div>

            <ul className="space-y-3 mb-8">
              {tier.features.map((feature, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto">
              {isPlanActive(tier.id) ? (
                <div className="w-full py-2 text-center text-green-600 font-medium">
                  Current Plan
                </div>
              ) : (
                <button
                  onClick={() => handleSelectPlan(tier.id)}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    tier.id === 'free'
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'btn-primary'
                  }`}
                >
                  {tier.id === 'free' ? 'Current Plan' : `Upgrade to ${tier.name}`}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-gray-600">
          All plans include secure payment processing and 24/7 support.
        </p>
        <p className="text-gray-600 mt-2">
          Need a custom solution? <a href="mailto:sales@ideaflow.com" className="text-primary-600 hover:underline">Contact us</a>
        </p>
      </div>
    </div>
  );
};

export default Pricing;