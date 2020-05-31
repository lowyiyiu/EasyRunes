const path = require("path");
const request = require("request");
const { ipcRenderer } = require("electron");

let freezer = require("./state");

const api = require("./api");
const LCUConnector = require("lcu-connector");
const connector = new LCUConnector(path.join(path.dirname(path.normalize(freezer.get().leaguePath)), process.platform == "darwin" ? "LeagueClient.app" : "LeagueClient.exe"));

const styles = {
  8000: [8005, 8008, 8021, 8010, 9101, 9111, 8009, 9104, 9105, 9103, 8014, 8017, 8299],
  8100: [8112, 8124, 8128, 9923, 8126, 8139, 8143, 8136, 8120, 8138, 8135, 8134, 8105, 8106],
  8200: [8214, 8229, 8230, 8224, 8226, 8275, 8210, 8234, 8233, 8237, 8232, 8236],
  8300: [8351, 8359, 8360, 8306, 8304, 8313, 8321, 8316, 8345, 8347, 8410, 8352],
  8400: [8437, 8439, 8465, 8446, 8463, 8401, 8429, 8444, 8473, 8451, 8453, 8242],
};

let debug = false;

/**
 * Output log to console for debug
 * @param  {String} status Debug status [INFO, ERROR]
 * @param  {String} message Log message
 */
function log(status, message) {
  if (!debug) return;
  let d = new Date();
  console.log("[" + d.getDate() + "/" + d.getMonth() + "/" + d.getFullYear() + " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() + "] " + status.toUpperCase() + ": " + message);
}

/**
 * Controller for session update
 * @param  {Object} data Session data (From Client API)
 */
function doOnSessionUpdate(data) {
  let action = data.myTeam.find((el) => data.localPlayerCellId === el.cellId);
  let champion = "";
  if (data) freezer.get().current.set("session", true);
  if (!action) return;
  if (data.timer.phase !== "FINALIZATION") {
    let champions = freezer.get().champions;
    champion = Object.keys(champions).find((el) => champions[el].key == action.championId);
    if (champion === undefined) {
      log("Error", "No champion selected");
      return;
    }
    freezer.emit("champion:choose", champion);
    log("Info", champion + " selected");
  }
}

/**
 * Fetch runes page from state's list (state.runes.list)
 * @param  {String} champion  Champion's name (eg. Aatrox)
 * @return {Object}           Runes page
 */
function fetchRunesPage(champion) {
  let list = freezer.get().runes.list;

  if (list[champion] !== undefined) {
    let page = {
      name: `EasyRunes: ${champion}`,
      primaryStyleId: -1,
      selectedPerkIds: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      subStyleId: -1,
    };

    page.selectedPerkIds = list[champion]["perks"].concat([5008, 5002, 5003]);

    for (var k in styles) {
      if (styles[k].includes(page.selectedPerkIds[0])) {
        page.primaryStyleId = k;
      }
      if (styles[k].includes(page.selectedPerkIds[5])) {
        page.subStyleId = k;
      }
    }
    log("Info", "Fetched runes page from state's list");
    return page;
  }
  log("Error", "Runes not found for " + champion);
  return null;
}

/**
 * Freezer listner for when user clicks on the info button
 */
freezer.on("app:info", () => {
  log("Info", "App info");
  ipcRenderer.send("app:info");
});

/**
 * Freezer listner for when user clicks on the close button on info
 */
freezer.on("app:infoquit", () => {
  log("Info", "Info quit");
  ipcRenderer.send("app:infoquit");
});

/**
 * Freezer listner for when user clicks on the close button
 */
freezer.on("app:quit", () => {
  log("Info", "App quit");
  ipcRenderer.send("app:quit");
});

/**
 * Freezer listener for when user clicks on the upload button
 */
freezer.on("page:upload", () => {
  document.getElementById("spinner").classList.add("download");
  let page = freezer.get().current.updating;

  if (freezer.get().current.page.isEditable) {
    log("Info", "User's runes page detected");
    api.del("/lol-perks/v1/pages/" + freezer.get().current.page.id).then((res) => {
      log("Info", "Deleted runes page (name: " + freezer.get().current.page.name + ")");
      api.post("/lol-perks/v1/pages/", page).then((res) => {
        if (!res) {
          log("Error", "No response after page upload request");
          return;
        }
        log("Info", "Uploaded " + page.name);
        freezer.get().runes.set("lastUploadedPage", { champion: champion, page: page });
      });
    });
  } else {
    log("Info", "Default runes page detected");
    api.post("/lol-perks/v1/pages/", page).then((res) => {
      if (!res) {
        log("Error", "No response after page upload request");
        return;
      }
      log("Info", "Uploaded " + page.name);
      freezer.get().runes.set("lastUploadedPage", { champion: champion, page: page });
    });
  }

  setTimeout(() => {
    document.getElementById("spinner").classList.remove("download");
  }, 2000);
});

/**
 * Freezer listener for when a champion is selected
 */
freezer.on("champion:choose", (champion) => {
  if (champion === undefined || champion === "") return;
  freezer.get().current.set("champion", champion);
  document.getElementById("champion").src = "https://ddragon.leagueoflegends.com/cdn/" + freezer.get().apiVersion + "/img/champion/" + champion + ".png";
  log("Info", "Updated champion's icon");
  if (freezer.get().current.page.id && freezer.get().summoner.summonerLevel >= 10) {
    let page = fetchRunesPage(champion);
    if (page === null) {
      log("Error", "No runes data for this champion");
      for (let i = 1; i < 10; i++) {
        document.getElementById("perk-" + i).src = "../img/perk/qm.png";
        document.getElementById("perk-" + i).classList.add("hidden");
      }
      document.getElementById("error").classList.remove("hidden");
      document.getElementById("upload").classList.add("cursor-not-allowed");
      document.getElementById("upload").disabled = true;
      return;
    }
    log("Info", "Fetched runes for " + champion);
    freezer.get().current.set("updating", page);
    document.getElementById("error").classList.add("hidden");
    document.getElementById("upload").classList.remove("cursor-not-allowed");
    document.getElementById("upload").disabled = false;
    for (let i = 1; i < 10; i++) {
      document.getElementById("perk-" + i).classList.remove("hidden");
      document.getElementById("perk-" + i).src = "../img/perk/" + page.selectedPerkIds[i - 1] + ".png";
    }
  }
});

