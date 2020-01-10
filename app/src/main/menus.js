const os = require('os')
const path = require('path')
const isPlatform = require('./../common/is-platform')
const {app, BrowserWindow, Menu, shell, dialog, nativeImage} = require('electron')
const config = require('./config')
const win = BrowserWindow.getAllWindows()[0]
const appName = app.productName

function sendAction (action) {
  const win = BrowserWindow.getAllWindows()[0]
  if (isPlatform('macOS')) {
    win.restore()
  }

  win.webContents.send(action)
}

function openSettings () {
  const windowModule = require('./window.js')
  windowModule.open("settings").removeMenu() 
}

const template = [
  {
    label: 'View',
    submenu: [{
      label: 'Reload',
      accelerator: 'CmdOrCtrl+R',
      click(item, focusedWindow) {
        if (focusedWindow) focusedWindow.reload()
      }
    },
    {
      label: 'Clear cache',
      click(item, focusedWindow) {
        if (focusedWindow) {
          focusedWindow.webContents.session.clearCache(() => {
            dialog.showMessageBox({
              message: 'Cache cleared correctly!'
            })
            focusedWindow.reload()
          })
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Logout',
      click() {
        win.webContents.session.clearStorageData(() => {
          win.webContents.loadURL('https://www.instagram.com/')
          dialog.showMessageBox({
            message: 'Logged out successfully!'
          })
        })
      }
    },
    // {
    //   type: 'separator'
    // },
    // {
    //   label: 'Toggle Developer Tools',
    //   type: 'checkbox',
    //   accelerator: (function () {
    //     if (process.platform === 'darwin') {
    //       return 'Alt+Command+I'
    //     } else {
    //       return 'Ctrl+Shift+I'
    //     }
    //   })(),
    //   click: function (item, focusedWindow) {
    //     if (focusedWindow) {
    //       focusedWindow.toggleDevTools()
    //     }
    //   }
    // }
    ]
  },
  {
    label: 'Crawl this page',
    click(item, focusedWindow) {
      if (focusedWindow) {
        sendAction('start_crawl')
      }
    }
  },
  // {
  //   label: 'Settings',
  //   click(item, focusedWindow) {
  //     if (focusedWindow) {
  //       // dialog.showMessageBox({
  //       //   message: 'Hi'
  //       // })
  //       openSettings ()
  //       // sendAction('open_settings')
  //     }
  //   }
  // },
  {
    role: 'window',
    submenu: [{
      role: 'minimize'
    }, {
      role: 'close'
    }, {
      role: 'quit'
    }]
  }
]

if (process.platform === 'darwin') {
  template.unshift({
    label: appName,
    submenu: [{
      role: 'about'
    },
    {
      type: 'separator'
    },
    {
      label: 'Toggle Dark Mode',
      accelerator: 'CmdOrCtrl+D',
      click() {
        sendAction('toggle-dark-mode')
      }
    },
    {
      type: 'separator'
    },
    {
      role: 'services',
      submenu: []
    },
    {
      type: 'separator'
    },
    {
      role: 'hide'
    },
    {
      role: 'hideothers'
    },
    {
      role: 'unhide'
    },
    {
      type: 'separator'
    },
    {
      role: 'quit'
    }
    ]
  })
  // Edit menu.
  template[1].submenu.push({
    type: 'separator'
  }, {
    label: 'Speech',
    submenu: [{
      role: 'startspeaking'
    },
    {
      role: 'stopspeaking'
    }
    ]
  })
  // Window menu.
  template[3].submenu = [{
    label: 'Close',
    accelerator: 'CmdOrCtrl+W',
    role: 'close'
  },
  {
    label: 'Minimize',
    accelerator: 'CmdOrCtrl+M',
    role: 'minimize'
  },
  {
    label: 'Zoom',
    role: 'zoom'
  },
  {
    type: 'separator'
  },
  {
    label: 'Bring All to Front',
    role: 'front'
  }
  ]
}

module.exports = Menu.buildFromTemplate(template)
