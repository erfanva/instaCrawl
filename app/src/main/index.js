const path = require('path')
const fs = require('fs')
const { app, Menu, shell, ipcMain, session, net } = require('electron')
const tray = require('./tray')
const appMenu = require('./menus')

// const updater = require('./updater')
const analytics = require('./analytics')
const isPlatform = require('./../common/is-platform')
const ifunc = require('./../common/insta-functions')
const window = require('./window.js')

const renderer = {
  styles: '../../src/renderer/styles',
  js: '../../src/renderer/js',
  here: 'src/main/'
}
const correctPath = (...p) => {
  let res = path.join(app.getAppPath(), 'src/main/')
  p.forEach(t => res = path.join(res, t))
  return res
}

const BASE_URL = ifunc.BASE_URL
let date_range = {}
let posts

function getWinConfig(url, node = false, new_config = {}) {
  let conf = {
    url: url,
    useLastState: true,
    fakeUserAgent: true,
    defaultWindowEvents: false,
    show: false,
    minHeight: 480,
    minWidth: 380,
    // maxWidth: 550,
    width: 460,
    height: 700,
    maximizable: false,
    fullscreenable: false,
    titleBarStyle: 'hidden-inset',
    autoHideMenuBar: false,
    webPreferences: {
      preload: !node && correctPath(renderer.js, 'index.js'),
      nodeIntegration: node,
      partition: 'persist:my-session-name'
    }
  }
  Object.assign(conf, new_config)
  return conf
}

/**
 * Register Windows
 */

window.register('main', getWinConfig(BASE_URL))

window.register('settings',
  getWinConfig(path.join('file://', correctPath('../renderer/html/settings.html')), true,
  {
    width: 460,
    height: 480,
  })
)

window.register('show_crawled',
  getWinConfig(path.join('file://', correctPath('../renderer/html/show_crawled.html')), true))

/**
 * Kick off!
 */
app.on('ready', () => {
  // // Open Settings
  // let settingsWindow = window.open('settings')
  
  // Open main window
  let mainWindow = window.open('main')

  // setupWindowEvents(settingsWindow)
  setupWindowEvents(mainWindow)

  // Create menus
  Menu.setApplicationMenu(appMenu)
  // tray.createTray(mainWindow)

  // Update and analytics
  // updater.init(mainWindow)
  analytics.init()

  // Setup events
  setupWebContentsEvents(mainWindow.webContents)
})

app.on('activate', () => {
  window.get('main').show()
})
app.on('window-all-closed', function () {
  if (process.platform != 'darwin')
    app.quit();
});
/**
 * Communicate with renderer process (web page)
 */
ipcMain.on('set_date_range', (e, arg) => {
  let page = e.sender
  console.log(arg)
  date_range = arg
  window.get("main").webContents.send('set_date_range_main', date_range)
  // const postsInRange = ifunc.selectPostsWithDate(posts, date_range)
  // page.send('set_date_range_response', postsInRange)
  // console.log(postsInRange)
  // console.log("set_data_range")
})
ipcMain.on('end_crawl', (e, arg) => {
  let page = e.sender
  posts = arg
  if(posts.length > 0) {
    window.open("show_crawled").removeMenu()
  }
})
ipcMain.on('show_crawled_loaded', (e, arg) => {
  let page = e.sender
  const postsInRange = ifunc.selectPostsWithDate(posts, date_range)
  page.send('show_crawled', postsInRange)
})
ipcMain.on('get_date_range', (e, arg) => {
  e.sender.send('get_date_range_res', date_range)
})
ipcMain.on('console_log', (e, ...arg) => {
  console.log(...arg)
})

/**
 * setupWindowEvents
 */
function setupWindowEvents(win) {
  win.on('close', e => {
    // Todo: correct closing proccess
    app.quit()
  })
  win.on('page-title-updated', e => {
    e.preventDefault()
  })
}

/**
 * mainWindowEvents
 */
function setupWebContentsEvents(page) {
  // you can Inject styles when DOM is ready
  page.on('dom-ready', () => {
    // readProfilePage(page).then(res => {
    //   console.log(res)
    // })
  })

  // Open links in external applications
  page.on('new-window', (e, url) => {
    e.preventDefault()
    shell.openExternal(url)
  })
}