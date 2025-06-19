"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Star, Zap, Crown, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { PRICING_PLANS, createCheckoutSession, getStripe } from '@/lib/stripe'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

interface PricingPlansProps {
  currentPlan?: string
  showHeader?: boolean
  compact?: boolean
}

export const PricingPlans: React.FC<PricingPlansProps> = ({
  currentPlan = 'free',
  showHeader = true,
  compact = false
}) => {
  const [isYearly, setIsYearly] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const { user } = useAuth()

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast.error('Please sign in to subscribe')
      return
    }

    if (planId === 'free') {
      toast.info('You are already on the free plan')
      return
    }

    if (planId === currentPlan) {
      toast.info('You are already subscribed to this plan')
      return
    }

    setLoadingPlan(planId)

    try {
      const plan = PRICING_PLANS[planId as keyof typeof PRICING_PLANS]
      const session = await createCheckoutSession(plan.priceId!, user.id)
      
      const stripe = await getStripe()
      if (!stripe) {
        throw new Error('Stripe not initialized')
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: session.id
      })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Subscription error:', error)
      toast.error('Failed to start checkout process')
    } finally {
      setLoadingPlan(null)
    }
  }

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free':
        return <Star className="w-6 h-6 text-slate-600" />
      case 'pro':
        return <Zap className="w-6 h-6 text-blue-600" />
      case 'enterprise':
        return <Crown className="w-6 h-6 text-purple-600" />
      default:
        return <Star className="w-6 h-6" />
    }
  }

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'free':
        return 'border-slate-200 hover:border-slate-300'
      case 'pro':
        return 'border-blue-200 hover:border-blue-300 ring-2 ring-blue-100'
      case 'enterprise':
        return 'border-purple-200 hover:border-purple-300'
      default:
        return 'border-slate-200'
    }
  }

  const getButtonVariant = (planId: string, isCurrentPlan: boolean) => {
    if (isCurrentPlan) return 'outline'
    if (planId === 'pro') return 'default'
    return 'outline'
  }

  const getButtonText = (planId: string, isCurrentPlan: boolean) => {
    if (isCurrentPlan) return 'Current Plan'
    if (planId === 'free') return 'Continue with Free'
    return 'Get Started'
  }

  return (
    <div className="w-full">
      {showHeader && (
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Choose Your Plan
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
              Start free and upgrade as you grow. All plans include core features with no setup fees.
            </p>
            
            <div className="flex items-center justify-center space-x-4 mb-8">
              <Label htmlFor="billing-toggle" className="text-sm font-medium">
                Monthly
              </Label>
              <Switch
                id="billing-toggle"
                checked={isYearly}
                onCheckedChange={setIsYearly}
              />
              <Label htmlFor="billing-toggle" className="text-sm font-medium">
                Yearly
                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                  Save 20%
                </Badge>
              </Label>
            </div>
          </motion.div>
        </div>
      )}

      <div className={`grid gap-8 ${compact ? 'md:grid-cols-2 lg:grid-cols-3' : 'lg:grid-cols-3'} max-w-7xl mx-auto`}>
        {Object.entries(PRICING_PLANS).map(([key, plan], index) => {
          const isCurrentPlan = key === currentPlan
          const yearlyPrice = plan.price > 0 ? Math.round(plan.price * 0.8) : 0
          const displayPrice = isYearly ? yearlyPrice : plan.price
          
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <Card className={`relative h-full transition-all duration-200 ${getPlanColor(key)} ${
                plan.popular ? 'scale-105 shadow-xl' : 'hover:shadow-lg'
              }`}>
                <CardHeader className="text-center pb-6">
                  <div className="flex justify-center mb-4">
                    {getPlanIcon(key)}
                  </div>
                  <CardTitle className="text-2xl font-bold text-slate-900">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    {key === 'free' && 'Perfect for getting started'}
                    {key === 'pro' && 'Best for growing teams'}
                    {key === 'enterprise' && 'For large organizations'}
                  </CardDescription>
                  
                  <div className="pt-4">
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-slate-900">
                        ${displayPrice}
                      </span>
                      <span className="text-slate-600 ml-1">
                        /{isYearly ? 'year' : 'month'}
                      </span>
                    </div>
                    
                    {isYearly && plan.price > 0 && (
                      <div className="text-sm text-green-600 mt-1">
                        Save ${(plan.price - yearlyPrice) * 12}/year
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start space-x-3">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSubscribe(key)}
                    disabled={loadingPlan === key || isCurrentPlan}
                    variant={getButtonVariant(key, isCurrentPlan)}
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white' 
                        : ''
                    }`}
                  >
                    {loadingPlan === key ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {getButtonText(key, isCurrentPlan)}
                        {!isCurrentPlan && <ArrowRight className="w-4 h-4 ml-2" />}
                      </>
                    )}
                  </Button>

                  {isCurrentPlan && (
                    <div className="text-center mt-3">
                      <span className="text-sm text-green-600 font-medium">
                        ✓ Active Plan
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {showHeader && (
        <div className="text-center mt-12">
          <p className="text-slate-600 mb-4">
            Need something custom? We'd love to help.
          </p>
          <Button variant="outline" size="lg">
            Contact Sales
          </Button>
        </div>
      )}
    </div>
  )
}

export default PricingPlans 