const TelegramBot = require('node-telegram-bot-api');
const { WebhookClient } = require('discord.js');
const nodemailer = require('nodemailer');
const notifier = require('node-notifier');

class Notifier {
  constructor(alertConfig) {
    this.alertConfig = alertConfig;
    this.telegramBot = process.env.TELEGRAM_BOT_TOKEN
      ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false })
      : null;

    this.discord = process.env.DISCORD_WEBHOOK_URL
      ? new WebhookClient({ url: process.env.DISCORD_WEBHOOK_URL })
      : null;

    this.mailer = process.env.EMAIL_SMTP_HOST
      ? nodemailer.createTransport({
        host: process.env.EMAIL_SMTP_HOST,
        port: Number(process.env.EMAIL_SMTP_PORT || 587),
        secure: false,
        auth: process.env.EMAIL_SMTP_USER
          ? { user: process.env.EMAIL_SMTP_USER, pass: process.env.EMAIL_SMTP_PASS }
          : undefined
      })
      : null;
  }

  async notify(title, message) {
    const tasks = [];

    if (this.alertConfig.desktop) {
      notifier.notify({ title, message });
    }

    if (this.alertConfig.telegram && this.telegramBot && process.env.TELEGRAM_CHAT_ID) {
      tasks.push(this.telegramBot.sendMessage(process.env.TELEGRAM_CHAT_ID, `*${title}*\n${message}`, { parse_mode: 'Markdown' }));
    }

    if (this.alertConfig.discord && this.discord) {
      tasks.push(this.discord.send({ content: `**${title}**\n${message}` }));
    }

    if (this.alertConfig.email && this.mailer && process.env.EMAIL_TO) {
      tasks.push(this.mailer.sendMail({ from: process.env.EMAIL_FROM, to: process.env.EMAIL_TO, subject: title, text: message }));
    }

    await Promise.allSettled(tasks);
  }
}

module.exports = Notifier;
