var Freezer = require("freezer-js");

var state = {
  apiVersion: 0,
  leaguePath: "C:\\Program Files (x86)\\Garena\\32771\\LeagueClient\\LeagueClient.exe",
  summoner: {
    displayName: "",
    internalName: "",
    summonerLevel: 0,
    accountId: 0,
    summonerId: 0,
    puuid: "",
  },
  current: {
    session: false,
    champion: "",
    page: {},
    updating: {},
  },
  runes: {
    lastUploadedPage: null,
    data: null,
    list: {},
  },
  champions: {},
};

module.exports = new Freezer(state);
