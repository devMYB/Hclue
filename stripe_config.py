"""
Stripe Configuration and Payment Processing
Handles subscription billing for IdeaFlow platform
"""
import os
import stripe

# Initialize Stripe with secret key
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

class StripeManager:
    """
    Handles Stripe payment processing and subscription management
    """
    
    def __init__(self):
        self.stripe = stripe
        
    def create_customer(self, email, name, user_id):
        """Create a new Stripe customer"""
        try:
            customer = self.stripe.Customer.create(
                email=email,
                name=name,
                metadata={'user_id': str(user_id)}
            )
            return customer
        except stripe.StripeError as e:
            print(f"Stripe customer creation failed: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def create_subscription(self, customer_id, price_id):
        """Create a new subscription for a customer"""
        try:
            subscription = self.stripe.Subscription.create(
                customer=customer_id,
                items=[{'price': price_id}],
                payment_behavior='default_incomplete',
                payment_settings={'save_default_payment_method': 'on_subscription'},
                expand=['latest_invoice.payment_intent'],
            )
            return subscription
        except stripe.StripeError as e:
            print(f"Stripe subscription creation failed: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def create_checkout_session(self, customer_id, price_id, success_url, cancel_url):
        """Create a Stripe Checkout session for subscription"""
        try:
            session = self.stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=success_url,
                cancel_url=cancel_url,
                allow_promotion_codes=True,
            )
            return session
        except stripe.StripeError as e:
            print(f"Stripe checkout session creation failed: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def cancel_subscription(self, subscription_id):
        """Cancel a subscription at period end"""
        try:
            subscription = self.stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=True
            )
            return subscription
        except stripe.StripeError as e:
            print(f"Stripe subscription cancellation failed: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def reactivate_subscription(self, subscription_id):
        """Reactivate a subscription"""
        try:
            subscription = self.stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=False
            )
            return subscription
        except stripe.StripeError as e:
            print(f"Stripe subscription reactivation failed: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def get_subscription(self, subscription_id):
        """Get subscription details"""
        try:
            subscription = self.stripe.Subscription.retrieve(subscription_id)
            return subscription
        except stripe.StripeError as e:
            print(f"Stripe subscription retrieval failed: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def get_checkout_session(self, session_id):
        """Get checkout session details"""
        try:
            session = self.stripe.checkout.Session.retrieve(
                session_id,
                expand=['line_items', 'line_items.data.price']
            )
            return session
        except stripe.StripeError as e:
            print(f"Stripe checkout session retrieval failed: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def handle_webhook(self, payload, sig_header):
        """Handle Stripe webhook events"""
        endpoint_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
        
        try:
            event = self.stripe.Webhook.construct_event(
                payload, sig_header, endpoint_secret
            )
        except ValueError as e:
            print(f"Invalid webhook payload: {e}")
            import traceback
            traceback.print_exc()
            return None
        except stripe.SignatureVerificationError as e:
            print(f"Invalid webhook signature: {e}")
            import traceback
            traceback.print_exc()
            return None
        
        return event

# Stripe pricing configuration
STRIPE_PRICES = {
    'basic': {
        'monthly': os.getenv('STRIPE_BASIC_MONTHLY_PRICE_ID', 'price_basic_monthly'),
        'name': 'Basic Plan',
        'price': 10.00,
        'sessions_per_month': 4,
        'max_participants': 10
    },
    'pro': {
        'monthly': os.getenv('STRIPE_PRO_MONTHLY_PRICE_ID', 'price_pro_monthly'),
        'name': 'Unlimited Plan', 
        'price': 14.99,
        'sessions_per_month': 999999,  # Unlimited
        'max_participants': 999999     # Unlimited
    }
}