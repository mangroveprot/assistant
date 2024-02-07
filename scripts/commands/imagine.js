const axios = require("axios");
const {
  getStreamFromURL,
  getName
} = global.utils;

module.exports = {
  config: {
    name: "imagine",
    version: "1.0",
    author: "ViLLAVER",
    cooldown: 5,
    role: 0,
    category: "ai",
  },
  onStart: async function ({
    message,
    event,
    args,
    api,
  }) {

    let images = "";
    const {
      senderID
    } = event;
    const prompt = args.join(" ");
    const name = await getName(api, senderID);
    if (!prompt) {
      const responses = [
        "Please add your prompt, and I'll transform your ideas into AI-generated imagery.",
        "Feel free to add your prompt, and I'll generate a unique and memorable creation for you",
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      return message.reply(`${randomResponse}`);
    }
    const waitingQue = await message.reply("🎨 | Creating your imagination...");

    try {
      const response = await axios.get(
        `https://rlrvn7-5000.csb.app/api/imagine?prompt=${prompt}`
      );
      const result = response.data;
      let content = result.result;
      let attachment = [];
      if (response.status === 400) {
        return message.reply(`Error: ${response.data.error}`);
      }
      if (result.images && result.images.length > 0) {
        for (let url of result.images) {
          try {
            const stream = await getStreamFromURL(url);
            if (stream) {
              attachment.push(stream);
            }
          } catch (error) {
            console.error(`error: ${url}`);
          }
        }
      }

      await message.reply({
        body: "✅ | Here's the generated images from your prompt.",
        attachment: attachment
      });

    } catch (error) {
      console.error("Error:", error.message);
      api.sendMessage(`Please Try Again With Different Prompt`, event.threadID, event.messageID);
    }
  }
};