"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { PricingPlans } from '@/components/billing/pricing-plans'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, HelpCircle, MessageCircle, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

const faqItems = [
  {
    question: "Can I change my plan at any time?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. Changes will be prorated and reflected in your next billing cycle."
  },
  {
    question: "Is there a free trial?",
    answer: "Yes! We offer a 14-day free trial for all paid plans. No credit card required to start your trial."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, MasterCard, American Express) and PayPal. All payments are processed securely through Stripe."
  },
  {
    question: "Can I cancel my subscription?",
    answer: "Absolutely. You can cancel your subscription at any time from your billing dashboard. You'll continue to have access until the end of your billing period."
  },
  {
    question: "Do you offer discounts for annual billing?",
    answer: "Yes! You save 20% when you choose annual billing on any paid plan. The discount is applied automatically when you select yearly billing."
  },
  {
    question: "Is my data secure?",
    answer: "We take security seriously. All data is encrypted in transit and at rest, and we comply with industry-standard security practices including SOC 2 compliance."
  }
]

const features = {
  free: [
    "Up to 3 projects",
    "Basic kanban boards",
    "5 team members",
    "Email support",
    "Basic reporting",
    "1GB storage"
  ],
  pro: [
    "Everything in Free",
    "Unlimited projects",
    "Advanced kanban boards",
    "Unlimited team members",
    "AI-powered story generation",
    "Priority support",
    "Advanced analytics",
    "Custom integrations",
    "API access",
    "50GB storage"
  ],
  enterprise: [
    "Everything in Pro",
    "SSO integration",
    "Advanced security features",
    "Dedicated account manager",
    "Custom onboarding",
    "SLA guarantee",
    "Advanced compliance",
    "White-label options",
    "500GB storage",
    "Custom integrations"
  ]
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2">
              💰 Simple, Transparent Pricing
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
              Choose the Perfect Plan
              <span className="block text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">
                for Your Team
              </span>
            </h1>
            
            <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
              Start free and scale as you grow. All plans include core features with no setup fees or hidden costs.
            </p>
            
            <div className="flex items-center justify-center space-x-6 text-sm text-slate-600">
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>No setup fees</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PricingPlans showHeader={false} />
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Compare Features
            </h2>
            <p className="text-lg text-slate-600">
              See what's included in each plan
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {Object.entries(features).map(([plan, planFeatures], index) => (
              <motion.div
                key={plan}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className={`h-full ${plan === 'pro' ? 'ring-2 ring-blue-500' : ''}`}>
                  <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        plan === 'free' ? 'bg-slate-100' :
                        plan === 'pro' ? 'bg-gradient-to-br from-blue-600 to-purple-600' :
                        'bg-gradient-to-br from-purple-600 to-pink-600'
                      }`}>
                        <Zap className={`w-6 h-6 ${plan === 'free' ? 'text-slate-600' : 'text-white'}`} />
                      </div>
                    </div>
                    <CardTitle className="text-2xl font-bold capitalize">
                      {plan}
                    </CardTitle>
                    {plan === 'pro' && (
                      <Badge className="mt-2 bg-blue-100 text-blue-800">
                        Most Popular
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {planFeatures.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start space-x-3">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-slate-600">
              Get answers to common questions about our pricing and plans
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {faqItems.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-start space-x-3 text-lg">
                      <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>{item.question}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600">{item.answer}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Sales */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Need a Custom Solution?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              For enterprise teams with specific requirements, we offer custom plans and dedicated support.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-50">
                <MessageCircle className="w-5 h-5 mr-2" />
                Contact Sales
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Schedule Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
} 