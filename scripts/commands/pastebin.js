const PastebinAPI = require('pastebin-ts');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "pastebin",
    version: "1.0",
    author: "Lance Ajiro",
    //I made lil changes on it, cause sometimes pastebin down!
    cooldown: 5,
    role: 2,
    description: "This command allows you to upload files to pastebin and sends the link to the file.",
    usage: "To use this command, type {pn} <filename>. The file must be located in the 'cmds' folder.",
    example: "pastebin ai.js"
  },
  onStart: async function ({
    message, args
  }) {
    try {
      /*  const isPastebinResponding = async () => {
        try {
          await new PastebinAPI().getUserInfo();
          return true;
        } catch (error) {
          return false;
        }
      };

      if (!(await isPastebinResponding())) {
        return message.reply('Pastebin is not responding.');
      }
*/
      const pastebin = new PastebinAPI({
        api_dev_key: 'bCpNLHepsR1_mtfFM4-C1uMu1lDzP2lI',
        api_user_key: 'bCpNLHepsR1_mtfFM4-C1uMu1lDzP2lI',
      });

      const fileName = args[0];

      if (!fileName) {
        return message.reply('Please provide a file name.');
      }

      const filePathWithoutExtension = path.join(__dirname, fileName);
      const filePathWithExtension = path.join(__dirname, fileName + '.js');
      if (!fs.existsSync(filePathWithoutExtension) && !fs.existsSync(filePathWithExtension)) {
        return message.reply('File not found!');
      }

      const filePath = fs.existsSync(filePathWithoutExtension) ? filePathWithoutExtension: filePathWithExtension;

      fs.readFile(filePath, 'utf8', async (err, data) => {
        if (err) throw err;

        const paste = await pastebin
        .createPaste({
          text: data,
          title: fileName,
          format: null,
          privacy: 1,
        })
        .catch((error) => {
          console.error(error);
        });

        const rawPaste = paste.replace("pastebin.com", "pastebin.com/raw");

        message.reply(`${rawPaste}`);
      });
    } catch (error) {
      message.reply(error.message || 'An error occurred.');
    }
  }
};