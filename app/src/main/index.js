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
let date_range = {}

function getWinConfig(url, rend) {
  rend = rend || path.join(__dirname, renderer.js, 'index.js')
  console.log(rend)
  return {
    url: url,
    useLastState: true,
    fakeUserAgent: true,
    defaultWindowEvents: false,
    show: false,
    minHeight: 480,
    minWidth: 380,
    maxWidth: 550,
    width: 460,
    height: 700,
    maximizable: false,
    fullscreenable: false,
    titleBarStyle: 'hidden-inset',
    autoHideMenuBar: false,
    webPreferences: {
      preload: rend,
      nodeIntegration: false,
      partition: 'persist:my-session-name'
    }
  }
}

/**
 * Register Windows
 */

window.register('main', getWinConfig(baseUrl + 'erfan_v_a/'))

// window.register('main2', getWinConfig(baseUrl))
window.register('settings',
  getWinConfig(
    path.join('file://', __dirname, '../renderer/html/crawlSettings.html'),
    path.join(__dirname, renderer.js, 'settings.js')
  )
)

/**
 * Kick off!
 */
app.on('ready', () => {
  // Open main window
  let mainWindow = window.open('main')

  // Open Settings
  window.open('settings')
  setupWindowEvents(mainWindow)

  // Create menus
  Menu.setApplicationMenu(appMenu)
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
ipcMain.on('set_date_range', (e, arg) => {
  let page = e.sender.webContents
  console.log(arg)
  date_range = arg
  window.open('main')
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
      if (!result)
        return
      let posts = cleanPostsdata(result) // Will be the JSON object from the fetch call
      posts = selectPostsWithDate(posts, date_range)
      console.log(posts)
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

function selectPostsWithDate(posts, date_range) {
  let data = []
  posts.forEach(post => {
    if ((!date_range.from || post.date >= date_range.from) &&
      (!date_range.to || post.date <= date_range.to))
      data.push(post)
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