// mentionService.js
const knowledgeSearchService = require("./knowledgeSearchService");
const texts = require("../config/texts");


async function handleMentionedMessage(bot, msg, text) {
  const { message_thread_id, chat, reply_to_message } = msg;
  const chatId = chat.id;
  const mentionedMessageText = text ? text : reply_to_message.text;
  console.log(`from group chat: ${mentionedMessageText} `);
  if (mentionedMessageText) {
    let answer = await knowledgeSearchService.getAnswer(msg.from.id, mentionedMessageText);
    if (!answer) {
      answer = texts.NO_ANSWER;
    }
    console.log(`answer: ${answer}`);

    const options = { };
    if (message_thread_id) {
      options.message_thread_id = message_thread_id;
    }
    try {
      await bot.sendMessage(chatId, answer, options);
    } catch (error) {
      console.error("Error sending message with thread ID:", error.message);
      console.log("Retrying without message_thread_id");
      await bot.sendMessage(chatId, answer);
    }
  }
}

module.exports = {
  handleMentionedMessage,
};
