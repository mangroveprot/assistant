const fs = require("fs");
const path = require("path");
const {
  getName,
  getUserInfo
} = global.utils;

function loadAdmins() {
  try {
    const configData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'json', 'config.json'), 'utf8'));
    return configData.admin || {};
  } catch (error) {
    console.error("Error loading configuration:", error);
    return {};
  }
}

function saveAdmins(admins) {
  try {
    const configData = loadAdmins();
    configData.admins = admins;
    fs.writeFileSync(path.join(__dirname, '..', '..', 'json', 'config.json'), JSON.stringify(configData, null, 2));
  } catch (error) {
    console.error("Error saving admin list:", error);
  }
}

async function addOrRemoveAdmin(api, event, userID, isAdding) {
  let configData = loadAdmins();
  const userIDString = userID.toString();
  const name = await getName(userID);
  const admins = configData.admins || [];

  if (isAdding) {
    if (!admins.includes(userIDString)) {
      admins.push(userIDString);
      saveAdmins(admins);
      const output = [
        `Name: ${name || "unknown"}`,
        `ID: ${userIDString}`,
        "✅ Successfully Added As Bot Admin"
      ];
      api.sendMessage(output, event.threadID);
    } else {
      api.sendMessage(`${name || "unknown"} with ID ${userIDString} is already in bot admins.`, event.threadID);
    }
  } else {
    const index = admins.indexOf(userIDString);
    if (index !== -1) {
      admins.splice(index, 1);
      saveAdmins(admins);
      const output = [
        `Name: ${name || "unknown"}`,
        `ID: ${userIDString}`,
        "✅ Successfully Removed As A Bot Admin"
      ];
      api.sendMessage(output, event.threadID);
    } else {
      api.sendMessage(`User with ID ${userID} is not an admin.`, event.threadID);
    }
  }
}

async function listAdmins(api, event, message) {
  const configData = loadAdmins();
  const adminBotList = configData.adminsBot || [];

  if (!adminBotList.length) {
    return message.reply("⚠️ Admins not found!");
  }

  const adminsName = [];

  await Promise.all(adminBotList.map(async adminId => {
    try {
      const adminInfo = await getUserInfo(api, adminId);
      adminsName.push(adminInfo.name);
    } catch (error) {
      console.error(error);
    }
  }));

  const output = [
    `❏ LIST OF BOT ADMINS ❏`,
    `➤ ${adminsName.join("\n➤ ")}`
  ];

  api.sendMessage(output.join('\n'), event.threadID);
}

module.exports = {
  config: {
    name: "admin",
    description: "Displays a list of admins or manages admins.",
    usage: "{p}/{n} <actions>\n Actions: add/list/remove>\nadd <uid>\nlist\nremove <uid>",
    example: "admin add 123344\nadmin list\nadmin remove 123344",
    author: "VɪLLAVER",
    role: 0,
    cooldown: 5
  },

  onStart: async ({
    api, event, args, message
  }) => {
    const prompt = args.join(" ");
    const [acts,
      userID] = prompt.trim().split(/\s+/);
    const action = acts.toLowerCase();
    const parsedUserID = parseInt(userID, 10);

    if (userID && !Number.isInteger(parsedUserID)) {
      return message.reply("⚠️ | UserID must be an integer, not a type of string or object");
    }

    const configData = loadAdmins();
    const adminsBot = configData.admins || [];
    if (action === "list") {
      await listAdmins(api, event, message
      );
      return;
    }
    if (!adminsBot.includes(event.senderID)) {
      return message.reply("⚠️ You do not have permission to use this command.");
    }
    if (action === "add") {
      if (!userID) {
        return message.reply("No UserID.");
      }
      await addOrRemoveAdmin(api, event, message, parseInt(userID, 10), true);
      return;
    } else if (action === "remove") {
      await addOrRemoveAdmin(api, message, event, parseInt(userID, 10), false);
      return;
    } else {
      return message.reply("Invalid Action please type 'help admin' to show its usage.");
    }
  },
};