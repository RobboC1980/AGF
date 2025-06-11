"""
AgileForge Billing and Subscription Schema
Complete monetization models for subscription management, usage tracking, and billing
"""

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, ForeignKey, 
    Enum, JSON, Numeric, Index, UniqueConstraint, CheckConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

Base = declarative_base()

# =====================================
# BILLING ENUMS
# =====================================

class PlanType(enum.Enum):
    FREE = "free"
    PROFESSIONAL = "professional"
    BUSINESS = "business"
    ENTERPRISE = "enterprise"

class BillingCycle(enum.Enum):
    MONTHLY = "monthly"
    ANNUAL = "annual"

class SubscriptionStatus(enum.Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    UNPAID = "unpaid"
    TRIALING = "trialing"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"

class PaymentStatus(enum.Enum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"

class UsageType(enum.Enum):
    AI_STORY_GENERATION = "ai_story_generation"
    API_CALLS = "api_calls"
    STORAGE = "storage"
    TEAM_MEMBERS = "team_members"

# =====================================
# SUBSCRIPTION PLANS
# =====================================

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    
    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    plan_type = Column(Enum(PlanType), nullable=False)
    
    # Pricing
    price_monthly = Column(Numeric(10, 2), nullable=False, default=0)
    price_annual = Column(Numeric(10, 2), nullable=False, default=0)
    currency = Column(String(3), default="GBP")
    
    # Stripe Integration
    stripe_price_id_monthly = Column(String(100))
    stripe_price_id_annual = Column(String(100))
    stripe_product_id = Column(String(100))
    
    # Features & Limits
    max_team_members = Column(Integer, default=3)
    max_projects = Column(Integer, default=5)
    ai_stories_monthly = Column(Integer, default=25)  # -1 for unlimited
    max_storage_gb = Column(Integer, default=1)
    
    # Feature Flags
    advanced_ai_features = Column(Boolean, default=False)
    priority_support = Column(Boolean, default=False)
    custom_integrations = Column(Boolean, default=False)
    advanced_analytics = Column(Boolean, default=False)
    sso_enabled = Column(Boolean, default=False)
    api_access = Column(Boolean, default=False)
    custom_branding = Column(Boolean, default=False)
    
    # Metadata
    description = Column(Text)
    features_list = Column(JSON)  # Array of feature descriptions
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    subscriptions = relationship("UserSubscription", back_populates="plan")

class UserSubscription(Base):
    __tablename__ = "user_subscriptions"
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    plan_id = Column(String(36), ForeignKey("subscription_plans.id"), nullable=False)
    
    # Stripe Integration
    stripe_subscription_id = Column(String(100), unique=True)
    stripe_customer_id = Column(String(100), nullable=False)
    
    # Subscription Details
    status = Column(Enum(SubscriptionStatus), nullable=False)
    billing_cycle = Column(Enum(BillingCycle), nullable=False)
    
    # Dates
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True))
    trial_end = Column(DateTime(timezone=True))
    current_period_start = Column(DateTime(timezone=True))
    current_period_end = Column(DateTime(timezone=True))
    
    # Billing
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="GBP")
    
    # Cancellation
    cancel_at_period_end = Column(Boolean, default=False)
    canceled_at = Column(DateTime(timezone=True))
    cancellation_reason = Column(Text)
    
    # Metadata
    metadata = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    plan = relationship("SubscriptionPlan", back_populates="subscriptions")
    usage_records = relationship("UsageRecord", back_populates="subscription")
    invoices = relationship("Invoice", back_populates="subscription")
    
    __table_args__ = (
        Index('idx_user_subscription_status', 'user_id', 'status'),
        Index('idx_stripe_subscription_id', 'stripe_subscription_id'),
    )

# =====================================
# USAGE TRACKING
# =====================================

