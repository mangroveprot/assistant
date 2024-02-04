const {
  adminsBot
} = global.utils;
module.exports = {
  config: {
    name: "eval",
    description: "Executes the provided JavaScript code",
    usage: ":eval <code>",
    author: "LiANE",
    cooldown: 2,
    role: 1,
  },
  onStart: async function ({
    api, event
  }) {
    const {
      threadID,
      messageID,
      senderID
    } = event;
    try {
      
      if (!adminsBot.includes(senderID)) {
        api.sendMessage("You do not have permission to use this command.", threadID, messageID);
        return;
      }

      const args = event.body.split(" ");
      const code = args.slice(1).join(" ");
      eval(code);
    } catch (error) {
      api.sendMessage(`🔥 | Oops! may iror
        Error: ${error.message}

        `, threadID, messageID);
    }
  },
};