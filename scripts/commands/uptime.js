const startTime = new Date();

module.exports = {
  config: {
    name: 'uptime',
    description: 'uptime',
    author: 'ViLLAVER'
  },
  onStart: async function ({
    api, event
  }) {
    try {
      const currentTime = new Date();
      const uptimeInSeconds = (currentTime - startTime) / 1000;

      const hours = Math.floor(uptimeInSeconds / 3600);
      const minutes = Math.floor((uptimeInSeconds % 3600) / 60);
      const seconds = Math.floor(uptimeInSeconds % 60);

      const systemInfo = `
      Uptime: ${hours}h ${minutes}m ${seconds}s
      `;

      api.sendMessage(systemInfo, event.threadID, event.messageID);
    } catch (error) {
      console.error('ERROR_UPTIME', error);
      api.sendMessage('ERROR_UPTIME', event.threadID, event.messageID);
    }
  },
};