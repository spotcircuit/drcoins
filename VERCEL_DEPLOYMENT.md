# Vercel Deployment Guide

## Prerequisites
- Vercel account
- All environment variables from `.env.example`

## Step 1: Create Vercel Blob Storage

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Navigate to **Storage** tab
3. Click **Create Database** → Select **Blob**
4. Name it (e.g., "drcoins-blob")
5. Click **Create**

## Step 2: Get Blob Token

1. In the Blob storage dashboard, click on your blob store
2. Go to the **`.env.production`** tab
3. Copy the `BLOB_READ_WRITE_TOKEN` value

## Step 3: Set Environment Variables

Add all these variables in your Vercel project settings (Project → Settings → Environment Variables):

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# App URLs
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Admin
ADMIN_PASSWORD=your-secure-password

# Email (Resend)
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@yourdomain.com

# Vercel Blob (from Step 2)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

## Step 4: Deploy

```bash
git add .
git commit -m "Add Vercel Blob storage support"
git push origin main
```

Vercel will auto-deploy from your connected git repository.

## Step 5: Initialize Blob Storage (First Time Only)

After deployment, you need to initialize the blob storage with default rates:

1. Go to your admin panel: `https://yourdomain.com/admin`
2. Login with your admin password
3. Go to the **Rates** tab
4. The system will automatically create the blob with default settings

Alternatively, use the Vercel Blob API or dashboard to manually upload an initial `pricing-rates.json`:

```json
{
  "globalRate": 87,
  "customerRates": {},
  "history": []
}
```

## How It Works

### Local Development
- Uses file system (`data/pricing-rates.json`)
- No blob storage needed
- Works exactly as before

### Production (Vercel)
- Automatically detects Vercel environment
- Uses Vercel Blob storage instead of file system
- Blob storage is persistent across deployments
- All admin rate changes are saved to blob

## Troubleshooting

### "Failed to save pricing rates to blob"
- Ensure `BLOB_READ_WRITE_TOKEN` is set in Vercel environment variables
- Check that the blob store exists and is connected to your project

### Rates not persisting
- Verify blob token has write permissions
- Check Vercel deployment logs for errors

### "Blob fetch failed: 404"
- Blob file doesn't exist yet
- Go to admin panel and make any rate change to initialize it
- Or manually create the blob file

## Migration Notes

If you have existing customer rates in `data/pricing-rates.json`:

1. The file will continue to work locally
2. For production, you need to:
   - Copy the contents of `data/pricing-rates.json`
   - Upload it as a blob named `pricing-rates.json` to Vercel Blob
   - Or set rates again through the admin panel

## Cost

Vercel Blob pricing (as of 2024):
- **Hobby plan**: 500MB free
- **Pro plan**: 100GB included
- Your `pricing-rates.json` is typically < 100KB, so well within free tier
