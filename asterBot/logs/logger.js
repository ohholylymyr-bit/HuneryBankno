const fs = require('fs');
const path = require('path');
const pino = require('pino');

const logsDir = path.join(__dirname);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const transport = pino.transport({
  targets: [
    {
      target: 'pino-pretty',
      options: { colorize: true }
    },
    {
      target: 'pino/file',
      options: { destination: path.join(logsDir, 'bot.log'), mkdir: true }
    }
  ]
});

const logger = pino({ level: process.env.LOG_LEVEL || 'info' }, transport);

const actionJournal = [];

function logTradeAction(action) {
  actionJournal.push({ ...action, ts: new Date().toISOString() });
  logger.info({ action }, 'trade_action');
}

function summarizeActions(range = 'daily') {
  const now = Date.now();
  const windows = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000
  };

  const cutoff = now - windows[range];
  const selected = actionJournal.filter((e) => new Date(e.ts).getTime() >= cutoff);
  const executed = selected.filter((e) => e.type === 'EXECUTED').length;
  const skipped = selected.filter((e) => e.type === 'SKIPPED').length;
  const pnl = selected.reduce((acc, e) => acc + (e.pnl || 0), 0);
  return { range, count: selected.length, executed, skipped, pnl };
}

module.exports = {
  logger,
  logTradeAction,
  summarizeActions,
  actionJournal
};
