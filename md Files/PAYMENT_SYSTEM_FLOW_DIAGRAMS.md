# Payment System Flow Diagrams

## 1. Automatic Transfer System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT SUCCESS EVENT                         │
│                 (Stripe Webhook Received)                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Update Transaction Status                           │
│                  status = "completed"                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Calculate Commission Split                          │
│                                                                  │
│  Gross Amount:    $500.00  (Payment received)                   │
│  Commission:      - $75.00  (15% of gross)                      │
│  ─────────────────────────                                      │
│  Net Amount:      $425.00  (To be transferred)                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           Create Transfer Record in Database                     │
│                                                                  │
│  - transaction_id                                               │
│  - user_id, user_type                                           │
│  - gross_amount, commission_amount, net_amount                  │
│  - status = "pending"                                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
                    ┌────────┐
                    │ Check  │
                    │ Stripe │──────No────┐
                    │Account?│             │
                    └───┬────┘             │
                        │                  │
                       Yes                 ▼
                        │         ┌──────────────────┐
                        │         │ Set status =     │
                        │         │ "pending"        │
                        │         │ Notify Admin     │
                        │         └──────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              Execute Stripe Transfer API                         │
│                                                                  │
│  Stripe.Transfer.create({                                       │
│    amount: net_amount,                                          │
│    destination: stripe_account_id,                              │
│    transfer_group: transaction_id                               │
│  })                                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    ┌────┴────┐
                    │         │
                 Success    Failure
                    │         │
                    ▼         ▼
        ┌──────────────┐  ┌──────────────────┐
        │ Update:      │  │ Update:          │
        │ status =     │  │ status = "failed"│
        │ "completed"  │  │ retry_count++    │
        │ stripe_      │  │ error_message    │
        │ transfer_id  │  │                  │
        │ completed_at │  │ Schedule Retry:  │
        └──────────────┘  │ - 60s (1st)      │
                          │ - 120s (2nd)     │
                          │ - 240s (3rd)     │
                          └──────────────────┘
```

---

## 2. Stripe Connect Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN INITIATES CONNECT                       │
│                                                                  │
│  Admin Portal → Initiate Connect Button                         │
│  - Select account type (ACC/TC/Instructor)                      │
│  - Enter account ID                                             │
│  - Enter country code                                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           Create Stripe Connected Account                        │
│                                                                  │
│  Stripe.Account.create({                                        │
│    type: 'express',                                             │
│    country: country_code,                                       │
│    email: account_email,                                        │
│    capabilities: {                                              │
│      transfers: { requested: true }                             │
│    }                                                            │
│  })                                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           Generate Account Link (Onboarding URL)                 │
│                                                                  │
│  Stripe.AccountLink.create({                                    │
│    account: stripe_account_id,                                  │
│    refresh_url: 'https://app.com/refresh',                      │
│    return_url: 'https://app.com/return',                        │
│    type: 'account_onboarding'                                   │
│  })                                                             │
│                                                                  │
│  URL valid for: 24 hours                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Update Database & Send Email                        │
│                                                                  │
│  Database:                                                      │
│  - stripe_account_id                                            │
│  - stripe_connect_status = "pending"                            │
│  - stripe_onboarding_url                                        │
│  - stripe_connected_by_admin                                    │
│  - stripe_connected_at                                          │
│                                                                  │
│  Email: Send onboarding link to account                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Account Completes Onboarding                        │
│                                                                  │
│  User clicks link → Stripe Onboarding Form:                     │
│  1. Business/Personal Information                               │
│  2. Bank Account Details                                        │
│  3. Identity Verification                                       │
│  4. Terms of Service                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Stripe Webhook: account.updated                     │
│                                                                  │
│  Update Database:                                               │
│  - stripe_connect_status = "connected"                          │
│  - stripe_onboarding_completed = true                           │
│  - stripe_requirements (if any)                                 │
│  - bank_info                                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  READY TO RECEIVE TRANSFERS                      │
│                                                                  │
│  Account can now receive automatic transfers                    │
│  from successful payments                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Complete Payment to Transfer Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER MAKES PAYMENT                            │
│                                                                  │
│  Training Center purchases codes/courses                         │
│  Amount: $500.00                                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Stripe Payment Intent Created                       │
│                                                                  │
│  Transaction created in database                                │
│  status = "pending"                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Payment Processed by Stripe                         │
│                                                                  │
│  User completes payment                                         │
│  Stripe processes card                                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         Webhook: payment_intent.succeeded                        │
│                                                                  │
│  Platform receives: $500.00                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Automatic Transfer Triggered                        │
│                                                                  │
│  Calculate:                                                     │
│  ┌──────────────────────────────────────┐                      │
│  │ Gross:      $500.00                  │                      │
│  │ Commission: - $75.00 (15%)           │                      │
│  │ ─────────────────────                │                      │
│  │ Net:        $425.00                  │                      │
│  └──────────────────────────────────────┘                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Platform Keeps Commission                           │
│                                                                  │
│  Platform Balance: + $75.00                                     │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         Transfer Net Amount to User's Stripe Account             │
│                                                                  │
│  Stripe Transfer: $425.00                                       │
│  From: Platform Stripe Account                                  │
│  To: User's Connected Account                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              User Receives Funds                                 │
│                                                                  │
│  User's Stripe Balance: + $425.00                              │
│  Processing time: 2-7 business days to bank                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Admin Dashboard Views

```
┌─────────────────────────────────────────────────────────────────┐
│              STRIPE CONNECT MANAGEMENT                           │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Total   │  │Connected │  │ Pending  │  │  Failed  │       │
│  │   100    │  │    85    │  │    10    │  │     5    │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Search: [_________________]  Type: [All ▼] Status: [All▼]│  │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Name          │ Email        │ Type │ Status    │ Actions│  │
│  ├────────────────────────────────────────────────────────┤    │
│  │ ACC Alpha     │ acc@...      │ ACC  │ Connected │ 👁️ 🔗 │  │
│  │ TC Beta       │ tc@...       │ TC   │ Pending   │ 👁️ 🔄 │  │
│  │ Instructor X  │ inst@...     │ INST │ Failed    │ 👁️ 🔄 │  │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              AUTOMATIC TRANSFERS                                 │
│                                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ │
│  │ Total   │ │Completed│ │ Pending │ │ Failed  │ │Total Gross│ │
│  │  100    │ │   95    │ │    3    │ │    2    │ │ $50,000  │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └──────────┘ │
│                                                                  │
│  ┌─────────────┐ ┌──────────┐                                  │
│  │Total Comm.  │ │Total Net │                                  │
│  │  $7,500     │ │ $42,500  │                                  │
│  └─────────────┘ └──────────┘                                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Search: [_______] Type:[All▼] Status:[All▼] From:[__]│    │
│  │ To:[__]                                                │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ User    │ Gross  │ Comm.  │ Net    │ Status    │ Actions│  │
│  ├────────────────────────────────────────────────────────┤    │
│  │ TC A    │ $500   │ $75    │ $425   │ Completed │ 👁️     │  │
│  │ TC B    │ $300   │ $45    │ $255   │ Pending   │ 👁️     │  │
│  │ TC C    │ $200   │ $30    │ $170   │ Failed    │ 👁️ 🔄  │  │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. User View - Payment Transaction Details

