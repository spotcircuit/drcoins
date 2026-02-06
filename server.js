const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// For local development, you can use self-signed certificates
// Generate them using: openssl or mkcert
// For now, we'll provide instructions

app.prepare().then(() => {
  // Check if certificates exist
  const certPath = path.join(__dirname, 'localhost-cert.pem');
  const keyPath = path.join(__dirname, 'localhost-key.pem');

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };

    createServer(httpsOptions, async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    }).listen(port, (err) => {
      if (err) throw err;
      console.log(`> Ready on https://${hostname}:${port}`);
      console.log('> Accept.js requires HTTPS - using local certificates');
    });
  } else {
    console.error('HTTPS certificates not found!');
    console.error('Please generate certificates using one of these methods:');
    console.error('');
    console.error('Option 1: Using mkcert (recommended)');
    console.error('  1. Install mkcert: https://github.com/FiloSottile/mkcert');
    console.error('  2. Run: mkcert -install');
    console.error('  3. Run: mkcert localhost');
    console.error('  4. Rename the generated files to localhost-cert.pem and localhost-key.pem');
    console.error('');
    console.error('Option 2: Using OpenSSL');
    console.error('  openssl req -x509 -newkey rsa:4096 -nodes -keyout localhost-key.pem -out localhost-cert.pem -days 365 -subj "/CN=localhost"');
    console.error('');
    console.error('Option 3: Use ngrok for HTTPS tunneling');
    console.error('  1. Install ngrok: https://ngrok.com/');
    console.error('  2. Run: ngrok http 3000');
    console.error('  3. Use the HTTPS URL provided by ngrok');
    process.exit(1);
  }
});

