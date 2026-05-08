const { ipcRenderer } = require('electron');

// DOM Elements
const logViewer = document.getElementById('log-viewer');
const runBtn = document.getElementById('run-btn');

const accounts = {
    'jke360@outlook.com': { prefix: 'acc1' },
    'shukra3@outlook.com': { prefix: 'acc2' }
};

// Initialize UI
document.getElementById('acc1-email').innerText = 'jke360@outlook.com';
document.getElementById('acc2-email').innerText = 'shukra3@outlook.com';

// Update Account Status
ipcRenderer.on('update-status', (event, data) => {
    const { email, status, points } = data;
    const acc = accounts[email];
    
    if (acc) {
        if (status) {
            const statusEl = document.getElementById(`${acc.prefix}-status`);
            statusEl.innerText = status.charAt(0).toUpperCase() + status.slice(1);
            statusEl.className = `value status-badge ${status.toLowerCase()}`;
        }
        if (points !== undefined) {
            document.getElementById(`${acc.prefix}-points`).innerText = points;
        }
    }
});

// Append Logs
ipcRenderer.on('bot-log', (event, log) => {
    const line = document.createElement('div');
    line.className = 'log-line';
    
    // Simple color coding based on keywords
    if (log.includes('[ERROR]') || log.toLowerCase().includes('failed')) {
        line.classList.add('log-error');
    } else if (log.includes('[WARN]')) {
        line.classList.add('log-warn');
    } else if (log.includes('[INFO]')) {
        line.classList.add('log-info');
    } else {
        line.classList.add('log-debug');
    }

    line.innerText = log;
    logViewer.appendChild(line);
    
    // Auto-scroll
    logViewer.scrollTop = logViewer.scrollHeight;
});

// Run Button
runBtn.addEventListener('click', () => {
    runBtn.disabled = true;
    runBtn.innerText = 'Starting...';
    ipcRenderer.send('start-bot');
});

// Open Browser Buttons
document.querySelectorAll('.open-browser-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const email = btn.getAttribute('data-email');
        ipcRenderer.send('open-session', email);
    });
});

ipcRenderer.on('bot-started', () => {
    runBtn.disabled = true;
    runBtn.innerText = 'Running...';
    document.getElementById('acc1-status').innerText = 'Running';
    document.getElementById('acc1-status').className = 'value status-badge running';
    document.getElementById('acc2-status').innerText = 'Waiting';
    document.getElementById('acc2-status').className = 'value status-badge idle';
});

ipcRenderer.on('bot-stopped', () => {
    runBtn.disabled = false;
    runBtn.innerText = 'Run Now';
});

// Load History
ipcRenderer.on('history-data', (event, history) => {
    const tbody = document.getElementById('history-body');
    tbody.innerHTML = '';
    
    history.slice(-7).reverse().forEach(entry => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${entry.date}</td>
            <td class="${entry.acc1 > 0 ? 'log-highlight' : ''}">+${entry.acc1 || 0}</td>
            <td class="${entry.acc2 > 0 ? 'log-highlight' : ''}">+${entry.acc2 || 0}</td>
            <td><strong>+${(entry.acc1 || 0) + (entry.acc2 || 0)}</strong></td>
        `;
        tbody.appendChild(tr);
    });
});

// Initial request for history
ipcRenderer.send('get-history');