```
┌─────────────────────────────────────────────────────────────────┐
│              TRANSACTION DETAILS                                 │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ Type             │  │ Status           │                    │
│  │ Code Purchase    │  │ ✓ Completed      │                    │
│  └──────────────────┘  └──────────────────┘                    │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ Amount           │  │ Payment Method   │                    │
│  │ $500.00 USD      │  │ Credit Card      │                    │
│  └──────────────────┘  └──────────────────┘                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ 💰 AUTOMATIC TRANSFER INFORMATION                    │      │
│  │                                                       │      │
│  │  ┌─────────────────────────────────────────────┐    │      │
│  │  │ Gross Amount:              $500.00          │    │      │
│  │  │ Commission (15%):         -$75.00 🔴        │    │      │
│  │  │ ═══════════════════════════════════         │    │      │
│  │  │ Net Amount Transferred:    $425.00 🟢       │    │      │
│  │  └─────────────────────────────────────────────┘    │      │
│  │                                                       │      │
│  │  Transfer Status: ✓ Completed                        │      │
│  │  Stripe Transfer ID: tr_1234567890abcdef             │      │
│  │  Transferred At: Jan 20, 2026, 3:30 PM              │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
│  Created: Jan 20, 2026, 3:28 PM                                │
│  Completed: Jan 20, 2026, 3:30 PM                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Error Handling & Retry Flow

```
                    Transfer Fails
                         │
                         ▼
            ┌────────────────────────┐
            │ Set status = "failed"  │
            │ Save error_message     │
            │ retry_count = 0        │
            └────────┬───────────────┘
                     │
                     ▼
            ┌────────────────────────┐
            │ Wait 60 seconds        │
            └────────┬───────────────┘
                     │
                     ▼
            ┌────────────────────────┐
            │ Retry Attempt #1       │
            └────────┬───────────────┘
                     │
                ┌────┴────┐
                │         │
             Success   Failure
                │         │
                ▼         ▼
         ┌──────────┐  ┌────────────────────┐
         │Completed │  │ retry_count = 1    │
         └──────────┘  │ Wait 120 seconds   │
                       └────────┬───────────┘
                                │
                                ▼
                       ┌────────────────────┐
                       │ Retry Attempt #2   │
                       └────────┬───────────┘
                                │
                           ┌────┴────┐
                           │         │
                        Success   Failure
                           │         │
                           ▼         ▼
                    ┌──────────┐  ┌────────────────────┐
                    │Completed │  │ retry_count = 2    │
                    └──────────┘  │ Wait 240 seconds   │
                                  └────────┬───────────┘
                                           │
                                           ▼
                                  ┌────────────────────┐
                                  │ Retry Attempt #3   │
                                  └────────┬───────────┘
                                           │
                                      ┌────┴────┐
                                      │         │
                                   Success   Failure
                                      │         │
                                      ▼         ▼
                               ┌──────────┐  ┌────────────────┐
                               │Completed │  │ retry_count=3  │
                               └──────────┘  │ Notify Admin   │
                                             │ Manual Action  │
                                             │ Required       │
                                             └────────────────┘
```

---

## Legend

- 👁️ = View Details
- 🔄 = Retry
- 🔗 = Disconnect
- ✓ = Success/Completed
- 🔴 = Negative/Deduction
- 🟢 = Positive/Received
- ▼ = Dropdown Menu

---

*These diagrams illustrate the complete flow of the Automatic Transfer System and Stripe Connect integration.*
