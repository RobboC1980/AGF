# AgileForge Stripe Packages System

This document describes the comprehensive Stripe packages system for AgileForge, including subscription plans, one-time purchases, add-ons, and credit packs.

## Overview

The Stripe packages system provides:
- **Subscription Plans**: Monthly/annual recurring billing for different feature tiers
- **Credit Packs**: One-time purchases of AI story generation credits
- **Add-ons**: Additional features that can be added to existing subscriptions
- **Enterprise**: Custom pricing and features for large organizations

## Package Types

### Subscription Plans

1. **Starter Team (Free)**
   - Up to 3 team members
   - 25 AI-generated stories monthly
   - 5 projects, 1GB storage
   - Basic features and community support

2. **Professional ($10/month, $100/year)**
   - Unlimited team members
   - 200 AI stories monthly per user
   - Unlimited projects, 50GB storage
   - Advanced integrations and email support

3. **Business ($18/month, $180/year)**
   - Everything in Professional
   - Unlimited AI story generation
   - 200GB storage, priority support
   - SSO, API access, advanced analytics

### Credit Packs (One-time purchases)

1. **50 AI Stories** - £5.00
   - 50 additional AI-generated user stories
   - Valid for 90 days
   - Works with any plan

2. **100 AI Stories** - £9.00 (10% discount)
   - 100 additional AI-generated user stories
   - Valid for 90 days

3. **250 AI Stories** - £20.00 (20% discount)
   - 250 additional AI-generated user stories
   - Valid for 120 days
   - Priority AI processing

### Add-ons (Monthly subscriptions)

1. **Extra Storage** - £2.00/month
   - Additional 10GB storage
   - File versioning and automatic backups

2. **Priority Support** - £5.00/month
   - 4-hour response time
   - Phone support during business hours

3. **Advanced Integrations** - £8.00/month
   - Salesforce, Azure DevOps, Confluence, Notion
   - Custom webhook endpoints

## Setup Instructions

### 1. Environment Configuration

Ensure your `.env` file contains the required Stripe configuration:

```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...  # Optional for development

# Database
DATABASE_URL=postgresql://user:password@host:port/database
```

### 2. Database Setup

Run the initialization script to create tables and set up packages:

```bash
cd backend
python scripts/init_stripe_packages.py
```

This will:
- Create all necessary database tables
- Set up Stripe products and prices
- Initialize package data in the database

### 3. Webhook Configuration

Configure Stripe webhooks to point to your application:

**Webhook URL**: `https://yourdomain.com/api/packages/webhook`

**Events to listen for**:
- `checkout.session.completed`
- `payment_intent.succeeded`
- `invoice.payment_succeeded`
- `customer.subscription.deleted`

## API Endpoints

### Package Management

#### Get All Packages
```http
GET /api/packages/
GET /api/packages/?package_type=subscription
```

#### Get Subscription Plans
```http
GET /api/packages/subscriptions
```

#### Get Add-ons
```http
GET /api/packages/addons
```

#### Get Credit Packs
```http
GET /api/packages/credits
```

#### Get Specific Package
```http
GET /api/packages/{package_id}
```

### Checkout & Purchases

#### Create Checkout Session
```http
POST /api/packages/checkout
Content-Type: application/json

{
  "package_id": "professional_monthly",
  "success_url": "https://yourdomain.com/success",
  "cancel_url": "https://yourdomain.com/cancel",
  "trial_days": 14
}
```

#### Get User Purchase History
```http
GET /api/packages/user/purchases
GET /api/packages/user/purchases?limit=20&offset=0
```

#### Get User Credits
```http
GET /api/packages/user/credits
```

### Webhooks

#### Stripe Webhook Handler
```http
POST /api/packages/webhook
```

## Usage Examples

### Frontend Integration

```javascript
// Get all subscription packages
const response = await fetch('/api/packages/subscriptions', {
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});
const subscriptionPlans = await response.json();

// Create checkout session
const checkoutResponse = await fetch('/api/packages/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    package_id: 'professional_monthly',
    success_url: window.location.origin + '/success',
    cancel_url: window.location.origin + '/pricing',
    trial_days: 14
  })
});

const { url } = await checkoutResponse.json();
window.location.href = url; // Redirect to Stripe Checkout
```

### Credit Usage Tracking

```python
from services.stripe_packages import stripe_package_manager

# Check user credits before AI story generation
async def generate_ai_story(user_id: str, story_data: dict):
    # Check if user has credits
    credits = await get_user_credits(user_id)
    ai_credits = credits.get('ai_stories', {})
    
    if ai_credits.get('remaining_credits', 0) <= 0:
        raise HTTPException(
            status_code=402, 
            detail="Insufficient AI story credits"
        )
    
    # Generate the story
    story = await ai_service.generate_story(story_data)
    
    # Deduct credit
    await deduct_credit(user_id, 'ai_stories', 1, story['id'])
    
    return story
```

## Database Schema

### Key Tables

- **stripe_products**: Package definitions and Stripe product IDs
- **checkout_sessions**: Tracks Stripe checkout sessions
- **user_purchases**: Completed purchase records
- **user_credits**: Credit balances and usage tracking
- **subscription_addons**: Add-ons attached to subscriptions

### Views

- **user_credit_summary**: Aggregated credit balances by user
- **package_performance**: Analytics on package sales and revenue

## Testing

### Test Mode

For development, use Stripe test keys:

```bash
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### Test Cards

Use Stripe's test card numbers:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **3D Secure**: 4000 0025 0000 3155

## Monitoring & Analytics

### Package Performance

```http
GET /api/packages/analytics/performance
```

Returns metrics including:
- Total purchases and revenue
- Average purchase value
- 30-day performance trends
- Conversion rates

### Credit Usage

Monitor credit usage patterns:
- Most popular credit pack sizes
- Credit expiration rates
- Usage patterns by plan type

## Security Considerations

1. **Webhook Verification**: Always verify Stripe webhook signatures in production
2. **API Authentication**: All endpoints require valid user authentication
3. **Rate Limiting**: Implement rate limiting on checkout creation
4. **Data Validation**: Validate all package IDs and user permissions

## Troubleshooting

### Common Issues

1. **Webhook Failures**
   - Check webhook URL is accessible
   - Verify webhook secret configuration
   - Check server logs for processing errors

2. **Checkout Session Creation Fails**
   - Verify Stripe API keys
   - Check package exists and is active
   - Ensure user doesn't have conflicting subscriptions

3. **Credit Deduction Issues**
   - Check user has sufficient credits
   - Verify credit expiration dates
   - Check for database constraint violations

### Logs

Monitor these log patterns:
- `"Created Stripe product"` - Product creation
- `"Processed checkout completion"` - Successful purchases
- `"Granted credits"` - Credit allocation
- `"Usage warning"` - Credit limit notifications

## Support

For issues with the Stripe packages system:
1. Check server logs for error details
2. Verify Stripe dashboard for payment status
3. Check database for data consistency
4. Review webhook delivery in Stripe dashboard 