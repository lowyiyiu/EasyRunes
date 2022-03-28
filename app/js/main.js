/** @format */

const electron = require('electron');
const request = require('request');
const windowStateKeeper = require('electron-window-state');
const { app, BrowserWindow, ipcMain, dialog } = electron;
let main;
let info;

request('https://ddragon.leagueoflegends.com/api/versions.json', function (error, response, data) {
  if (!error && response && response.statusCode == 200) {
    return;
  } else {
    dialog.showErrorBox('Error', 'Unable to connect to Riot API. EasyRunes require an active internet connection. Please restart EasyRunes after connecting to the internet.');
    app.exit(0);
  }
});

function createMainWindow() {
  const width = 500;
  const height = 120;

  const mainWindowState = windowStateKeeper({
    defaultWidth: width,
    defaultHeight: height,
  });

  main = new BrowserWindow({
    icon: 'build\\icon.ico',
    title: 'EasyRunes Main',
    width: width,
    height: height,
    x: 0,
    y: 0,
    maximizable: false,
    frame: false,
    useContentSize: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    show: false,
  });

  mainWindowState.manage(main);
  main.setResizable(false);
  main.setFullScreenable(false);
  main.setMenu(null);

  main.webContents.on('did-finish-load', function () {
    main.show();
  });

  main.loadFile('./app/html/index.html');
  // main.webContents.openDevTools();
}

function createInfoWindow() {
  const infoWidth = 650;
  const infoHeight = 830;

  const infoWindowState = windowStateKeeper({
    defaultWidth: infoWidth,
    defaultHeight: infoHeight,
  });

  info = new BrowserWindow({
    icon: 'build\\icon.ico',
    title: 'EasyRunes Info',
    width: infoWidth,
    height: infoHeight,
    x: 0,
    y: 0,
    maximizable: false,
    frame: false,
    useContentSize: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    show: false,
  });

  infoWindowState.manage(info);
  info.setResizable(false);
  info.setFullScreenable(false);
  info.setMenu(null);
  info.center();

  info.loadFile('./app/html/info.html');
  // info.webContents.openDevTools();
}

app.whenReady().then(() => {
  createMainWindow();
  createInfoWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
    createInfoWindow();
  }
});

ipcMain.on('app:selectfile', (event, arg) => {
  dialog
    .showOpenDialog({
      properties: ['openFile'],
    })
    .then((result) => {
      if (!result.canceled) {
        info.webContents.send('selectedfile', result.filePaths[0]);
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

ipcMain.on('app:quit', (event, arg) => {
  app.exit(0);
});

ipcMain.on('app:info', (event, arg) => {
  info.show();
});

ipcMain.on('app:infoquit', (event, arg) => {
  info.hide();
});

ipcMain.on('app:restart', (event, arg) => {
  app.relaunch();
  app.exit();
});
