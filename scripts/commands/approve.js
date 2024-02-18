const {
  threads,
  dbThreadsPath
} = global.utils;
const fs = require('fs');
module.exports = {
  config: {
    name: "approve",
    description: "Approve Threads.",
    usage: "{pn} or {n}",
    author: "VILLAVER",
    version: "1.0.0",
    cooldown: 5,
    role: 2
  },
  onStart: async function ({
    api, event, args, message
  }) {
    const {
      threadID
    } = event;
    if (!args[0]) {
      approve(api, event, threadID);
    } else {
      switch (args[0].toLowerCase()) {
        case "add":
        case "approve":
          if (!args[1] || !/^\d+$/.test(args[1])) return message.reply("Second argument (threadID) must be valid!");
          approve(api, event, args[1]);
          break;
        default:
          return message.reply("⚠️ Invalid Action. Please type 'help approve' for more details to use this command.");
        }
      }
    }
  };

  function saveConfig(threadsData) {
    try {
      fs.writeFileSync(dbThreadsPath, JSON.stringify(threadsData, null, 2));
    } catch (error) {
      console.error("Error saving configuration:", error);
    }
  }

  function approve(api, event, threadID) {
  const threadIDs = threadID.toString();

  if (!threads.approveThreadsID.includes(threadIDs)) {
    threads.approveThreadsID.push(threadIDs);
    saveConfig(threads);
    api.sendMessage(`Group with TID ${threadIDs} has been added to approve.`, event.threadID);
  } else {
    api.sendMessage(`Group with ID ${threadIDs} is already approved.`, event.threadID);
  }
}