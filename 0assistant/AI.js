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
  const phrases = [
    "🔍 | Just a moment, I'm fetching the best answers for you.",
    "🔍 | Please hold on while I retrieve the information you're looking for.",
    "🔍 | I appreciate your patience as I gather the most relevant answers for you.",
    "✨ | Hang tight, I'm working on finding the appropriate responses.",
    "💫 | Please bear with me as I fetch the answers you need.",
    "🤖 | Almost there! I'm in the process of retrieving the requested information.",
    "✨ | Just a brief pause while I search for the most accurate responses.",
    "🔍 | I'm currently gathering the best answers for you.",
    "✨ | I'm actively fetching the information you're seeking - it won't be long!",
    "(⁠ ╹⁠▽⁠╹⁠ )| I'm on it! Just a moment while I fetch the most suitable answers for you."
  ];

  const waitQue = phrases[Math.floor(Math.random() * phrases.length)];
  const waitingMessage = await message.reply(waitQue);
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
      await message.unsend(waitingMessage.messageID);
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
      await message.unsend(waitingMessage.messageID);
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
    await message.unsend(waitingMessage.messageID);
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