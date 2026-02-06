# Environment Variables Setup Guide

## File Overview

### `.env` (Can be committed to git)
- **Purpose**: Default/shared environment variables
- **Git**: Usually committed (but don't put real secrets here)
- **Use for**: Non-sensitive defaults, example values

### `.env.local` (NEVER commit to git)
- **Purpose**: Local development and sensitive values
- **Git**: Ignored (in `.gitignore`)
- **Use for**: Your actual API keys, secrets, and local-only values

## For Your Project

### Current Setup:

**`.env`** - Server-side credentials (can be shared):
```env
AUTHORIZENET_API_LOGIN_ID=6d7Q69phFA
AUTHORIZENET_TRANSACTION_KEY=6hfX47eUU4534VxS
AUTHORIZENET_ENV=production
```

**`.env.local`** - Client-side + Server-side (your actual secrets):
```env
# Server-side (duplicated from .env for local dev)
AUTHORIZENET_API_LOGIN_ID=6d7Q69phFA
AUTHORIZENET_TRANSACTION_KEY=6hfX47eUU4534VxS
AUTHORIZENET_ENV=production

# Client-side (REQUIRED for Accept.js - must have NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_AUTHORIZENET_CLIENT_KEY=your_actual_client_key
NEXT_PUBLIC_AUTHORIZENET_API_LOGIN_ID=6d7Q69phFA
NEXT_PUBLIC_AUTHORIZENET_ENV=production
```

## Why Both?

1. **`.env`** - Can be committed to git for team sharing (but use placeholder values)
2. **`.env.local`** - Your actual secrets, never committed

## Next.js Priority Order

Next.js loads environment variables in this order (later files override earlier):
1. `.env`
2. `.env.local` ← **Takes precedence**
3. `.env.development` / `.env.production` (if exists)

## For Vercel Deployment

When deploying to Vercel, you need to set ALL environment variables in the Vercel dashboard:

1. Go to your Vercel project → Settings → Environment Variables
2. Add all variables (both server-side and client-side):
   - `AUTHORIZENET_API_LOGIN_ID`
   - `AUTHORIZENET_TRANSACTION_KEY`
   - `AUTHORIZENET_ENV`
   - `NEXT_PUBLIC_AUTHORIZENET_CLIENT_KEY` ← **Important!**
   - `NEXT_PUBLIC_AUTHORIZENET_API_LOGIN_ID`
   - `NEXT_PUBLIC_AUTHORIZENET_ENV`

## Recommendation

**For local development:**
- Use `.env.local` for all your actual credentials
- `.env` can have placeholder/example values

**For production (Vercel):**
- Set all variables in Vercel dashboard
- Don't rely on `.env` or `.env.local` files in production

## Current Status

✅ You have `.env.local` set up correctly
✅ Your Client Key is in `.env.local`
✅ `.env.local` is in `.gitignore` (won't be committed)

You're all set! Just make sure when you deploy to Vercel, you add all the environment variables to the Vercel dashboard.

