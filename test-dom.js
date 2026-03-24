const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    await page.goto('http://localhost:3000/login');
    await page.waitForSelector('input[id="username"]', { timeout: 60000 });
    await page.type('input[id="username"]', 'admin');
    await page.type('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    page.on('console', msg => {
        if (msg.text().includes('REACT STATE')) {
            console.log("BROWSER LOG:", msg.text());
        } else if (msg.text().includes('Page:') || msg.text().includes('Is Loading:') || msg.text().includes('==========')) {
            console.log("BROWSER LOG:", msg.text());
        }
    });

    page.on('pageerror', err => {
        console.log("BROWSER UNHANDLED ERROR:", err.message);
    });

    page.on('response', async (response) => {
        if (response.url().includes('/api/v1/employees') && response.request().method() === 'GET') {
            try {
                const json = await response.json();
                console.log("---- API RESPONSE INTERCEPTED ----");
                console.log("total in meta:", json.meta?.total);
                console.log("data length:", json.data?.length);
                console.log("----------------------------------");
            } catch (e) {
                console.log("Could not parse JSON response");
            }
        }
    });

    await page.waitForNavigation();
    await page.goto('http://localhost:3000/employees');

    // Wait for the total count to show "370" to ensure data is loaded
    try {
        await page.waitForFunction(() => {
            const text = document.body.innerText;
            return text.includes('Tổng số:') && text.includes('/ 370');
        }, { timeout: 15000 });
        console.log("Data loaded (detected pagination).");
    } catch (e) {
        console.log("Could not detect pagination text. Proceeding anyway.");
    }

    const debugText = await page.evaluate(() => {
        const pag = document.querySelector('.mt-auto');
        return pag ? pag.innerText : 'NO PAGINATION TEXT';
    });
    console.log("PAGINATION TEXT IN DOM:", debugText.replace(/\n/g, ' '));

    const tbodyHtml = await page.evaluate(() => {
        const tbody = document.querySelector('tbody');
        if (!tbody) return "TBODY NOT FOUND";
        return tbody.outerHTML;
    });

    console.log("--- TBODY HTML START ---");
    console.log(tbodyHtml.substring(0, 2000) + (tbodyHtml.length > 2000 ? '\n...[TRUNCATED]' : ''));
    console.log("--- TBODY HTML END ---");

    await browser.close();
})();
