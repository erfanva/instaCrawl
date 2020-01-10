const { ipcRenderer } = require('electron')
const elementReady = require('element-ready')

const config = require('../../main/config')

const $ = document.querySelector.bind(document)

var post = 0
let posts = null

ipcRenderer.on('start_crawl', (e, arg) => {
  let data = window._sharedData
  data = data ? data.entry_data : undefined
  data = data ? data.ProfilePage[0].graphql.user : undefined

  if (!data)
    ipcRenderer.send('end_crawl', null)

  setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 25)

  data = data.edge_owner_to_timeline_media.edges
  // resolve(data.edge_owner_to_timeline_media)
  if(posts != null){
    ipcRenderer.send('end_crawl', posts)
    return
  }
  XMLHttpRequest.prototype.realSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (value) {
    this.addEventListener("load", function (e) {
      const d = JSON.parse(e.currentTarget.response);
      if (d.data && d.data.user && d.data.user.edge_owner_to_timeline_media) {
        data = data.concat(d.data.user.edge_owner_to_timeline_media.edges)
        if (!d.data.user.edge_owner_to_timeline_media.page_info.has_next_page) {
          XMLHttpRequest.prototype.send = XMLHttpRequest.prototype.realSend
          posts = data
          ipcRenderer.send('end_crawl', data)
        }
      }
      setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 25)
    }, false);
    this.realSend(value);
  };
})

ipcRenderer.on('toggle-dark-mode', () => {
  config.set('darkMode', !config.get('darkMode'))
  setDarkMode()
})

ipcRenderer.on('navigate-home', () => {
  const home = $('._tdn3u').childNodes[0].childNodes[0]
  if (home) {
    home.click()
  }
})

ipcRenderer.on('navigate-discover', () => {
  const discover = $('._tdn3u').childNodes[1].childNodes[0]
  console.log(discover)
  if (discover) {
    discover.click()
  }
})

ipcRenderer.on('navigate-upload', () => {
  const upload = $('._tdn3u').childNodes[2]
  if (upload) {
    upload.click()
  }
})

ipcRenderer.on('navigate-notifications', () => {
  const notifications = $('._tdn3u').childNodes[3].childNodes[0]
  if (notifications) {
    notifications.click()
  }
})

ipcRenderer.on('navigate-profile', () => {
  const profile = $('._tdn3u').childNodes[4].childNodes[0]
  if (profile) {
    profile.click()
  }
})

ipcRenderer.on('navigate-up', () => {
  if (post >= 1) {
    var titles = document.getElementsByClassName('_s5vjd')
    if (titles[post] != null) {
      post -= 1
      var rect = titles[post].getBoundingClientRect()
      window.scrollBy(0, rect.top - 44)
    }
  }
})

ipcRenderer.on('navigate-down', () => {
  var titles = document.getElementsByClassName('_s5vjd')
  if (titles[post + 1] != null) {
    post += 1
    var rect = titles[post].getBoundingClientRect()
    window.scrollBy(0, rect.top - 44)
  }
})

function backHomeButton(location) {
  const body = $('body')
  const link = document.createElement('a')
  const element = document.createElement('div')

  link.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22.84 17.39"><polygon points="22.84 8.22 1.82 8.22 9.37 0.67 8.7 0 0 8.7 8.7 17.39 9.37 16.72 1.82 9.17 22.84 9.17 22.84 8.22"/></svg>'

  if (location === 'home') {
    element.classList.add('back-btn')
  } else {
    element.classList.add('back-btn', 'inactive')
  }

  element.appendChild(link)
  body.insertBefore(element, body.firstChild)

  link.addEventListener('click', event => {
    ipcRenderer.send(location)
  })

  ipcRenderer.on('set-button-state', (event, enabled) => {
    if (enabled) {
      element.classList.remove('inactive')
    } else {
      element.classList.add('inactive')
    }
  })
}

function setDarkMode() {
  document.documentElement.classList.toggle('dark-mode', config.get('darkMode'))

  if (document.documentElement.style.backgroundColor === 'rgb(25, 38, 51)') {
    document.documentElement.style.backgroundColor = '#fff'
  } else if (config.get('darkMode')) {
    document.documentElement.style.backgroundColor = '#192633'
  }
}

function fix404() {
  // Add missing elements
  const span = $('.root')
  const section = $('.page')
  const nav = document.createElement('nav')

  span.id = 'react-root'
  section.classList.add('_8f735')
  nav.classList.add('_onabe', '_5z3y6')

  section.appendChild(nav)

  $('.error-container p a').remove()

  // Add Back button
  backHomeButton('home')
}

document.addEventListener('DOMContentLoaded', (event) => {
  // enable OS specific styles
  document.documentElement.classList.add(`os-${process.platform}`)

  // Initialize darkMode settings
  setDarkMode()

  // Get data
  /*const data = window._sharedData.entry_data.ProfilePage[0].graphql.user

  setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 25)

  let commulativeData = data.edge_owner_to_timeline_media.edges
  // resolve(data.edge_owner_to_timeline_media)
  XMLHttpRequest.prototype.realSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (value) {
    this.addEventListener("load", function (e) {
      const d = JSON.parse(e.currentTarget.response);
      if (d.data && d.data.user && d.data.user.edge_owner_to_timeline_media) {
        commulativeData = commulativeData.concat(d.data.user.edge_owner_to_timeline_media.edges)
        if (!d.data.user.edge_owner_to_timeline_media.page_info.has_next_page)
          ipcRenderer.send("dataLoaded")
      }
      setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 25)
    }, false);
    this.realSend(value);
  };*/

  // Fix 404 pages
  elementReady('.dialog-404').then(fix404)
})
