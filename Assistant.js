const fs = require("fs");
const path = require("path");
const assistant_start = require("./0assistant/login.js");
const express = require("express");
const chalk = require("chalk");
const log = require('./logger/log.js');
const app = express();
const eventAction = require('./0assistant/handler/eventAction.js');
const appStatePath = path.join(process.cwd(), "json", "appstate.json");
const commandPath = path.join(__dirname, "scripts", "commands");
const configFilePath = path.join(process.cwd(), "json", "config.json");
const utils = require("./utils.js");
const ProgressBar = require("progress");
global.utils = utils;
const commands = {};
const commandCooldowns = new Map();
const createFuncMessage = global.utils.message;
//━━━━━━━━━━━━━━━━━━━//
process.on('unhandledRejection', error => console.log(error));
process.on('uncaughtException', error => console.log(error));

//━━━━━━━━━━━━━━━━━━━COmmandLoader━━━━━━━━━
async function loadCommands() {
  const commandFiles = fs.readdirSync(commandPath).filter((file) => file.endsWith(".js"));
  const totalCommands = commandFiles.length;
  const bar = new ProgressBar(chalk.hex('#ffd700')(":bar") + " :percent :etas", {
    total: commandFiles.length,
    width: 40,
    complete: "█",
    incomplete: " ",
    renderThrottle: 1,
  });

  const commandErrors = [];
  const loadedCommands = [];

  for (let i = 0; i < totalCommands; i++) {
    const file = commandFiles[i];
    const startTime = new Date();
    const commandName = path.basename(file, ".js");

    try {
      commands[commandName] = require(path.join(commandPath, file));
      loadedCommands.push(file);
    } catch (error) {
      commandErrors.push({
        fileName: file, error
      });
    }
    bar.tick();
  }

  if (bar.complete) {
    console.log(chalk.green(`\nCommands  Loaded: ${totalCommands - commandErrors.length}`));

    if (commandErrors.length > 0) {
      console.log(chalk.red(`WARN: ${commandErrors.length} file${commandErrors.length === 1 ? '': 's'} could not be integrated:`));

      for (const {
        fileName, error
      } of commandErrors) {
        console.log(chalk.red(`Error detected in file: ${fileName}`));
        console.log(chalk.red(`Reason: ${error}`));
        if (error.stack) {
          const stackLines = error.stack.split('\n');
          const lineNumber = stackLines[1].match(/:(\d+):\d+\)$/)[1];
          console.log(chalk.red(`Line: ${lineNumber}`));
        }
        console.log(chalk.red(`━━━━━━━━━━━━━━━━━━━`));
      }
      console.log();
    }

    console.log(`[ ${loadedCommands.join(', ')} ]`);
  }
}