class UsageRecord(Base):
    __tablename__ = "usage_records"
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    subscription_id = Column(String(36), ForeignKey("user_subscriptions.id"), nullable=False)
    
    # Usage Details
    usage_type = Column(Enum(UsageType), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_cost = Column(Numeric(8, 5), default=0)  # Cost per unit
    total_cost = Column(Numeric(10, 2), default=0)
    
    # Time Period
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Context
    resource_id = Column(String(36))  # ID of story, project, etc.
    metadata = Column(JSON)
    
    # Relationships
    user = relationship("User")
    subscription = relationship("UserSubscription", back_populates="usage_records")
    
    __table_args__ = (
        Index('idx_usage_user_type_period', 'user_id', 'usage_type', 'period_start'),
        Index('idx_usage_subscription_period', 'subscription_id', 'period_start'),
    )

class UsageLimit(Base):
    __tablename__ = "usage_limits"
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    usage_type = Column(Enum(UsageType), nullable=False)
    
    # Limits
    monthly_limit = Column(Integer, nullable=False)  # -1 for unlimited
    current_usage = Column(Integer, default=0)
    
    # Period
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    
    # Overage
    overage_allowed = Column(Boolean, default=True)
    overage_rate = Column(Numeric(8, 5), default=0)  # Cost per unit over limit
    overage_usage = Column(Integer, default=0)
    overage_cost = Column(Numeric(10, 2), default=0)
    
    # Notifications
    warning_sent_75 = Column(Boolean, default=False)
    warning_sent_90 = Column(Boolean, default=False)
    limit_reached_notification = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    
    __table_args__ = (
        UniqueConstraint('user_id', 'usage_type', 'period_start', name='unique_user_usage_limit'),
        Index('idx_usage_limit_user_type', 'user_id', 'usage_type'),
    )

# =====================================
# BILLING & PAYMENTS
# =====================================

class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    subscription_id = Column(String(36), ForeignKey("user_subscriptions.id"))
    
    # Stripe Integration
    stripe_invoice_id = Column(String(100), unique=True)
    stripe_payment_intent_id = Column(String(100))
    
    # Invoice Details
    invoice_number = Column(String(50), unique=True, nullable=False)
    status = Column(Enum(PaymentStatus), nullable=False)
    
    # Amounts
    subtotal = Column(Numeric(10, 2), nullable=False)
    tax_amount = Column(Numeric(10, 2), default=0)
    discount_amount = Column(Numeric(10, 2), default=0)
    total_amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="GBP")
    
    # Dates
    invoice_date = Column(DateTime(timezone=True), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=False)
    paid_at = Column(DateTime(timezone=True))
    
    # Details
    description = Column(Text)
    notes = Column(Text)
    metadata = Column(JSON)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    subscription = relationship("UserSubscription", back_populates="invoices")
    line_items = relationship("InvoiceLineItem", back_populates="invoice")
    
    __table_args__ = (
        Index('idx_invoice_user_status', 'user_id', 'status'),
        Index('idx_invoice_date', 'invoice_date'),
    )

class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"
    
    id = Column(String(36), primary_key=True)
    invoice_id = Column(String(36), ForeignKey("invoices.id"), nullable=False)
    
    # Item Details
    description = Column(String(500), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(10, 2), nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)
    
    # Type
    item_type = Column(String(50))  # subscription, overage, one_time
    usage_type = Column(Enum(UsageType))
    
    # Period
    period_start = Column(DateTime(timezone=True))
    period_end = Column(DateTime(timezone=True))
    
    # Metadata
    metadata = Column(JSON)
    
    # Relationships
    invoice = relationship("Invoice", back_populates="line_items")

