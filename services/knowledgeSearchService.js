// knowledgeSearchService.js
const { SessionsClient } = require("@google-cloud/dialogflow-cx");
const queryRefinementService = require("./queryRefinementService");

const client = new SessionsClient();
async function getAnswer(bot, chatId, userId, text) {
  bot.sendChatAction(chatId, "typing");
  const refinedQuery = await queryRefinementService.refineQuery(text);
  if(!refinedQuery) {
    return null;
  }

  console.log(`refined query: ${refinedQuery}`);
  bot.sendChatAction(chatId, "typing");

  const sessionId = userId || Math.random().toString(36).substring(7);

  const sessionPath = client.projectLocationAgentSessionPath(
      process.env.GOOGLE_PROJECT_ID,
      process.env.GOOGLE_AGENT_LOCATION,
      process.env.GOOGLE_AGENT_ID,
      sessionId
  );

  const request = {
    session: sessionPath,
    queryInput: {
      text: { text: refinedQuery },
      languageCode: process.env.GOOGLE_AGENT_LANGUAGE,
    },
  };

  try {
    const [response] = await client.detectIntent(request);
    const answer = response?.queryResult?.responseMessages?.[0]?.text?.text?.[0] || null;
    
    return answer;
  } catch (error) {
    console.error('Error during Dialogflow process:', error);
    throw new Error(`Dialogflow request failed: ${error.message}`);
  }
}

module.exports = {
  getAnswer,
};
