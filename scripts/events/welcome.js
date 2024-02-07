const config = global.utils.config;
module.exports = {
  config: {
    name: "welcome",
    version: "1.7",
    author: "NTKhang",
    category: "events"
  },

  onStart: async function ({
    message, event, api
  }) {
    if (event.logMessageType == "log:subscribe") {
      return async function () {
        const hours = getTime("HH");
        const {
          threadID
        } = event;
      message.send("Hi");
        const nickNameBot = config.assistant.botNickName;

        const dataAddedParticipants = event.logMessageData.addedParticipants;
        // if new member is bot
        if (dataAddedParticipants.some((item) => item.userFbId == api.getCurrentUserID())) {
          if (nickNameBot)
            await api.changeNickname(nickNameBot, threadID, api.getCurrentUserID());
          return message.send("Welcome");
        }
      }
    }
  }
};