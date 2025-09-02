const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting Puppeteer...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set viewport to desktop size
  await page.setViewport({ width: 1920, height: 1080 });
  
  console.log('Navigating to homepage...');
  // Navigate to the local dev server
  await page.goto('http://localhost:3000', { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  // Wait a bit for images to load
  await page.waitForTimeout(2000);
  
  // Take screenshot of home page
  console.log('Taking homepage screenshot...');
  await page.screenshot({ 
    path: 'screenshots/home-full.png', 
    fullPage: true 
  });
  
  console.log('Screenshot saved to screenshots/home-full.png');
  
  // Also take a viewport-only screenshot
  await page.screenshot({ 
    path: 'screenshots/home-viewport.png' 
  });
  
  console.log('Viewport screenshot saved!');
  
  await browser.close();
  console.log('Done!');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});