const {
  removeHomeDir,
  log
} = global.utils;

module.exports = {
  config: {
    name: "eval",
    version: "1.5",
    author: "NTKhang",
    cooldown: 5,
    role: 2,
    category: "owner",
  },

  onStart: async function ({
    api, args, message, event
  }) {
    function output(msg) {
      if (typeof msg === "number" || typeof msg === "boolean" || typeof msg === "function")
        msg = msg.toString();
      else if (msg instanceof Map) {
        let text = `Map(${msg.size}) `;
        text += JSON.stringify(mapToObj(msg), null, 2);
        msg = text;
      } else if (typeof msg === "object")
        msg = JSON.stringify(msg, null, 2);
      else if (typeof msg === "undefined")
        msg = "undefined";

      message.reply(msg);
    }

    function mapToObj(map) {
      const obj = {};
      map.forEach(function (v, k) {
        obj[k] = v;
      });
      return obj;
    }

    const cmd = `
  (async () => {
    try {
      ${args.join(" ")}
    } catch (err) {
      log.err("eval command", err);
      message.send(
        "err\n" +
        (err.stack ?
          removeHomeDir(err.stack) :
          removeHomeDir(JSON.stringify(err, null, 2) || "")
        )
      );
    }
  })()`;
    eval(cmd);
  }
};