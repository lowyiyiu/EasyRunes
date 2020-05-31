const WebSocket = require("ws");
const request = require("request");

let freezer = require("./state");

let websocket = null;
let connection_data = null;
let methods = {};

function bind(data) {
  connection_data = data;
  websocket = new WebSocket(`wss://${data.username}:${data.password}@${data.address}:${data.port}/`, "wamp", {
    rejectUnauthorized: false,
  });

  websocket.on("error", (err) => {
    console.log(err);
    if (err.message.includes("ECONNREFUSED")) {
      destroy();
      setTimeout(function () {
        bind(data);
      }, 1000);
    }
  });

  websocket.on("message", (msg) => {
    let res;
    try {
      res = JSON.parse(msg);
    } catch (e) {
      console.log(e);
    }
    if (res[0] === 0) {
      freezer.emit(`api:connected`);
    }
    if (res[1] == "OnJsonApiEvent") {
      let evt = res[2];
      freezer.emit(`${evt.uri}:${evt.eventType}`, evt.data);
    }
  });

  websocket.on("open", () => {
    websocket.send('[5, "OnJsonApiEvent"]');
  });
}

function destroy() {
  websocket.removeEventListener();
  websocket = null;
}

["post", "put", "get", "del"].forEach(function (method) {
  methods[method] = function (endpoint, body) {
    return new Promise((resolve) => {
      let options = {
        url: `${connection_data.protocol}://${connection_data.address}:${connection_data.port}${endpoint}`,
        auth: {
          user: connection_data.username,
          pass: connection_data.password,
        },
        headers: {
          Accept: "application/json",
        },
        json: true,
        body: body,
        rejectUnauthorized: false,
      };

      request[method](options, (error, response, data) => {
        if (error || response.statusCode != 200) {
          resolve();
          return;
        }

        resolve(data);
      });
    });
  };
});

module.exports = Object.assign({ bind, destroy }, methods);
