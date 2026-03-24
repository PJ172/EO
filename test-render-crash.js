const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Track out errors
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('BROWSER CONSOLE ERROR:', msg.text());
        }
    });

    page.on('pageerror', error => {
        console.log('BROWSER PAGE ERROR:', error.message);
    });

    console.log("Navigating to login...");
    await page.goto('http://localhost:3000/login');

    // Login
    await page.waitForSelector('input[id="username"]', { timeout: 60000 });
    await page.type('input[id="username"]', 'it');
    await page.type('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    await page.waitForNavigation();
    console.log("Navigated to:", page.url());

    // Go to employees page
    await page.goto('http://localhost:3000/employees');
    console.log("Waiting for data load...");

    // Wait a few seconds for API and rendering to finish
    await new Promise(r => setTimeout(r, 5000));

    console.log("Done checking.");
    await browser.close();
})();
