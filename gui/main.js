const { app, BrowserWindow, ipcMain, Tray, Menu, Notification } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let tray = null;
let botProcess = null;

const HISTORY_FILE = path.join(__dirname, '../history.json');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        title: 'Microsoft Rewards Auto',
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        autoHideMenuBar: true
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.on('close', function (event) {
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
        }
        return false;
    });
}

function createTray() {
    // Note: requires a real icon file to not crash, fallback to a native icon if unavailable
    tray = new Tray(path.join(__dirname, 'icon.png')); // We will need to create a dummy icon
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show Dashboard', click: () => mainWindow.show() },
        { label: 'Run Now', click: () => startBot() },
        { type: 'separator' },
        { label: 'Quit', click: () => {
            app.isQuiting = true;
            app.quit();
        }}
    ]);
    
    tray.setToolTip('Microsoft Rewards Auto');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
        mainWindow.show();
    });
}

function startBot() {
    if (botProcess) {
        if (mainWindow) mainWindow.webContents.send('bot-log', '[SYSTEM] Bot is already running.');
        return;
    }

    if (mainWindow) mainWindow.webContents.send('bot-started');

    // Run the npm script
    botProcess = spawn('npm', ['run', 'start'], {
        cwd: path.join(__dirname, '../'),
        shell: true
    });

    let currentAccount = null;
    let earnedPoints = { 'jke360@outlook.com': 0, 'shukra3@outlook.com': 0 };

    botProcess.stdout.on('data', (data) => {
        const log = data.toString().trim();
        if (!log) return;
        
        if (mainWindow) mainWindow.webContents.send('bot-log', log);

        // Parse log to update UI state
        if (log.includes('Starting account: jke360@outlook.com')) {
            currentAccount = 'jke360@outlook.com';
            if (mainWindow) mainWindow.webContents.send('update-status', { email: currentAccount, status: 'running' });
        } else if (log.includes('Starting account: shukra3@outlook.com')) {
            if (currentAccount && mainWindow) mainWindow.webContents.send('update-status', { email: currentAccount, status: 'done' });
            currentAccount = 'shukra3@outlook.com';
            if (mainWindow) mainWindow.webContents.send('update-status', { email: currentAccount, status: 'running' });
        }

        // Extract gained points from RUN-END log
        const runEndMatch = log.match(/Total points collected: \+(\d+)/);
        if (runEndMatch && currentAccount) {
            earnedPoints[currentAccount] = parseInt(runEndMatch[1], 10);
            if (mainWindow) mainWindow.webContents.send('update-status', { email: currentAccount, points: earnedPoints[currentAccount] });
        }
        
        // Match specific read-to-earn/app points updates if possible
        const incrementalMatch = log.match(/gainedPoints=(\d+)/);
        if(incrementalMatch && currentAccount) {
             // In a real robust app, we'd track cumulative. We'll just show something is happening.
        }
    });

    botProcess.stderr.on('data', (data) => {
        const log = data.toString().trim();
        if (log && mainWindow) mainWindow.webContents.send('bot-log', `[STDERR] ${log}`);
    });

    botProcess.on('close', (code) => {
        if (currentAccount && mainWindow) {
             mainWindow.webContents.send('update-status', { email: currentAccount, status: 'done' });
        }
        
        if (mainWindow) {
            mainWindow.webContents.send('bot-log', `[SYSTEM] Bot process exited with code ${code}`);
            mainWindow.webContents.send('bot-stopped');
        }
        
        botProcess = null;
        
        // Show Notification
        saveHistory(earnedPoints);
        showNotification(earnedPoints);
    });
}

function saveHistory(points) {
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
        try { history = JSON.parse(fs.readFileSync(HISTORY_FILE)); } catch (e) {}
    }
    
    const dateStr = new Date().toISOString().split('T')[0];
    
    // Check if entry exists for today
    const existingIdx = history.findIndex(h => h.date === dateStr);
    const newEntry = {
        date: dateStr,
        acc1: points['jke360@outlook.com'] || 0,
        acc2: points['shukra3@outlook.com'] || 0
    };

    if (existingIdx >= 0) {
        history[existingIdx].acc1 += newEntry.acc1;
        history[existingIdx].acc2 += newEntry.acc2;
    } else {
        history.push(newEntry);
    }

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    if (mainWindow) mainWindow.webContents.send('history-data', history);
}

function showNotification(points) {
    const p1 = points['jke360@outlook.com'] || 0;
    const p2 = points['shukra3@outlook.com'] || 0;
    
    if (Notification.isSupported()) {
        new Notification({
            title: 'Microsoft Rewards Auto Complete',
            body: `Account 1: +${p1} pts\nAccount 2: +${p2} pts\nTotal: +${p1+p2} pts`,
            icon: path.join(__dirname, 'icon.png')
        }).show();
    }
}

app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe')
});

app.whenReady().then(() => {
    // Generate dummy icon to prevent crash
    const iconPath = path.join(__dirname, 'icon.png');
    if (!fs.existsSync(iconPath)) {
        // Just write a 1x1 transparent png
        const emptyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
        fs.writeFileSync(iconPath, emptyPng);
    }

    createWindow();
    createTray();
    
    // Setup Scheduler
    require('./scheduler')(startBot);

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

ipcMain.on('start-bot', () => {
    startBot();
});

ipcMain.on('open-session', (event, email) => {
    if (mainWindow) mainWindow.webContents.send('bot-log', `[SYSTEM] Opening browser for: ${email}`);
    
    spawn('npm', ['run', 'open-session', '--', email], {
        cwd: path.join(__dirname, '../'),
        shell: true
    });
});

ipcMain.on('get-history', (event) => {
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
        try { history = JSON.parse(fs.readFileSync(HISTORY_FILE)); } catch (e) {}
    }
    event.reply('history-data', history);
});
