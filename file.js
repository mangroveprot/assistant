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
      prefix
    } = config.assistant;
    const {
      adminsBot
    } = global.utils;
    console.log(adminsBot);
    login({
      appState: loadAppState()
    }, (err, api) => {
      if (err) {
        log.error(`${err}`);
        return;
      }

      fs.writeFileSync(appStatePath, JSON.stringify(api.getAppState()));
      const id = api.getCurrentUserID();
      api.getUserInfo(id, (err, ret) => {
        if (err) {
          console.error(err);
          return;
        }
        const accountName = ret[id].name;
        log.info("LOG-IN AS", `${accountName}`);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      });

      api.setOptions({
        listenEvents: listenEvents,
        selfListen: selfListen,
        autoMarkRead: autoMarkRead,
        autoMarkDelivery: autoMarkDelivery,
        forceLogin: forceLogin
      });

      api.listenMqtt(async (err, event) => {
        try {
          if (err) {
            throw new Error("Error in MQTT listener:", err, api);
          }

          // Event Actions
          eventHandler.handleEvent(adminsBot, api, event);

          // Get Command And Args Start
          let command,
          args;

          if (event.type === "message" || event.type === "message_reply") {
            if (hasPrefix && event.body && event.body.toLowerCase().startsWith(prefix)) {
              [command,
                ...args] = event.body.slice(prefix.length).trim().split(" ");
              const cmds = command.toLowerCase();
              const commandName = Object.keys(commands).find(name => commands[name].config && commands[name].config.name === cmds);

              if (!commandName) {
                // If the commandName is not found, it's not a valid command
                api.sendMessage("Invalid command", event.threadID, event.messageID);
                return;
              }
            } else if (!hasPrefix && event.body) {
              // No prefix, check if it matches a known command
              [command,
                ...args] = event.body.trim().split(" ");
              const cmds = command.toLowerCase();
              const commandName = Object.keys(commands).find(name => commands[name].config && commands[name].config.name === cmds);

              if (!commandName) {
                return;
              }
            }
            if (commandName) {
              api.sendTypingIndicator(event.threadID);
              try {
                if (commands[commandName].onStart) {
                  await commands[commandName].onStart({
                    api, event, args
                  });
                  api.getUserInfo(senderID, (err, ret) => {
                    if (err) {
                      console.error(err);
                      return;
                    }
                    const senderName = ret[senderID].name;
                    log.info("CALL-COMMAND",
                      `${commandName} | ${senderName} | ${senderID} | ${threadID} |\n${input}`);
                  });

                } else {
                  const errorMessage = "Command does not have onStart method.";
                  api.sendMessage(errorMessage, event.threadID, event.messageID);
                  console.error(errorMessage);
                }
              } catch (error) {
                const errorMessage = `Error executing onStart: ${error.message}`;
                api.sendMessage(errorMessage, event.threadID, event.messageID);
                log.error(errorMessage);
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