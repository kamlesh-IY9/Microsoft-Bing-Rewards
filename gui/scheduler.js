const schedule = require('node-schedule');
const fs = require('fs');
const path = require('path');

module.exports = function setupScheduler(startBotCallback) {
    let hours = [11];
    let minute = 0;
    let enabled = true;

    try {
        const configPath = path.join(__dirname, '../src/config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            if (config.scheduler) {
                hours = config.scheduler.hours ?? [config.scheduler.hour ?? 11];
                minute = config.scheduler.minute ?? 0;
                enabled = config.scheduler.enabled ?? true;
            }
        }
    } catch (error) {
        console.error('[SCHEDULER] Failed to load config, using defaults:', error);
    }

    if (!enabled) {
        console.log('[SCHEDULER] Scheduler is disabled in config.');
        return;
    }

    const rule = new schedule.RecurrenceRule();
    rule.hour = hours;
    rule.minute = minute;

    console.log(`[SCHEDULER] Scheduler setup for hours: ${hours.join(', ')} at minute ${minute}`);

    schedule.scheduleJob(rule, function() {
        console.log(`[SCHEDULER] Triggering scheduled bot run at ${new Date().toLocaleTimeString()}`);
        startBotCallback();
    });
};
