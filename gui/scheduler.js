const schedule = require('node-schedule');

module.exports = function setupScheduler(startBotCallback) {
    // Run daily at 11:00 AM
    const rule = new schedule.RecurrenceRule();
    rule.hour = 11;
    rule.minute = 0;

    schedule.scheduleJob(rule, function() {
        console.log('[SCHEDULER] Triggering scheduled bot run at 11:00 AM');
        startBotCallback();
    });
};
