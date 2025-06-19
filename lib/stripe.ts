import { loadStripe, Stripe } from '@stripe/stripe-js'

// Get the publishable key from environment variables
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

if (!stripePublishableKey) {
  throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined')
}

// Initialize Stripe
let stripePromise: Promise<Stripe | null>

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey)
  }
  return stripePromise
}

// Pricing plans configuration
export const PRICING_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    features: [
      'Up to 3 projects',
      'Basic kanban boards',
      'Team collaboration (up to 5 members)',  
      'Email support',
      'Basic reporting'
    ],
    limits: {
      projects: 3,
      teamMembers: 5,
      storageGB: 1
    },
    popular: false
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    priceId: 'price_pro_monthly', // Replace with actual Stripe price ID
    interval: 'month',
    features: [
      'Unlimited projects',
      'Advanced kanban boards',
      'Unlimited team members',
      'AI-powered story generation',
      'Priority support',
      'Advanced analytics',
      'Custom integrations',
      'API access'
    ],
    limits: {
      projects: -1, // unlimited
      teamMembers: -1, // unlimited  
      storageGB: 50
    },
    popular: true
  },
  enterprise: {
    id: 'enterprise', 
    name: 'Enterprise',
    price: 99,
    priceId: 'price_enterprise_monthly', // Replace with actual Stripe price ID
    interval: 'month',
    features: [
      'Everything in Pro',
      'SSO integration',
      'Advanced security features',
      'Dedicated account manager',
      'Custom onboarding',
      'SLA guarantee',
      'Advanced compliance',
      'White-label options'
    ],
    limits: {
      projects: -1,
      teamMembers: -1,
      storageGB: 500
    },
    popular: false
  }
}

export type PricingPlan = typeof PRICING_PLANS[keyof typeof PRICING_PLANS]

// Stripe API helpers
export const createCheckoutSession = async (priceId: string, userId: string) => {
  const response = await fetch('/api/checkout/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      priceId,
      userId,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to create checkout session')
  }

  const session = await response.json()
  return session
}

export const createCustomerPortalSession = async (customerId: string) => {
  const response = await fetch('/api/billing/portal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerId,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to create customer portal session')
  }

  const session = await response.json()
  return session
} 