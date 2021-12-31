/** @format */

var Freezer = require('freezer-js');

var state = {
  apiVersion: 0,
  // C:\\Garena\\Games\\32771\\LeagueClient\\LeagueClient.exe
  leaguePath: '',
  summoner: {
    displayName: '',
    internalName: '',
    summonerLevel: 0,
    accountId: 0,
    summonerId: 0,
    puuid: '',
  },
  current: {
    session: false,
    champion: '',
    page: {},
    updating: {},
  },
  runes: {
    lastUploadedPage: null,
    data: null,
    list: {},
  },
  lolalytics: {
    patch: {},
  },
  champions: {},
};

module.exports = new Freezer(state);
