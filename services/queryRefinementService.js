// queryRefinementService.js
const vertexAi = require("@google-cloud/vertexai");

let vertexAiClient = new vertexAi.VertexAI({
  project: process.env.GOOGLE_PROJECT_ID,
  location: process.env.GOOGLE_PROJECT_LOCATION,
});


async function refineQuery(text) {
  try {
    const request = prepareRefinementRequest(text.substring(0, 300));
    const generativeModel = vertexAiClient.preview.getGenerativeModel({
      model: process.env.GOOGLE_AI_MODEL,
      generation_config: {
        max_output_tokens: 1000,
        temperature: 0,
        top_p: 1,
      },
    });
    
    const classificationResponse = await generativeModel.generateContentStream(request);
    let response = (await classificationResponse.response).candidates[0];

    return response.content.parts[0].text;
  } catch (error) {
    console.error("Error in refineQuery:", error);
    return null;
  }
}


function prepareRefinementRequest(question) {
  return {
    contents: [{
      role: "user",
      parts: [{
        text: `
          Instructions: According to the user question below, delete unnecessary words, rephrase unclear terms, and formulate the question. 
          User's question: '${question}'
          Generate only the final question.`
      }]
    }]
  };
}

module.exports = {
  refineQuery
};

