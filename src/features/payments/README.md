# Payments Domain

## Responsibilities
- Secure checkout and Nigerian fiat payment integrations (Paystack, Flutterwave, Monnify, Bank Transfer)
- Fulfillment hold until delivery and inspection verification
- Payouts and disbursements to farmers upon confirmed delivery
- Webhook idempotency and fraud protection
- Gateway refund processing for arbitrated dispute resolutions

## Payment Architecture Rules
- Nigerian fiat (NGN) is the platform foundation.
- Crypto/non-fiat tokens are strictly excluded from the payment and settlement engine.
