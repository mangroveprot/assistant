const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');
const {
  config
} = global.utils;
const {
  hasPrefix,
  prefix
} = config.assistant;

module.exports = {
  config: {
    name: "help",
    description: "Shows a list of available commands.",
    usage: "help [to show the available command]\nhelp <command name> [to show the specific usage and description of that command]\nhelp all [to show all available commands]",
    version: "1.0.0",
    author: "ViLLAVER",
    role: 0,
    cooldown: 5,
    example: "help\nhelp ai \nhelp all"
  },
  onStart: async function ({
    event, api, args, message
  }) {
    try {
      const myPrefix = hasPrefix ? prefix: "";
      const cmdFolderPath = path.join(__dirname, '.');
      const commands = {};
      const cmdErrors = [];
      const loadedCmds = [];

      await loadFiles(cmdFolderPath, commands, cmdErrors, loadedCmds);

      const commandList = Object.values(commands).map(cmd => cmd.config.name);

      const cmdName = args[0].toLowerCase();

      const perPage = 10;
      const totalPages = Math.ceil(commandList.length / perPage);

      let page = parseInt(args[0]);
      if (!args[0]) {
        page = 1;
      }

      let showAll = args[0] && (args[0].toLowerCase() === "all" || args[0].toLowerCase() === `${myPrefix}all`);
      if (!isNaN(page)) {
        page = Math.max(1, Math.min(page, totalPages));

        const startIndex = (page - 1) * perPage;
        const endIndex = Math.min(startIndex + perPage, commandList.length);

        const commandsToShow = commandList.slice(startIndex, endIndex);

        const formattedDate = moment().tz('Asia/Manila').format('DD/MM/YY, hh:mm:ss A');

        const output = [
          `┌─[ Assistant @ ${formattedDate} ]`,
          '|──────────────────',
          `┌─[ Prefix : "${myPrefix || "No Prefix"}" ]`,
          '├─────────────────',
          '│ ┌─[ Assistant Commands ]',
          '│ │',
          ...commandsToShow.map(cmd => `│ ├─[ ${myPrefix}${cmd.toUpperCase()} ]`),
          '│ │',
          `│ └─[ Page ${page} ]`,
          '└─────────────────',
          '',
          `Total Commands: ${commandList.length}`,
          `Page ${page}/${totalPages}`,
          '',
          'Instructions: To see usage of a specific command, type the "help command". For example, to understand how to use the "ai" command, type "help ai"',
        ];

        return message.reply(output.join('\n'));
      } else {
        switch (cmdName.toLowerCase()) {
          case "all":
          case `${myPrefix}all`:
          case "-all":
            if (showAll) {
              const formattedDate = moment().tz('Asia/Manila').format('DD/MM/YY, hh:mm:ss A');

              const output = [
                `┌─[ Assistant @ ${formattedDate} ]`,
                '|──────────────────',
                `┌─[ Prefix => ${myPrefix || "No Prefix"} ]`,
                '├─────────────────',
                '│ ┌─[ Available Commands]',
                '│ │',
                ...commandList.map(cmd => `│ ├─[ ${myPrefix}${cmd.toUpperCase()} ]`),
                '│ │',
                '│ └─[ All Commands ]',
                '└─────────────────',
                '',
                `Total Commands: ${
                commandList.length
                }`,
                `Showing all commands`,
                '',
                'Instructions: To see usage of a specific command, type the "help command". For example, to understand how to use the "ai" command, type "help ai"',
              ];

              message.reply(output.join('\n'));
            }

          default:
            const commandName = Object.keys(commands).find(name => commands[name].config && commands[name].config.name === cmdName);
            const findCmd = commands[commandName];
            if (findCmd && findCmd.config) {
              const {
                name,
                description,
                usage,
                author,
                version,
                example
              } = findCmd.config;

              const output = [
                `┌───────[🪶]──────⦿`,
                '│',
                `├─[✅ Command Name ]`,
                `│ ❍ ${name}`,
                `├─[👤 Author ]`,
                `│ ${author || "No author"}`,
                `├─[✨ Version ]`,
                `│ ❍ ${version || "No Version"}`,
                `├─[🗒️ Description ]`,
                `│ ➢ ${description || "Unavailable"}`,
                `├─[💡 Usage ]`,
                `│ ➤  ${usage || "Unavailable"}`,
                `├─[♨️ Example Usage ]`,
                `│ ➤ ${example || "No example"}`,
                '│',
                '└───────────────⦿\n',
                '❗ NOTE:',
                '{n} is name of the command.',
                '{p} is the prefix.'
              ];
              return message.reply(output.join('\n'));
            } else {
              return message.reply("Command Not Found");
            }
        }
      }
    } catch (error) {
      console.error(error);
      message.reply(`Error while processing help command: ${error}`);
      return
    }
  }
};

async function loadFiles(filePath, container, errorContainer, loadedContainer) {
  const files = await fs.readdir(filePath);
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
  }
}