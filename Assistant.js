const fs = require("fs").promises;
const path = require("path");
const express = require("express");
const chalk = require("chalk");
const log = require("./logger/log.js");
const assistant_start = require("./0assistant/login.js");
const eventAction = require("./0assistant/handler/eventAction.js");
const utils = require("./utils.js");
const ProgressBar = require("progress");
const ai = require('./0assistant/AI.js');

const app = express();
global.utils = utils;
const {
  line,
  message: createFuncMessage,
  autoRestart,
  isInRole1,
  isInRole2,
  adminsBot,
  getUserInfo,
  getName,
  approveThreads
} = global.utils;

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

const appStatePath = path.join(process.cwd(), "json", "appstate.json");
const commandPath = path.join(__dirname, "scripts", "commands");
const eventPath = path.join(__dirname, "scripts", "events");
const configFilePath = path.join(process.cwd(), "json", "config.json");

const commands = {}, events = {}, commandCooldowns = new Map(), loadedCommands = [], loadedEvents = [];
const commandErrors = [], eventErrors = [];

async function loadCommandsEvents() {
  try {
    const totalFiles = (await fs.readdir(commandPath)).length + (await fs.readdir(eventPath)).length;
    const bar = new ProgressBar(chalk.bold.greenBright("Loading: :bar") + " :percent :etas", {
      total: totalFiles,
      width: 10,
      complete: "█",
      incomplete: " ",
      renderThrottle: 1,
    });

    await loadFiles(commandPath, commands, commandErrors, loadedCommands, bar);
    await loadFiles(eventPath, events, eventErrors, loadedEvents, bar);
    process.stdout.write('\u001b[1A\u001b[K');
    console.log(chalk.bold.green(`\nCommands Loaded: ${loadedCommands.length}`));
    console.log(`[ ${loadedCommands.join(", ")} ]`);
    console.log(chalk.bold.green(`\nEvents Loaded: ${loadedEvents.length}`));
    console.log(`[ ${loadedEvents.join(", ")} ]`);

    [commandErrors,
      eventErrors].forEach((errorsArray, isCommandError) => {
        if (errorsArray.length > 0) {
          console.log(chalk.red(`WARN-${isCommandError ? 'EVENT': 'COMMAND'}: ${errorsArray.length} file${errorsArray.length === 1 ? '': 's'} could not be integrated:`));
          errorsArray.forEach(({
            fileName, error
          }) => {
            console.log(`Error detected in file: ${fileName}`);
            if (error instanceof SyntaxError) {
              console.log("Syntax error occurred:", error.message);
              console.log("Stack trace:", error.stack);
            } else if (error.stack) {
              const stackLines = error.stack.split("\n");
              if (stackLines.length >= 2) {
                const lineNumberMatch = stackLines[1].match(/:(\d+):\d+\)$/);
                if (lineNumberMatch && lineNumberMatch[1]) {
                  const lineNumber = lineNumberMatch[1];
                  console.log(`Reason: ${error}`);
                  console.log(chalk.red(`Line: ${lineNumber}`));
                } else {
                  console.log(`Reason: ${error}`);
                  console.log(chalk.red(`Failed to extract line number from error stack.`));
                }
              } else {
                console.log(`Reason: ${error}`);
                console.log(chalk.red(`Error stack is too short to extract line number.`));
              }
            }
          });
          console.log();
        }
      });
  } catch (error) {
    log.err(error);
  }
}

