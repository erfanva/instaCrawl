const path = require('path')
const { app, BrowserWindow, ipcMain } = require('electron')
const config = require('./config')
const isPlatform = require('./../common/is-platform')

/**
 * API
 */

let registeredWindows = {}
let currentWindows = {}
let win

// [function] Register Window
function registerWindow(name, def) {
  const url = def.url
  const useLastState = def.useLastState
  const fakeUserAgent = def.fakeUserAgent
  const defaultWindowEvents = def.defaultWindowEvents
  const isDarkMode = config.get('darkMode') || false
  const userAgent = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 520)'
  //'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'

  delete def.useLastState
  delete def.fakeUserAgent
  delete def.defaultWindowEvents
  delete def.url

  def.icon = isPlatform('linux') ? path.join(__dirname, '../assets/icon.png') : null
  def.title = def.title || app.productName
  def.darkTheme = isDarkMode
  def.backgroundColor = isDarkMode ? '#192633' : '#fff'

  registeredWindows[name] = {
    'def': def,
    'options': {
      url: url,
      agent: fakeUserAgent ? userAgent : null,
      defaultWindowEvents: defaultWindowEvents,
      useLastState: useLastState
    }
  }

  return true
}

// [function] Open Window
function openWindow(name) {
  if (registeredWindows[name]) {
    const wanted = registeredWindows[name]

    // Restore window size if useLastState
    if (wanted.options.useLastState) {
      const lastWindowState = config.get(name + 'LastState')
      if (lastWindowState) {
        wanted.def.x = lastWindowState.x
        wanted.def.y = lastWindowState.y
        wanted.def.width = lastWindowState.width
        wanted.def.height = lastWindowState.height
      }
    }

    // Hide window until it is ready
    wanted.def.show = false

    win = new BrowserWindow(wanted.def)

    if (win) {
      if (wanted.options.agent) {
        win.webContents.userAgent = wanted.options.agent
      }

      // Load URL
      if (wanted.options.url) {
        win.loadURL(wanted.options.url)
      }

      // Add save size event
      // if (wanted.options.useLastState) {
      //   win.on('close', e => {
      //     config.set(name + 'LastState', win.getBounds())
      //   })
      // }

      // Add de-reference event
      win.on('close', e => {
        delete currentWindows[name]
      })

      // Show window when ready
      win.once('ready-to-show', () => {
        win.show()
      })

      // Setup reference
      currentWindows[name] = win

      return win
    }
  }
}

// [function] Get window
function getWindow(name) {
  if (currentWindows[name]) {
    return currentWindows[name]
  }
}

// [function] Window(s) is/are open
function isOpen(name) {
  if (name && currentWindows[name]) {
    return true
  }
}

// [function] Count open windows
function countOpen() {
  return Object.keys(currentWindows).length
}

// [function] Close window
function closeWindow(name) {
  if (currentWindows[name]) {
    currentWindows[name].close()
    return true
  }
}

// [function] LoadURL
function loadURL(name, url) {
  if (currentWindows[name] && url) {
    currentWindows[name].loadURL(url)
  }
}

// [function] For each window
function each(func) {
  if (countOpen() > 0) {
    for (var name in currentWindows) {
      if (currentWindows.hasOwnProperty(name)) {
        func(currentWindows[name])
      }
    }
    return true
  }
}

/**
 * IPC
 */

ipcMain.on('window-open', function (event, name) {
  openWindow(name)
})

ipcMain.on('window-close', function (event, name) {
  closeWindow(name)
})

ipcMain.on('window-load', function (event, name, url) {
  console.log('Hope')
  loadURL(name, url)
})

/**
 * Exposed Functions
 */

module.exports = {
  register: registerWindow,
  open: openWindow,
  get: getWindow,
  isOpen: isOpen,
  countOpen: countOpen,
  close: closeWindow,
  load: loadURL,
  each: each
}
