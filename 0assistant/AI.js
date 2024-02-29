const axios = require("axios");
const path = require("path");
const utils = require(path.join(process.cwd(), 'utils.js'));
const {
  Hercai
} = require('hercai');
const herc = new Hercai();
const {
  getName,
  API,
  log
} = utils;

async function decrementReq(name, senderID) {
  try {
    const response = await axios.get(`${API}/api/get?id=${senderID}&name=${name}`);
    const res = response.data.result;
    return res;
  } catch (error) {
    log.error("AI", error);
    return;
  }
}

async function check(name, senderID, message) {
  const req = await decrementReq(name, senderID);
  if (!req) {
    return;
  }
  return message.reply(req);
}

async function AI(prompts, api, event, message) {
  if (prompts.length < 5) {
    const responses = [
      "Hello, how can I help you?",
      "Hello, ano ang iyong katanungan?",
      "Ano ang maitutulong ko?",
      "What is your question?",
      "Hello! I'm an AI and always ready to chat. How can I assist you today?"
    ];

    const randomResponse =
    responses[Math.floor(Math.random() * responses.length)];
    return message.reply(randomResponse);
  }

  const userID = event.senderID;
  const name = await getName(api, userID);
  const {
    senderID
  } = event;
  try {
    await herc.betaQuestion({
      content: `${prompts}`,
      user: senderID
    })
    .then(async (response) => {
      const log = await check(name, senderID, message);
      if (!log) {
        await message.reply(response.reply);
      }
      
    });
    return;
  } catch (error) {
    log.error("HERCAI",
      error);
  }


  try {
    /* Available Models */
    /* "v3" , "v3-32k" , "turbo" , "turbo-16k" , "gemini" */
    /* Default Model; "v3" */
    await herc.question({
      model: "gemini",
      content: `${prompts}`
    })
    .then(async (response) => {
      const log = await check(name, senderID, message);
      if (!log) {
        await message.reply(response.reply);
      }
      
    });
    return;
  } catch (error) {
    log.error("GEMINI",
      error);
  }

  try {
    const response = await axios.get(`${API}/api/ai?prompt=${prompts}&uid=${userID}&name=${name}`);
    const res = response.data.result;

    await message.reply({
      body: res
    });
    
    return;
  } catch (error) {
    log.error("AI",
      error);
    return;
  }

}

module.exports = {
  AI
};