/**
 * Freezer listener for when API is first connected
 */
freezer.on("api:connected", () => {
  api.get("/lol-summoner/v1/current-summoner").then((summoner) => {
    if (!summoner) {
      log("Error", "Unable to fetch summoner's info");
      return;
    }
    freezer.get().summoner.set({
      displayName: summoner.displayName,
      internalName: summoner.internalName,
      summonerLevel: summoner.summonerLevel,
      accountId: summoner.accountId,
      summonerId: summoner.summonerId,
      puuid: summoner.puuid,
    });
    log("Info", "Fetched summoner's info");
  });
  api.get("/lol-perks/v1/currentpage").then((page) => {
    if (!page) {
      log("Error", "Unable to fetch current runes page");

      return;
    }
    freezer.get().current.set("page", page);
    log("Info", "Fetched current runes page");
  });
  api.get("/lol-perks/v1/perks").then((data) => {
    if (!data) return;
    freezer.get().runes.set("data", data);
    log("Info", "Fetched runes data");
  });
  api.get("/lol-champ-select/v1/session").then((data) => {
    if (data) {
      let x = setInterval(() => {
        if (Object.keys(freezer.get().runes.list).length > 0) {
          log("Info", "Session detected before EasyRunes");
          doOnSessionUpdate(data);
          clearInterval(x);
        }
      }, 1000);
    }
  });
});

/**
 * Freezer listener for when a summoner change is detected
 */
freezer.on("/lol-summoner/v1/current-summoner:Update", (summoner) => {
  if (!summoner) {
    log("Error", "Unable to fetch summoner's info");
    return;
  }
  freezer.get().summoner.set({
    displayName: summoner.displayName,
    internalName: summoner.internalName,
    summonerLevel: summoner.summonerLevel,
    accountId: summoner.accountId,
    summonerId: summoner.summonerId,
    puuid: summoner.puuid,
  });
  log("Info", "Updated summoner's info");
});

/**
 * Freezer listener for when a runes page change is detected
 */
freezer.on("/lol-perks/v1/currentpage:Update", (page) => {
  if (!page) {
    log("Error", "Unable to fetch current runes page");
    return;
  }
  freezer.get().current.set("page", page);
  if (page.name != freezer.get().runes.lastUploadedPage) {
    freezer.get().runes.set("lastUploadedPage", {
      champion: null,
      page: null,
    });
  }
  log("Info", "Updated current runes page");
});

/**
 * Freezer listener for when the runes data is detected
 */
freezer.on("/lol-perks/v1/perks:Update", (data) => {
  if (!data) return;
  freezer.get().runes.set("data", data);
  log("Info", "Updated runes data");
});

/**
 * Freezer listener for when a session change is detected
 */
freezer.on("/lol-champ-select/v1/session:Update", (data) => {
  if (data) {
    doOnSessionUpdate(data);
  }
});

/**
 * Freezer listener for when a session is deleted
 */
freezer.on("/lol-champ-select/v1/session:Delete", () => {
  log("Info", "Session deleted");
  freezer.get().current.set("session", false);
  freezer.get().current.set("champion", {});
  freezer.get().current.set("updating", {});

  document.getElementById("error").classList.add("hidden");
  document.getElementById("upload").classList.add("cursor-not-allowed");
  document.getElementById("upload").disabled = true;
  document.getElementById("champion").src = "../img/unknown.png";
  for (let i = 1; i < 10; i++) {
    document.getElementById("perk-" + i).classList.remove("hidden");
    document.getElementById("perk-" + i).src = "../img/perk/qm.png";
  }
});

/**
 * Connector listner for a successful connection from LCUConnector to Client
 */
connector.on("connect", (data) => {
  log("Info", "Connected to client");
  api.bind(data);
  log("Info", "Established websocket to client");
});

/**
 * Connector listner for a connection from LCUConnector to Client is dropped
 */
connector.on("disconnect", () => {
  log("Info", "Disconnected from client");
  api.destroy();
  log("Info", "Websocket destroyed");
});

/**
 * Load resources from ddragon cdn
 */
request("https://ddragon.leagueoflegends.com/api/versions.json", function (error, response, data) {
  if (!error && response && response.statusCode == 200) {
    freezer.get().set("apiVersion", JSON.parse(data)[0]);
    log("Info", "Fetched API Version");
    request("http://ddragon.leagueoflegends.com/cdn/" + JSON.parse(data)[0] + "/data/en_US/champion.json", function (error, response, data) {
      if (!error && response && response.statusCode == 200) {
        freezer.get().set("champions", JSON.parse(data).data);
        log("Info", "Fetched champions data");
      }
    });
  } else {
    log("Error", "Unable to fetch API Version");
  }
});

/**
 * Download runes list
 */
request.post("https://runebook.lowyiyiu.com/easyrunes", (error, response, data) => {
  if (!error && response.statusCode == 200) {
    freezer.get().runes.set("list", JSON.parse(data));
    log("Info", "Fetched Runes List");
  } else {
    log("Error", "Unable to fetch Runes List");
  }
});

/**
 * Start LCUConnector
 */
connector.start();
