# HTTPS Setup for Accept.js

Accept.js requires HTTPS connections. **Important:** This only affects local development. When deployed to Vercel (or any hosting service with HTTPS), it works automatically!

## Production Deployment (Vercel)

✅ **Vercel automatically provides HTTPS** for all deployments - no configuration needed!

When you deploy to Vercel:
- Your site is automatically served over HTTPS
- Accept.js will work without any additional setup
- Just make sure your environment variables are set in Vercel dashboard:
  - `NEXT_PUBLIC_AUTHORIZENET_CLIENT_KEY`
  - `NEXT_PUBLIC_AUTHORIZENET_API_LOGIN_ID`
  - `NEXT_PUBLIC_AUTHORIZENET_ENV`
  - `AUTHORIZENET_API_LOGIN_ID`
  - `AUTHORIZENET_TRANSACTION_KEY`
  - `AUTHORIZENET_ENV`

## Local Development

The HTTPS requirement only affects local development. You have several options:

## Option 1: Using mkcert (Recommended - Easiest)

1. **Install mkcert:**
   - Windows: `choco install mkcert` or download from https://github.com/FiloSottile/mkcert/releases
   - Mac: `brew install mkcert`
   - Linux: Follow instructions at https://github.com/FiloSottile/mkcert

2. **Install the local CA:**
   ```bash
   mkcert -install
   ```

3. **Generate certificates for localhost:**
   ```bash
   mkcert localhost
   ```

4. **Rename the generated files:**
   - Rename `localhost.pem` to `localhost-cert.pem`
   - Rename `localhost-key.pem` to `localhost-key.pem`
   - Place both files in the project root directory

5. **Start the HTTPS server:**
   ```bash
   npm run dev:https
   ```

6. **Access your app:**
   - Open `https://localhost:3000` in your browser
   - Accept the security warning (it's safe for local development)

## Option 2: Using OpenSSL

1. **Generate self-signed certificates:**
   ```bash
   openssl req -x509 -newkey rsa:4096 -nodes -keyout localhost-key.pem -out localhost-cert.pem -days 365 -subj "/CN=localhost"
   ```

2. **Start the HTTPS server:**
   ```bash
   npm run dev:https
   ```

3. **Access your app:**
   - Open `https://localhost:3000` in your browser
   - Accept the security warning

## Option 3: Using ngrok (No Certificate Setup)

1. **Install ngrok:**
   - Download from https://ngrok.com/
   - Or use: `choco install ngrok` (Windows) or `brew install ngrok` (Mac)

2. **Start your regular dev server:**
   ```bash
   npm run dev
   ```

3. **In another terminal, start ngrok:**
   ```bash
   ngrok http 3000
   ```

4. **Use the HTTPS URL provided by ngrok:**
   - Copy the `https://xxxxx.ngrok.io` URL
   - Update `NEXT_PUBLIC_APP_URL` in `.env.local` to this URL
   - Access your app using the ngrok URL

## Option 4: Deploy to Production/Staging

If you have a staging environment with HTTPS, you can test there:
- Vercel automatically provides HTTPS
- Netlify automatically provides HTTPS
- Any hosting service with HTTPS will work

## Important Notes

- **Accept.js requires HTTPS** - This is a security requirement from Authorize.Net
- **Localhost HTTP will not work** - You must use HTTPS for Accept.js to function
- **Self-signed certificates are safe for local development** - Your browser will show a warning, but you can safely proceed
- **Production environments** - Always use proper SSL certificates in production

## Troubleshooting

If you see certificate errors:
1. Make sure you've accepted the certificate in your browser
2. Clear browser cache and try again
3. Make sure you're accessing via `https://` not `http://`
4. Check that the certificate files are in the project root