//━━━━━━━━━━━━━━━━━━━Main━━━━━━━━━━━━━━━━━━
function assistantStart() {
  loadCommands();
  try {
    const fileContent = fs.readFileSync(configFilePath, "utf8");
    const config = JSON.parse(fileContent);

    if (!config || !config.settings) {
      throw new Error(`Can't find config.json at ${configFilePath}.`);
    }

    const {
      listenEvents,
      selfListen,
      autoMarkRead,
      autoMarkDelivery,
      forceLogin
    } = config.settings;

    const {
      hasPrefix,
      prefix,
      autoRestartTime
    } = config.assistant;
    const {
      adminsBot
    } = global.utils;
    assistant_start((err, api) => {
      if (err) {
        log.error(`${err}`);
        return;
      }
      const id = api.getCurrentUserID();

      api.getUserInfo(id, async (err, ret) => {
        if (err) {
          console.error(err);
          return;
        }

        const accountName = ret[id].name;
        let botPrefix = hasPrefix ? prefix: "No Prefix";
        let admins = [];

        const AdminsBot = global.utils.adminsBot;

        for (const adminId of AdminsBot) {
          try {
            const adminInfo = await getUserInfoAsync(adminId);
            admins.push(adminInfo.name);
          } catch (error) {
            console.error(error);
          }
        }

        log.info("LOG-IN AS", `${accountName}`);
        log.info("PREFIX", `${botPrefix}`);
        log.info("Admins", `${admins}`);
        console.log(global.utils.line);
      });

      function getUserInfoAsync(id) {
        return new Promise((resolve, reject) => {
          api.getUserInfo(id, (err, ret) => {
            if (err) {
              reject(err);
            } else {
              resolve(ret[id]);
            }
          });
        });
      }


      api.setOptions({
        listenEvents: listenEvents,
        selfListen: selfListen,
        autoMarkRead: autoMarkRead,
        autoMarkDelivery: autoMarkDelivery,
        forceLogin: forceLogin
      });
      //━━━━━━AUTO RESTART━━━━━━━━━━//
      if (config.assistant) {
        const time = autoRestartTime;

        if (!isNaN(time) && time > 0) {
          const formattedTime = utils.convertTime(time, true);
          console.log("AUTO RESTART", `Scheduled in: ${formattedTime}`);

          setTimeout(() => {
            console.log("AUTO RESTART", "Restarting...");
            process.exit(2);
          }, time);
        } else if (typeof time === "string" && time.match(/^((((\d+,)+\d+|(\d+(\/|-|#)\d+)|\d+L?|\*(\/\d+)?|L(-\d+)?|\?|[A-Z]{3}(-[A-Z]{3})?) ?){5,7})$/gmi)) {
          console.log("AUTO RESTART", `Scheduled with cron expression: ${time}`);

          const cron = require("node-cron");
          cron.schedule(time, () => {
            console.log("AUTO RESTART", "Restarting...");
            process.exit(2);
          });
        }
      }

      //━━━━━━Event Listener━━━━━━━━━━//
      api.listenMqtt(async (err, event) => {
        try {
          if (err) {
            throw new Error("Error in MQTT listener:", err, api);
          }
          const message = createFuncMessage(api, event);
          // Event Actions
          eventAction.handleEvent(adminsBot, api, event);

          // Get Command And Args Start
          let command,
          args,
          commandName;

          const {
            senderID,
            messageID,
            threadID,
            body
          } = event;

          if (event.type === "message" || event.type === "message_reply") {
            if (hasPrefix && event.body && event.body.toLowerCase().startsWith(prefix)) {
              //HAS PREFIX
              [command,
                ...args] = event.body.slice(prefix.length).trim().split(/\s+/);
              const cmds = command.toLowerCase();
              commandName = Object.keys(commands).find(name => commands[name].config && commands[name].config.name === cmds);

              if (!commandName) {
                api.sendMessage("Invalid command", event.threadID, event.messageID);
                return;
              }
            } else if (!hasPrefix && event.body) {
              //NO PREFIX
              [command,
                ...args] = event.body.trim().split(/\s+/);
              const cmds = command.toLowerCase();
              commandName = Object.keys(commands).find(name => commands[name].config && commands[name].config.name === cmds);

              if (!commandName) {
                return;
              }
            }

            if (commandName) {
              const requiredRole = commands[commandName].config.role;

              if (![0, 1, 2].includes(requiredRole)) {
                return api.sendMessage("❗ | This command requires a valid role, not type of string or object. Use 0 for everyone, 1 for box and bot admin, and 2 for bot admin.", event.threadID, event.messageID);
              }

              // Role-based execution
              switch (requiredRole) {
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
                  const cooldownTimeErr = "Cooldown must be integers not type of string or object.";
                  api.sendMessage(cooldownTimeErr, event.threadID, event.messageID);
                  log.error(cooldownTimeErr);
                  return;
                }
                if (!cooldownTime) {
                  api.sendMessage("Config on this command must include a valid cooldown.", event.threadID, event.messageID);
                  return;
                }

                const userCooldownKey = `${senderID}_${commandName}`;
                const userCooldown = commandCooldowns.get(userCooldownKey);

                if (userCooldown && userCooldown > Date.now()) {
                  const remainingCooldown = Math.ceil((userCooldown - Date.now()) / 1000);
                  api.sendMessage(`Command on cooldown. Remaining cooldown: ${remainingCooldown} seconds.`, event.threadID, event.messageID);
                  return;
                }

                // Set cooldown for the user
                commandCooldowns.set(userCooldownKey, Date.now() + cooldownTime * 1000);


                api.sendTypingIndicator(event.threadID);
                try {
                  if (commands[commandName].onStart) {
                    api.getUserInfo(senderID, (err, ret) => {
                      if (err) {
                        console.error(err);
                        return;
                      }
                      const senderName = ret[senderID].name;
                      log.info("CALL-COMMAND",
                        `${commandName} | ${senderName} | ${senderID} | ${event.threadID} |\n${event.body}`);
                    });

                    await commands[commandName].onStart({
                      api,
                      event,
                      args,
                      message
                    });

                  } else {
                    const errorMessage = "Command does not have onStart method.";
                    api.sendMessage(errorMessage, event.threadID, event.messageID);
                    console.error(errorMessage);
                  }
                } catch (error) {
                  const errorMessage = `Error executing onStart: ${error.message}`;
                  api.sendMessage(errorMessage, event.threadID, event.messageID);
                  log.error(error);
                }
              }

            }
          } catch (error) {
            log.error(error);
          }
        }); // mqtt
      }); // login
    } catch (error) {
      log.error(error);
    }
  }

  module.exports = {
    assistantStart: assistantStart
  };