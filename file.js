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
const eventPath = path.join(__dirname, "scripts", "events");
const configFilePath = path.join(process.cwd(), "json", "config.json");
const utils = require("./utils.js");
const ProgressBar = require("progress");
global.utils = utils;
const commandCooldowns = new Map();
const createFuncMessage = global.utils.message;
const AdminsBot = global.utils.adminsBot;

process.on('unhandledRejection', error => console.log(error));
process.on('uncaughtException', error => console.log(error));

const commands = {};
const commandErrors = [];
const loadedCommands = [];
const eventHandlers = [];
const eventErrors = [];

async function loadCommands() {
  try {
    const commandFiles = fs.readdirSync(commandPath).filter((file) => file.endsWith(".js"));
    const eventFiles = (await fs.promises.readdir(eventPath)).filter((file) => path.extname(file) === ".js");
    const totalCommands = commandFiles.length;
    const bar = new ProgressBar(chalk.hex('#ffd700')(":bar") + " :percent :etas", {
      total: commandFiles.length + eventFiles.length,
      width: 40,
      complete: "█",
      incomplete: " ",
      renderThrottle: 1,
    });

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

    for (const file of eventFiles) {
      try {
        const eventHandler = require(path.join(eventPath, file));
        eventHandlers.push(eventHandler);
        loadedEvents.push({
          fileName: file
        }); // Added to keep track of loaded events
      } catch (error) {
        eventErrors.push({
          fileName: file, error
        });
      }

      bar.tick();
    }

    if (bar.complete) {
      console.log(chalk.green(`\nCommands Loaded: ${totalCommands - commandErrors.length}`));

      if (loadedEvents.length > 0) {
        console.log(chalk.green(`Events Loaded: ${loadedEvents.length}`));
        console.log(`[ ${loadedEvents.map(event => event.fileName).join(', ')} ]`);
      }

      if (commandErrors.length > 0) {
        console.log(chalk.red(`\nWARN: ${commandErrors.length} command file${commandErrors.length === 1 ? '': 's'} could not be integrated:`));

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

      if (eventErrors.length > 0) {
        console.log(chalk.red(`\nWARN: ${eventErrors.length} event file${eventErrors.length === 1 ? '': 's'} could not be integrated:`));

        for (const {
          fileName, error
        } of eventErrors) {
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
    }
  } catch (error) {
    console.error(error);
  }
}

function assistantStart() {
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
    } = global.utils
    loadCommands();
    // Rest of the code remains unchanged
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  assistantStart: assistantStart
};