# =====================================
# PAYMENTS & TRANSACTIONS
# =====================================

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    invoice_id = Column(String(36), ForeignKey("invoices.id"))
    
    # Stripe Integration
    stripe_payment_intent_id = Column(String(100), unique=True)
    stripe_charge_id = Column(String(100))
    
    # Payment Details
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="GBP")
    status = Column(Enum(PaymentStatus), nullable=False)
    
    # Payment Method
    payment_method_type = Column(String(50))  # card, bank_transfer, etc.
    last_four_digits = Column(String(4))
    card_brand = Column(String(20))
    
    # Dates
    processed_at = Column(DateTime(timezone=True))
    failed_at = Column(DateTime(timezone=True))
    refunded_at = Column(DateTime(timezone=True))
    
    # Details
    failure_reason = Column(Text)
    receipt_url = Column(String(500))
    metadata = Column(JSON)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    invoice = relationship("Invoice")
    
    __table_args__ = (
        Index('idx_payment_user_status', 'user_id', 'status'),
        Index('idx_payment_stripe_intent', 'stripe_payment_intent_id'),
    )

# =====================================
# BILLING ANALYTICS
# =====================================

class RevenueAnalytics(Base):
    __tablename__ = "revenue_analytics"
    
    id = Column(String(36), primary_key=True)
    
    # Time Period
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    period_type = Column(String(20), nullable=False)  # daily, weekly, monthly
    
    # Revenue Metrics
    total_revenue = Column(Numeric(12, 2), default=0)
    subscription_revenue = Column(Numeric(12, 2), default=0)
    overage_revenue = Column(Numeric(12, 2), default=0)
    one_time_revenue = Column(Numeric(12, 2), default=0)
    
    # Subscription Metrics
    new_subscriptions = Column(Integer, default=0)
    canceled_subscriptions = Column(Integer, default=0)
    active_subscriptions = Column(Integer, default=0)
    
    # Plan Breakdown
    free_users = Column(Integer, default=0)
    professional_users = Column(Integer, default=0)
    business_users = Column(Integer, default=0)
    enterprise_users = Column(Integer, default=0)
    
    # Usage Metrics
    total_ai_stories_generated = Column(Integer, default=0)
    average_usage_per_user = Column(Numeric(8, 2), default=0)
    
    # Conversion Metrics
    trial_conversions = Column(Integer, default=0)
    upgrade_conversions = Column(Integer, default=0)
    churn_rate = Column(Numeric(5, 4), default=0)  # Percentage as decimal
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('period_start', 'period_type', name='unique_analytics_period'),
        Index('idx_analytics_period', 'period_start', 'period_type'),
    )

# =====================================
# DISCOUNT & COUPON SYSTEM
# =====================================

class Coupon(Base):
    __tablename__ = "coupons"
    
    id = Column(String(36), primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    
    # Stripe Integration
    stripe_coupon_id = Column(String(100))
    
    # Discount Details
    discount_type = Column(String(20), nullable=False)  # percentage, fixed_amount
    discount_value = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="GBP")
    
    # Limitations
    max_redemptions = Column(Integer)
    redemptions_count = Column(Integer, default=0)
    
    # Validity
    valid_from = Column(DateTime(timezone=True), nullable=False)
    valid_until = Column(DateTime(timezone=True))
    
    # Applicable Plans
    applicable_plans = Column(JSON)  # Array of plan IDs
    
    # Metadata
    name = Column(String(200))
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(String(36), ForeignKey("users.id"))
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    redemptions = relationship("CouponRedemption", back_populates="coupon")

class CouponRedemption(Base):
    __tablename__ = "coupon_redemptions"
    
    id = Column(String(36), primary_key=True)
    coupon_id = Column(String(36), ForeignKey("coupons.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    subscription_id = Column(String(36), ForeignKey("user_subscriptions.id"))
    
    # Redemption Details
    discount_amount = Column(Numeric(10, 2), nullable=False)
    redeemed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    coupon = relationship("Coupon", back_populates="redemptions")
    user = relationship("User")
    subscription = relationship("UserSubscription")
    
    __table_args__ = (
        UniqueConstraint('coupon_id', 'user_id', name='unique_coupon_user_redemption'),
    ) 