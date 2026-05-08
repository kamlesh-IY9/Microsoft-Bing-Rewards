const { chromium } = require('patchright');
const path = require('path');
const fs = require('fs');

(async () => {
    const email = 'shukra3@outlook.com';
    // Use the dedicated session folder
    const userDataDir = path.join(__dirname, '../sessions', email);

    if (fs.existsSync(userDataDir)) {
        fs.rmSync(userDataDir, { recursive: true, force: true });
    }

    console.log(`Opening Playwright Chromium (NOT Edge) for manual login: ${email}`);
    
    // Launching WITHOUT channel: 'msedge' to use the clean bundled browser
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        viewport: { width: 1366, height: 768 },
        args: [
            '--no-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const page = await context.newPage();
    await page.goto('https://login.live.com');

    console.log('---------------------------------------------------------');
    console.log('THIS IS A PURE PLAYWRIGHT BROWSER (NO EDGE PROFILES).');
    console.log('1. Log in manually to shukra3@outlook.com');
    console.log('2. Once logged in, CLOSE this browser window.');
    console.log('3. I will then run the bot using this session.');
    console.log('---------------------------------------------------------');
})();
