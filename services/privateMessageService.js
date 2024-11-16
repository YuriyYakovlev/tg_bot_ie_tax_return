// privateMessageService.js
const knowledgeSearchService = require("./knowledgeSearchService");
const texts = require("../config/texts");


async function handlePrivateMessage(bot, msg) {
  const { from, text } = msg;
  const userId = from.id;

  console.log(`from private chat: ${text} `);
  const { chat } = msg;
  const chatId = chat.id;
  
  if(text && text !== "/start") {
    bot.sendChatAction(chatId, "typing");
    let answer = await knowledgeSearchService.getAnswer(userId, text);
    if (!answer) {
      answer = texts.NO_ANSWER;
    }
    console.log(`answer: ${answer}`);
    await bot.sendMessage(chatId, answer);
  }
}

module.exports = { handlePrivateMessage };
