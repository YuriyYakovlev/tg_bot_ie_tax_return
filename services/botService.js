// botService.js
const TelegramBot = require("node-telegram-bot-api");

const privateMessageService = require("./privateMessageService");
const mentionService = require("./mentionService");
const texts = require("../config/texts");

let bot;

// Rate limit configuration
const RATE_LIMIT_COUNT = 15;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const userRequestTimestamps = new Map(); // { userId: [timestamps] }

function startBotPolling(retryCount = 0) {
  const MAX_RETRIES = 5;

  bot = new TelegramBot(process.env.TG_TOKEN, {
    polling: {
      interval: 2000,
      autoStart: true,
      params: {
        timeout: 30,
      },
    },
  });

  bot.on("message", async (msg) => {
    try {
      const userId = msg.from.id;

      // Check rate limit for the user
      if (isRateLimited(userId)) {
        await bot.sendMessage(
          msg.chat.id,
          texts.RATE_LIMITED
        );
        return;
      }

      let text = msg.text;
      if (text && text.includes(`@${process.env.BOT_URL}`)) {
        text = text.replace(`@${process.env.BOT_URL}`, '').trim();

        await mentionService.handleMentionedMessage(bot, msg, text);
      } else if (msg.reply_to_message && msg.reply_to_message.from.username === process.env.BOT_URL) {

        await mentionService.handleMentionedMessage(bot, msg);
      } else if (msg.chat.type === "private") {

        await privateMessageService.handlePrivateMessage(bot, msg);
      } 
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });

  bot.on("polling_error", (error) => {
    if (error.code === 'EFATAL' || error.message.includes('ECONNRESET')) {
      handleRetry(retryCount, MAX_RETRIES);
    } else if (error.code === 'ETELEGRAM' && error.message.includes('502 Bad Gateway')) {
      console.error("Telegram server error, will retry polling...");
      handleRetry(retryCount, MAX_RETRIES);
    }
  });
}

// Helper function to handle rate limiting
function isRateLimited(userId) {
  const now = Date.now();
  const timestamps = userRequestTimestamps.get(userId) || [];
  const recentTimestamps = timestamps.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS);
  userRequestTimestamps.set(userId, recentTimestamps);
  if (recentTimestamps.length >= RATE_LIMIT_COUNT) {
    return true;
  }

  recentTimestamps.push(now);
  userRequestTimestamps.set(userId, recentTimestamps);

  return false;
}

function handleRetry(retryCount, maxRetries) {
  if (retryCount < maxRetries) {
    const delay = 5000 * Math.pow(2, retryCount);
    console.log(`Attempting to restart polling after ${delay} ms...`);
    bot.stopPolling()
      .then(() => {
        console.log("Polling stopped successfully.");
        setTimeout(() => startBotPolling(retryCount + 1), delay);
        console.log("Restarting polling.");
      })
      .catch(error => {
        console.error("Error stopping polling:", error);
        setTimeout(() => startBotPolling(retryCount + 1), delay);
      });
  } else {
    console.error("Max retries reached, stopping the bot");
    process.exit(1);
  }
}

// to avoid conflicts between old still running cloud run instances
setTimeout(() => {
  startBotPolling();
}, 10000);

process.on("unhandledRejection", (reason, p) => {
  console.log("Unhandled Rejection at:", p, "reason:", reason);
});

process.on("SIGINT", () => {
  if (bot) {
    bot.stopPolling().then(() => process.exit());
  }
});

process.on("SIGTERM", () => {
  if (bot) {
    bot.stopPolling().then(() => process.exit());
  }
});
