const path = require('path')
const fs = require('fs')
const { app, Menu, shell, ipcMain, session, net } = require('electron')
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

const baseUrl = 'https://www.instagram.com/'

/**
 * Register Windows
 */

window.register('main', {
  url: baseUrl + 'erfan_v_a/',
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
        let data = window._sharedData
        data = data ? data.entry_data : undefined
        data = data ? data.ProfilePage[0].graphql.user : undefined

        if(!data)
          reject(data)
    
        setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 25)
    
        data = data.edge_owner_to_timeline_media.edges
        // resolve(data.edge_owner_to_timeline_media)
        XMLHttpRequest.prototype.realSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function (value) {
            this.addEventListener("load", function (e) {
                const d = JSON.parse(e.currentTarget.response);
                if (d.data && d.data.user && d.data.user.edge_owner_to_timeline_media) {
                  data = data.concat(d.data.user.edge_owner_to_timeline_media.edges)
                    if (!d.data.user.edge_owner_to_timeline_media.page_info.has_next_page){
                        XMLHttpRequest.prototype.send = XMLHttpRequest.prototype.realSend
                        resolve(data)
                    }
                }
                setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 25)
            }, false);
            this.realSend(value);
        };
      });
    `

    page.webContents.executeJavaScript(jscode, true).then((result) => {
      if(!result)
        return
      let posts = cleanPostsdata(result) // Will be the JSON object from the fetch call
      getPage("https://www.instagram.com/p/BNcstR2BLny/").then(
        res => console.log(parsePostPage(res))
      )
      // console.log(posts)
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
    const is_video = post.is_video
    const comments_count = (post.edge_media_to_comment && post.edge_media_to_comment.count) || 0
    const likes_count = (post.edge_liked_by || post.edge_media_preview_like).count
    const shortcode = post.shortcode
    const date = post.taken_at_timestamp
    data.push({
      is_video: is_video,
      comments_count: comments_count,
      likes_count: likes_count,
      url: baseUrl + 'p/' + shortcode,
      date: date
    })
  });
  return data
}

function getPage(url) {
  const ses = session.fromPartition('persist:my-session-name')
  const request = net.request({
    method: 'GET',
    url: url,
    session: ses
  })
  return new Promise(function (resolve, reject) {
    request.on('response', (response) => {
      let data = ""
      response.on('data', (chunk) => {
        data += chunk
      })
      response.on('end', () => {
        resolve(data)
      })
    })
    request.end()
  })
}
function parsePostPage(pageText) {
  let res = pageText.split("__additionalDataLoaded")[2]
  if (res) {
    res = res.split('"graphql":')[1]
    res = `{"graphql":` + res
    res = res.split(");</script>")[0]
    res = JSON.parse(res)
  } else {
    res = pageText.split("window._sharedData = ")[1]
    res = res.split(";")[0]
    res = JSON.parse(res)
    res = res.entry_data.PostPage[0]
  }
  res = res.graphql.shortcode_media

  const media_sources = res.edge_sidecar_to_children && res.edge_sidecar_to_children.edges
  const display_url = res.is_video ? res.video_url : res.display_url
  let data = []
  if (media_sources) {
    media_sources.forEach(post => {
      post = post.node
      data.push(post.is_video ? post.video_url : post.display_url)
    });
  }
  return (data.length > 0 && data) || [display_url]
}