const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto('http://localhost:3000/login');
    await page.type('input[id="username"]', 'it');
    await page.type('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    await page.goto('http://localhost:3000/employees');
    await new Promise(r => setTimeout(r, 5000));

    await page.screenshot({ path: 'd:/00.APPS/eOffice/screenshot.png' });

    console.log('Screenshot saved to screenshot.png');
    await browser.close();
})();
