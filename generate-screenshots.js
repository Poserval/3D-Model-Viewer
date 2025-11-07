const puppeteer = require('puppeteer');
const sharp = require('sharp');

async function generateScreenshots() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Мобильный скриншот
    await page.setViewport({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');
    await page.screenshot({ path: 'src/icons/screenshot-mobile.png' });
    
    // Планшетный скриншот  
    await page.setViewport({ width: 768, height: 1024 });
    await page.screenshot({ path: 'src/icons/screenshot-tablet.png' });
    
    await browser.close();
    
    console.log('Screenshots generated!');
}

generateScreenshots().catch(console.error);
