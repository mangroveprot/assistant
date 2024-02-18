const config = global.utils.config;
const getTime = global.utils.getTime;
const {
  hasPrefix,
  prefix
} = config.assistant;
module.exports = {
  config: {
    name: "welcome",
    version: "1.0",
    author: "ViLLAVER",
    category: "events"
  },

  onStart: async function ( {
    message,
    event,
    api
  }) {
    if (event.logMessageType == "log:subscribe") {
      const {
        threadID
      } = event;
      const myPrefix = hasPrefix ? prefix: "No Prefix";
      const nickNameBot = config.assistant.botNickName;
      const dataAddedParticipants = event.logMessageData.addedParticipants;
      const threadName = (await api.getThreadInfo(event.threadID)).threadName;
      if (dataAddedParticipants.some(item => item.userFbId != api.getCurrentUserID())) {
        let names = [];
        const threadName = (await api.getThreadInfo(event.threadID)).threadName;
        dataAddedParticipants.forEach(participant => {
          api.getUserInfo(participant.userFbId).then(user => {
            names.push(user[participant.userFbId].name);
            if (names.length === dataAddedParticipants.length) {
              if (names.length > 1) {
                const output = [
                  `「 WELCOME YOU GUYS TO THE ${threadName || "GROUP"} 」`,
                  `${names[0]}`
                ];
                message.send(output);
              } else {
                const output = [
                  `「 WELCOME TO THE ${threadName || "GROUP"} 」`,
                  `${names[0]}`
                ];
                message.send(output);
              }
            }
          });
        });
      } else {
        if (nickNameBot) {
          api.changeNickname(nickNameBot, threadID, api.getCurrentUserID())
          .catch(error => console.error("Error changing nickname:", error));
        }
        const pfx = hasPrefix ? prefix: "";
        const output = [
          '┌────[🪶]────⦿',
          `│ Thank you for adding me in ${
          threadName || "this group"
          }☺️`,
          `│✨ My Prefix: $ {
          prefix
          }`,
          `│ ⸦•⸧ Type "${pfx}help" to show all my available commands.`,
          '└────────⦿'
        ];
        message.send(output.join("\n"));
      }
    }
  }
};