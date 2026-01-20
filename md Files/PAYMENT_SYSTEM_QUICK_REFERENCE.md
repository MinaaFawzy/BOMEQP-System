# Quick Reference Guide - Payment System Features

## Overview
This guide provides quick instructions for using the new Automatic Transfer System and Stripe Connect Admin Portal features.

---

## For Admins: Stripe Connect Management

### Accessing the Screen
Navigate to: **Admin Dashboard → Stripe Connect Management**

### Managing Stripe Connect Accounts

#### 1. View All Accounts
- The main screen shows all accounts (ACCs, Training Centers, Instructors)
- Statistics cards show: Total, Connected, Pending, Failed accounts
- Use search bar to find specific accounts by name or email
- Filter by account type or connection status

#### 2. Initiate Stripe Connect for an Account
**Steps:**
1. Click **"Initiate Connect"** button
2. Select account type (ACC, Training Center, or Instructor)
3. Enter the account ID
4. Enter country code (e.g., "EG" for Egypt)
5. Click **"Initiate"**

**Result:**
- Stripe Connected Account created
- Onboarding link generated and sent to account email
- Status set to "Pending"

#### 3. View Account Details
**Steps:**
1. Click the eye icon (👁️) next to any account
2. View detailed information:
   - Account information
   - Stripe Connect status
   - Onboarding completion status
   - Bank information (if available)
   - Stripe Account ID

#### 4. Retry Failed Connection
**Steps:**
1. Find account with "Failed" status
2. Click the retry icon (🔄)
3. Confirm the action
4. New onboarding link will be generated

#### 5. Disconnect Stripe Connect
**Steps:**
1. Find account with "Connected" status
2. Click the disconnect icon (🔗)
3. Confirm the action (this cannot be undone)
4. Account status changes to "Inactive"

#### 6. Resend Onboarding Link
**Steps:**
1. View account details
2. Click **"Resend Onboarding Link"** button
3. New link sent to account email

---

## For Admins: Automatic Transfers Management

### Accessing the Screen
Navigate to: **Admin Dashboard → Automatic Transfers**

### Viewing Transfers

#### Statistics Dashboard
Shows at a glance:
- **Total Transfers**: All transfers processed
- **Completed**: Successfully transferred
- **Pending**: Waiting to be processed
- **Failed**: Transfers that failed
- **Total Gross**: Sum of all gross amounts
- **Total Commission**: Sum of all commissions (15%)
- **Total Net**: Sum of all net amounts transferred

#### Transfer Listing
Each transfer shows:
- User name and type
- Gross amount (total payment)
- Commission amount (15%)
- Net amount (transferred to user)
- Transfer status
- Date created

#### Filtering Transfers
**Search:**
- Enter Stripe Transfer ID or Stripe Account ID

**Filters:**
- **User Type**: ACC, Training Center, or Instructor
- **Status**: Pending, Processing, Completed, Failed, Retrying
- **Date Range**: Select from and to dates

#### View Transfer Details
**Steps:**
1. Click eye icon (👁️) or click on any transfer row
2. View complete information:
   - Transaction ID
   - User information
   - Amount breakdown (Gross, Commission, Net)
   - Stripe Transfer ID
   - Stripe Account ID
   - Error message (if failed)
   - Retry count
   - All timestamps

#### Retry Failed Transfer
**Steps:**
1. Find transfer with "Failed" status
2. Click retry icon (🔄)
3. Confirm the action
4. Transfer will be retried immediately

---

## For Training Centers: Viewing Transfer Information

### In Payment Transactions Screen

When viewing transaction details, if an automatic transfer was processed, you'll see:

**Automatic Transfer Information Section:**
- **Gross Amount**: The total payment amount
- **Commission (15%)**: Amount deducted as commission (shown in red)
- **Net Amount Transferred**: Amount you received (shown in green, larger)
- **Transfer Status**: Current status of the transfer
- **Stripe Transfer ID**: Reference ID from Stripe
- **Transferred At**: When the transfer was completed

### Understanding the Transfer Process

1. **Payment Received**: When a payment is successfully processed
2. **Automatic Calculation**: System automatically calculates:
   - Commission = Payment × 15%
   - Net Amount = Payment - Commission
3. **Automatic Transfer**: Net amount is automatically transferred to your Stripe Connect account
4. **Status Updates**: You can track the transfer status in real-time

