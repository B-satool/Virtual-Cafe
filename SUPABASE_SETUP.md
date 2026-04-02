# Supabase Configuration Guide

## Issue: Email Confirmation & Duplicate Key Error

You're getting a "duplicate key" error when signing up because:
1. Supabase Email Confirmation is **enabled** (you're getting confirmation emails)
2. The redirect URL in Supabase is not properly configured
3. The app tries to create duplicate user profiles

## Fix: Disable Email Confirmation (Development)

For development/testing, it's easiest to disable email confirmation:

### Step 1: Go to Supabase Dashboard
1. Open [https://app.supabase.com](https://app.supabase.com)
2. Select your project: **Virtual Café**
3. Go to **Authentication** (left sidebar)
4. Click **Providers** tab
5. Click **Email** provider

### Step 2: Disable Email Confirmation
1. Scroll to **Email Confirmations**
2. Toggle **"Enable Email Confirmations"** to **OFF**
3. Click **Save**

### Step 3: Clear Test Data (Optional)
If you want to clean up the test accounts:
1. Go to **Authentication** → **Users**
2. Delete any test accounts
3. Refresh the signup page and try again

## For Production: Enable Email Confirmation Properly

If you want email confirmation enabled (recommended for production):

### Step 1: Configure Redirect URL
1. In Supabase Dashboard → **Authentication** → **URL Configuration**
2. Add your app URL to **Redirect URLs**:
   - Development: `http://localhost:3001/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`
3. Click **Save**

### Step 2: Email Confirmation is Now Active
Users will:
1. Sign up with email/password
2. Receive confirmation email
3. Click confirmation link
4. Return to the app and can login

## Testing the Fix

After making changes:

1. **Clear browser storage**:
   - Press `F12` (Developer Tools)
   - Go to **Application** tab
   - Clear **Local Storage**
   - Refresh page

2. **Try signing up again**:
   - Email should no longer be required for confirmation (if disabled)
   - You should be automatically logged in
   - No more duplicate key errors

## Error Messages Explained

| Error | Cause | Solution |
|-------|-------|----------|
| "duplicate key value violates unique constraint" | User already exists in auth | Clear auth user or use unique email |
| "site can't be reached" on email link | Redirect URL not configured | Configure redirect URL in Supabase |
| "bad request" on signup | Validation failed or profile creation error | Check email format, password strength |

## Database Schema

Email confirmations require this schema (already created):
- `user_profiles` table with `id` as UUID (matches auth.users.id)
- Trigger to create profile on user signup (optional - app does this)

## Need More Help?

- Supabase Auth Docs: https://supabase.com/docs/guides/auth
- Email Confirmations: https://supabase.com/docs/guides/auth/email
- Redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
