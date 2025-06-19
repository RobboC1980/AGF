"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BillingDashboard } from '@/components/billing/billing-dashboard'
import { PricingPlans } from '@/components/billing/pricing-plans'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreditCard, Package, Receipt } from 'lucide-react'

// Mock data - replace with actual API calls
const mockSubscription = {
  id: 'sub_1234567890',
  status: 'active' as const,
  current_period_start: '2024-01-01T00:00:00Z',
  current_period_end: '2024-02-01T00:00:00Z',
  plan: {
    id: 'pro',
    name: 'Pro',
    price: 2900, // $29.00 in cents
    interval: 'month'
  },
  cancel_at_period_end: false
}

const mockPaymentMethods = [
  {
    id: 'pm_1234567890',
    type: 'card' as const,
    card: {
      brand: 'visa',
      last4: '4242',
      exp_month: 12,
      exp_year: 2025
    },
    is_default: true
  }
]

const mockInvoices = [
  {
    id: 'in_1234567890',
    number: 'INV-001',
    status: 'paid' as const,
    amount_paid: 2900,
    currency: 'usd',
    created: '2024-01-01T00:00:00Z',
    period_start: '2024-01-01T00:00:00Z',
    period_end: '2024-02-01T00:00:00Z',
    invoice_pdf: 'https://example.com/invoice.pdf'
  }
]

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Required</CardTitle>
            <CardDescription>
              Please sign in to view your billing information.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Billing & Subscription</h1>
            <p className="text-slate-600">
              Manage your subscription, payment methods, and billing history.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="plans" className="flex items-center space-x-2">
                <Package className="w-4 h-4" />
                <span>Plans</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center space-x-2">
                <Receipt className="w-4 h-4" />
                <span>History</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <BillingDashboard
                subscription={mockSubscription}
                paymentMethods={mockPaymentMethods}
                invoices={mockInvoices}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="plans">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Subscription Plans</CardTitle>
                    <CardDescription>
                      Choose the plan that best fits your team's needs. You can upgrade or downgrade at any time.
                    </CardDescription>
                  </CardHeader>
                </Card>
                
                <PricingPlans 
                  currentPlan="pro" 
                  showHeader={false} 
                  compact={true} 
                />
              </motion.div>
            </TabsContent>

            <TabsContent value="history">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <BillingDashboard
                  subscription={mockSubscription}
                  paymentMethods={mockPaymentMethods}
                  invoices={mockInvoices}
                  isLoading={isLoading}
                />
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  )
} 