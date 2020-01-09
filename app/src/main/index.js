const path = require('path')
const fs = require('fs')
const { app, Menu, shell, ipcMain } = require('electron')
const tray = require('./tray')
const appMenu = require('./menus')

const updater = require('./updater')
const analytics = require('./analytics')
const isPlatform = require('./../common/is-platform')
const window = require('./window.js')

const renderer = {
  styles: '../../dist/renderer/styles',
  js: '../../dist/renderer/js'
}

/**
 * Register Windows
 */

window.register('main', {
  url: 'https://www.instagram.com/erfan_v_a/',//'https://www.instagram.com/?utm_source=ig_lite',
  useLastState: true,
  fakeUserAgent: true,
  defaultWindowEvents: false,
  show: false,
  minHeight: 480,
  minWidth: 380,
  maxWidth: 550,
  maximizable: false,
  fullscreenable: false,
  titleBarStyle: 'hidden-inset',
  autoHideMenuBar: true,
  webPreferences: {
    preload: path.join(__dirname, renderer.js, 'index.js'),
    nodeIntegration: false,
    partition: 'persist:my-session-name'
  }
})

window.register('preload', {
  url: path.join('file://', __dirname, '../renderer/html/preload.html'),
  useLastState: true,
  width: 200,
  height: 400,
  resizable: false,
  fullscreenable: false,
  maximizable: false,
  frame: false
})

/**
 * Kick off!
 */
app.on('ready', () => {
  // Open preload window
  window.open('preload')

  // Open main window
  let mainWindow = window.open('main')
  setupWindowEvents(mainWindow)

  // Create menus
  // Menu.setApplicationMenu(appMenu)
  // tray.createTray(mainWindow)

  // Update and analytics
  updater.init(mainWindow)
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
ipcMain.on('back', (e, arg) => {
  let page = e.sender.webContents
  if (page.canGoBack()) {
    page.goBack()
  }
})

ipcMain.on('dataLoaded', (e, arg) => {
  console.log("yes")
})

ipcMain.on('home', (e, arg) => {
  let page = e.sender.webContents
  page.loadURL('https://www.instagram.com/?utm_source=ig_lite', {
    userAgent: 'Mozilla/5.0 (Linux; Android 8.0.0; Android SDK built for x86 Build/OSR1.170901.043; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/66.0.3359.158 Mobile Safari/537.36 InstagramLite 1.0.0.0.145 Android (26/8.0.0; 420dpi; 1080x1794; Google/google; Android SDK built for x86; generic_x86; ranchu; en_US; 115357035)'
  })
  page.clearHistory()
})
/**
 * setupWindowEvents
 */
function setupWindowEvents(win) {
  win.on('close', e => {
    win = null;

  })

  win.on('page-title-updated', e => {
    e.preventDefault()
  })
}

/**
 * mainWindowEvents
 */
function setupWebContentsEvents(page) {

  // Inject styles when DOM is ready
  page.on('dom-ready', () => {
    let jscode = `
      new Promise(function (resolve, reject) {
        const data = window._sharedData.entry_data.ProfilePage[0].graphql.user
    
        setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 25)
    
        let commulativeData = data.edge_owner_to_timeline_media.edges
        // resolve(data.edge_owner_to_timeline_media)
        XMLHttpRequest.prototype.realSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function (value) {
            this.addEventListener("load", function (e) {
                const d = JSON.parse(e.currentTarget.response);
                if (d.data && d.data.user && d.data.user.edge_owner_to_timeline_media) {
                    commulativeData = commulativeData.concat(d.data.user.edge_owner_to_timeline_media.edges)
                    if (!d.data.user.edge_owner_to_timeline_media.page_info.has_next_page){
                        XMLHttpRequest.prototype.send = XMLHttpRequest.prototype.realSend
                        resolve(commulativeData)
                    }
                }
                setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 25)
            }, false);
            this.realSend(value);
        };
      });
    `

    page.webContents.executeJavaScript(jscode, true).then((result) => {
      console.log(cleanPostsdata(result)) // Will be the JSON object from the fetch call
    })

  })

  // Open links in external applications
  page.on('new-window', (e, url) => {
    e.preventDefault()
    shell.openExternal(url)
  })
}
function cleanPostsdata(posts) {
  let data = []

  posts.forEach(post => {
    post = post.node
    const post_type = post.__typename == "GraphImage" ? "image" : "video"
    const comments_count = (post.edge_media_to_comment && post.edge_media_to_comment.count) || 0
    const likes_count = (post.edge_liked_by || post.edge_media_preview_like).count
    const shortcode = post.shortcode
    const date = post.taken_at_timestamp
    data.push({
      post_type: post_type,
      comments_count: comments_count,
      likes_count: likes_count,
      url: shortcode,
      date: date
    })
  });
  return data
}