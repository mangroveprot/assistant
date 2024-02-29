const fs = require('fs').promises;
const path = require('path');

module.exports = {
  config: {
    name: "cmd",
    description: "Creates a new command file with the provided code.",
    usage: "install <command_name> <code>",
    version: "1.0.0",
    author: "Your Name",
    role: 2,
    // Set the required role level if necessary
    cooldown: 5,
    example: "install mycommand const myCommand = () => { console.log('My command executed'); }"
  },
  onStart: async function ({
    event, api, args, message
  }) {
    try {
      const [commandName,
        ...code] = args;
      const codeContent = code.join(' ');

      if (!commandName || !codeContent) {
        return message.reply("Please provide a command name and code to install.");
      }

      const cmdFolderPath = path.join(__dirname);

      await fs.mkdir(cmdFolderPath, {
        recursive: true
      });

      const filePath = path.join(cmdFolderPath, `${commandName}.js`);

      await fs.writeFile(filePath, codeContent);

      return message.reply(`Command "${commandName}" installed successfully.`);
    } catch (error) {
      console.error(error);
      return message.reply(`Error while installing command: ${error.message}`);
    }
  }
};