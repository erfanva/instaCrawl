const path = require('path')
const fs = require('fs')
const { app, Menu, shell, ipcMain, session, net } = require('electron')
const tray = require('./tray')
const appMenu = require('./menus')
const { download } = require('electron-dl');

// const updater = require('./updater')
// const analytics = require('./analytics')
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
  // analytics.init()

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
  if (posts.length > 0) {
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
ipcMain.on("download-files", async (event, arg) => {
  // const { files, count, lsort, csort } = arg
  const files = arg

  const dlLocation = path.join(app.getPath("downloads"), "Instagram");
  const pageTitle = window.get('main').getTitle()
  const ses = session.fromPartition('persist:my-session-name')

  let postIndex = 0
  for (const file of files) {
    await ifunc.getPagePosts(file.url, ses).then(async file_urls => {
      const pagePercent = postIndex / files.length
      postIndex++
      console.log(">", postIndex)
      let index = 0
      for (const url of file_urls) {
        const format = url.split("?")[0].split(".").slice(-1)[0];
        const postPercent = index / file_urls.length
        index++
        const filename = postIndex + (file_urls.length > 1 && `(${index})`) + `.${format}`
        await download(window.get('main'), url, {
          saveAs: false,
          filename: filename,
          directory: path.join(dlLocation, file.owner),
          onStarted: () => {
            console.log(file_urls.length, index)
          },
          onProgress: progress => {
            let percent = pagePercent
            percent += postPercent / file_urls.length
            percent += progress.percent / files.length / file_urls.length
            percent = Math.round(percent * 100)
            console.log(percent + "%")

            if (window.get('show_crawled')) {
              event.sender.send("download-progress", { percent, file });
            }

            window.get('main').setTitle(pageTitle + " - Downloading: " + percent + "%")
            if (percent == 100) {
              window.get('main').setTitle(pageTitle)
            }
          }
        })
      }
      // })
    })
  }
});
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