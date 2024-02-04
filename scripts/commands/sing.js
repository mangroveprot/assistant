const axios = require("axios");
const {
  getStreamFromURL,
  getName
} = global.utils;

module.exports = {
  config: {
    name: "sing",
    version: "1.0",
    author: "VɪLLAVER",
    cooldown: 30,
    role: 0,
    description: "Download Audo From Youtube. 25mb is the limit of the audio."
  },
  onStart: async function ({
    message, event, args, api
  }) {
    const {
      senderID,
      messageID
    } = event;
    const prompt = args.join(" ");
    if (!prompt) {
      return message.reply("❗ | Kindly add a title to search! And Try Again...");
    }
    try {
      const name = getName(api, senderID);
      
      api.setMessageReaction("🎧", event.messageID, (err) => {
        if (err) console.error(err);
      },
        true);
        
        const waitingQuery = await message.reply("⏳ | Please wait while searching for your song!");

      const res = await axios.get(`https://rlrvn7-5000.csb.app/api/sing?song=${prompt}&uid=${senderID}&name=${name}`);
      const {
        music,
        title
      } = res.data;
      const attachment = await getStreamFromURL(music);

      message.reply({
        body: title, attachment: attachment
      }, async (err, info) => {
        await message.unsend((await waitingQuery).messageID);
      });
    } catch (error) {
      console.error(error);
      api.sendMessage(`${error}`, event.threadID, event.messageID);
    }
  },
};