async function loadFiles(filePath, container, errorContainer, loadedContainer, bar) {
  const files = await fs.readdir(filePath);
  const delay = 100;
  for (const file of files) {
    const name = path.basename(file, ".js");
    try {
      container[name] = require(path.join(filePath, file));
      loadedContainer.push(file);
    } catch (error) {
      errorContainer.push({
        fileName: file,
        error
      });
    }
    bar.tick();
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

async function assistantStart() {
  try {
    fs.watch(configFilePath, async (eventType, filename) => {
      if (eventType === 'change') {
        console.log('Configuration file has changed. Reloading...');
        try {
          const fileContent = await fs.readFile(configFilePath, "utf8");
          const newConfig = JSON.parse(fileContent);

          hasPrefix = newConfig.assistant.hasPrefix;
          prefix = newConfig.assistant.prefix;

          console.log('Configuration reloaded successfully.');
        } catch (error) {
          console.error('Error reloading configuration:', error);
        }
      }
    });
    const fileContent = await fs.readFile(configFilePath,
      "utf8");
    const config = JSON.parse(fileContent);

    if (!config || !config.settings) {
      throw new Error(`Can't find config.json at ${configFilePath}.`);
    }

    const {
      listenEvents,
      selfListen,
      autoMarkRead,
      autoMarkDelivery,
      forceLogin,
      userAgent
    } = config.settings;
    const {
      hasPrefix,
      prefix,
    } = config.assistant;
    const {
      contacts
    } = config.admin;
    const info = [];

    contacts.forEach(contact => info.push(contact));

    await loadCommandsEvents();

    assistant_start(async (err, api) => {
      if (err) {
        reject(error);
        return;
      }

      const id = api.getCurrentUserID();
      if (!id) throw new Error('Error cant get account info, maybe your account is locked or suspended from facebook.');
      const accountName = await getName(api, id);

      const botPrefix = hasPrefix ? prefix: "No Prefix";
      const admins = await Promise.all(adminsBot.map(async adminId => {
        try {
          const adminInfo = await getUserInfo(api, adminId);
          return adminInfo.name;
        } catch (error) {
          console.error(error);
          return null;
        }
      }));

      log.info("LOG-IN AS", `${accountName}`);
      log.info("PREFIX", `${botPrefix}`);
      log.info("Admins", `[ ${admins.filter(admin => admin).join(", ")} ]`);

      try {
        const restart = autoRestart();
        log.info("AUTO-RESTART", `${restart}`)
      } catch (error) {
        log.err("AUTO-RESTART", error);
      }

      console.log(line);

      api.setOptions({
        listenEvents, selfListen, autoMarkRead, autoMarkDelivery, forceLogin, userAgent
      });

      api.listenMqtt(async (err, event) => {
        try {
          if (err) {
            throw new Error("Error in MQTT listener:", err, api);
          }
          const message = createFuncMessage(api, event);
          eventAction.handleEvent(adminsBot, api, event);
          const pfx = hasPrefix ? prefix: "";
          const {
            senderID,
            threadID,
            body
          } = event;


          if (!approveThreads.includes(threadID) && event.isGroup && !adminsBot.includes(senderID)) {
              const infoString = info.join(', ');
              message.send(`⚠️ This Group Is Not Approved. Private message the owner of this bot to approve your group.\n📤\n${infoString}`);
              return;
          }

          if (event.body && event.body.toLowerCase().startsWith("prefix")) {
            const output = [
              '┌────[🪶]────⦿',
              `│✨ My Prefix: ${botPrefix}`,
              `│ ⸦•⸧ Type "${pfx}help" to show all my available commands.`,
              '└────────⦿'
            ];
            return message.reply(output.join("\n"));
          }
          let command,
          args,
          commandName;

          for (const eventName of Object.keys(events)) {
            try {
              const eventHandler = events[eventName];
              if (eventHandler.onStart && typeof eventHandler.onStart === 'function') {
                await eventHandler.onStart({
                  message, event, api
                });
              } else {
                console.log(`No onStart function found or onStart is not a function for event handler: ${eventName}`);
              }
            } catch (error) {
              console.error(`⚠️ Events |  '${eventName}':`, error);
            }
          }
          if ((event.type === "message" || event.type === "message_reply") && body) {
            api.sendTypingIndicator(threadID);
            if (hasPrefix && event.body && event.body.toLowerCase().startsWith(prefix)) {
              //HAS PREFIX
              [command,
                ...args] = event.body.slice(prefix.length).trim().split(/\s+/);
              const cmds = command.toLowerCase();
              commandName = Object.keys(commands).find(name => commands[name].config && commands[name].config.name === cmds);

              if (!commandName) {
                api.sendMessage(`⚠️ Command not found please type "${pfx}help" to show available commands!`, event.threadID, event.messageID);
                return;
              }
            } else if (!hasPrefix && event.body) {
              //NO PREFIX
              [command,
                ...args] = event.body.trim().split(/\s+/);
              const cmds = command.toLowerCase();
              commandName = Object.keys(commands).find(name => commands[name].config && commands[name].config.name === cmds);
              const keywords = [
                "what",
                "how",
                "when",
                "where",
                "do",
                "why",
                "hey",
                "ano",
                "gumawa",
                "make",
                "give",
                "is",
                "this",
                "sa",
                "bakit",
                "paano",
                "assistant",
                "@assistant",
                "you",
                "explain",
                "eugene"
              ];
              const containsHint = keywords.some(hint => event.body.toLowerCase().includes(hint));
              if (!commandName) {
                if (containsHint) {
                  api.sendTypingIndicator(event.threadID);
                  ai.AI(event.body.toLowerCase(), api, event, message);
                }
                return;
              }
            }

            if (commandName) {
              const requiredRole = commands[commandName].config.role;
              if (![0, 1, 2].includes(requiredRole)) {
                return api.sendMessage("❗ | This command requires a valid role, not type of string or object. Use 0 for everyone, 1 for box and bot admin, and 2 for bot admin.", threadID);
              }switch (requiredRole) {
                case 0:
                  // Everyone
                  break;
                case 1:
                  //Box and Bot Admin
                  if (!(await utils.isInRole1(event, api, senderID, threadID)) && !(await utils.isInRole2(api, senderID))) {
                    return api.sendMessage("❗ | Only Box and Bot Admin To Use This Command.", event.threadID, event.messageID);
                  }
                  break;
                case 2:
                  //Bot Admin
                  if (!await utils.isInRole2(api, senderID)) {
                    return api.sendMessage("❗ | Only Bot Admin To Use This Command.", event.threadID, event.messageID);
                  }
                  break;
                default:
                  return api.sendMessage(`Command ${commandName} no valid role include in config.`, event.threadID, event.messageID);
                }

                const cooldownTime = commands[commandName].config.cooldown;
                if (!isNaN(cooldownTime) && cooldownTime < 0) {
                  api.sendMessage("Cooldown must be integers not type of string or object.", threadID);
                  log.error("Cooldown must be integers not type of string or object.");
                  return;
                }
                if (!cooldownTime) {
                  api.sendMessage("Config on this command must include a valid cooldowns.", threadID);
                  return;
                }
                const userCooldownKey = `${senderID}_${commandName}`;
                const userCooldown = commandCooldowns.get(userCooldownKey);
                if (userCooldown && userCooldown > Date.now()) {
                  const remainingCooldown = Math.ceil((userCooldown - Date.now()) / 1000);
                  api.sendMessage(`Command on cooldown. Remaining cooldown: ${remainingCooldown} seconds.`, threadID);
                  return;
                }
                commandCooldowns.set(userCooldownKey, Date.now() + cooldownTime * 1000);

                try {
                  if (commands[commandName].onStart) {
                    api.getUserInfo(senderID, (err, ret) => {
                      if (err) {
                        console.error(err);
                        return;
                      }
                      const senderName = ret[senderID].name;
                      log.info("CALL-COMMAND", `${commandName} | ${senderName} | ${senderID} | ${threadID} |\n${body}`);
                    });
                    await commands[commandName].onStart({
                      api,
                      event,
                      args,
                      message
                    });
                  } else {
                    api.sendMessage("Command does not have onStart method.", threadID);
                  }
                } catch (error) {
                  const errorDetails = error.stack.split("\n").slice(0, 3).join("\n");
                  api.sendMessage(`Error in command '${commandName}': ${errorDetails}`, threadID);
                  log.error(error);
                }
              }
            }
          } catch (error) {
            log.error(error);
          }
        });
      });
    } catch (error) {
      log.error(error);
    }
  }

  module.exports = {
    assistantStart
  };