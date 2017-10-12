const events = require('events');
const electron = require('electron');

const CHANNEL_NAME = 'arborean-apparel';

class Window extends events.EventEmitter {
  constructor() {
    super();
    this.window = null;
  }

  show() {
    if (this.window) {
      this.window.show();
      return;
    }

    this.window = new electron.BrowserWindow({
      title: 'Arborean Apparel (Alpha)',
    });

    const listener = (event, ...args) => {
      if (event.sender === this.window.webContents) {
        this.emit(...args);
      }
    };

    electron.ipcMain.on(CHANNEL_NAME, listener);

    this.window.webContents.on('did-finish-load', () => {
      this.emit('opened');
    });

    this.window.on('closed', () => {
      this.emit('closed');
      electron.ipcMain.removeListener(CHANNEL_NAME, listener);
      this.window = null;
    });

    this.window.setMenu(null);
    this.window.loadURL(`file://${__dirname}/www/index.html`);
  }

  send(...args) {
    if (!this.window) return;
    this.window.webContents.send(CHANNEL_NAME, ...args);
  }

  close() {
    if (this.window) this.window.close();
  }
}

module.exports = Window;