---

## Transfer Status Meanings

| Status | Meaning |
|--------|---------|
| **Pending** | Transfer created, waiting to be processed |
| **Processing** | Transfer is currently being processed by Stripe |
| **Completed** | Transfer successfully sent to your account |
| **Failed** | Transfer failed (will be automatically retried) |
| **Retrying** | System is retrying the failed transfer |

---

## Stripe Connect Status Meanings

| Status | Meaning |
|--------|---------|
| **Pending** | Account created, onboarding not completed |
| **Connected** | Fully set up, can receive transfers |
| **Failed** | Setup failed, needs retry |
| **Inactive** | Disconnected from Stripe |
| **Updating** | Information being updated |

---

## Commission Structure

**Default Rate: 15%**

### Example Calculation:
```
Payment Amount:     $500.00
Commission (15%):   - $75.00
─────────────────────────────
Net Transfer:       $425.00
```

### Important Notes:
- Commission is automatically deducted from each payment
- Net amount is what gets transferred to your Stripe account
- Commission rate may vary per ACC (check with your ACC admin)
- All calculations are transparent and shown in transaction details

---

## Automatic Retry Logic

If a transfer fails, the system automatically retries:

1. **First Retry**: After 60 seconds
2. **Second Retry**: After 120 seconds (2 minutes)
3. **Third Retry**: After 240 seconds (4 minutes)

If all retries fail:
- Admin is notified
- Transfer can be manually retried
- You'll be notified of the issue

---

## Common Scenarios

### Scenario 1: New Account Needs Stripe Connect
**Problem**: Account doesn't have Stripe Connect set up
**Solution**: 
1. Admin initiates Stripe Connect
2. Account receives onboarding email
3. Account completes Stripe onboarding
4. Status changes to "Connected"
5. Can now receive automatic transfers

### Scenario 2: Transfer Failed
**Problem**: Automatic transfer failed
**Solution**:
1. System automatically retries (up to 3 times)
2. If still fails, admin can manually retry
3. Check Stripe Connect status
4. May need to update Stripe account information

### Scenario 3: Pending Transfers
**Problem**: Transfers stuck in "Pending" status
**Possible Causes**:
- Stripe Connect not completed
- Bank information missing
- Account verification needed
**Solution**:
1. Complete Stripe onboarding
2. Add bank account information
3. Verify identity with Stripe
4. Pending transfers will process automatically

---

## Best Practices

### For Admins:
1. ✅ Initiate Stripe Connect for new accounts immediately
2. ✅ Monitor failed transfers daily
3. ✅ Check activity logs regularly
4. ✅ Respond to pending transfers quickly
5. ✅ Keep Stripe webhook configured correctly

### For Account Holders:
1. ✅ Complete Stripe onboarding as soon as you receive the link
2. ✅ Keep bank information up to date
3. ✅ Monitor transfer status in payment transactions
4. ✅ Contact admin if transfers are failing
5. ✅ Ensure Stripe account is verified

---

## Troubleshooting

### Transfer Not Showing
**Check:**
- Is payment status "Completed"?
- Is Stripe Connect status "Connected"?
- Was payment processed after Stripe Connect setup?

### Transfer Failed
**Check:**
- Stripe Connect status
- Bank account information
- Stripe account verification status
- Error message in transfer details

### Can't Initiate Stripe Connect
**Check:**
- Are you logged in as admin?
- Is account ID correct?
- Is country code valid?

---

## Support

For issues or questions:
1. Check this guide first
2. View detailed error messages in transfer details
3. Check Stripe Connect status
4. Contact system administrator
5. Review activity logs for audit trail

---

## Security Notes

- All transfers are processed through Stripe's secure platform
- All admin actions are logged for audit
- Webhook signatures are verified
- Idempotency prevents duplicate transfers
- All sensitive data is encrypted

---

## Additional Resources

- **Automatic Transfer System Documentation**: `AUTOMATIC_TRANSFER_SYSTEM.md`
- **Stripe Connect Admin Portal Documentation**: `STRIPE_CONNECT_ADMIN_PORTAL.md`
- **Implementation Summary**: `PAYMENT_LOGIC_IMPLEMENTATION_SUMMARY.md`

---

*Last Updated: January 20, 2026*
