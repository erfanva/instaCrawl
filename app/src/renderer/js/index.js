const { ipcRenderer } = require('electron')
const elementReady = require('element-ready')

const config = require('../../main/config')
const ifunc = require('./../../common/insta-functions')

const $ = document.querySelector.bind(document)

let date_range = {}
let posts = {}
let has_next_page = false
let is_crawling = false
let page_owner
let need_follow, blocked
XMLHttpRequest.prototype.realSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function (value) {
  // main send function:)
  this.realSend(value);

  // find page owner username
  if (window.location.pathname.slice(0, 2) != "/p/")
    page_owner = window.location.pathname.slice(1, -1).split("/")[0]

  this.addEventListener("load", function (e) {
    let d = JSON.parse(e.currentTarget.response);
    d = d.data ? d.data : d.graphql

    if (d && d.user && d.user.edge_owner_to_timeline_media) {
      d = d.user
      blocked = d.has_blocked_viewer
      need_follow = d.is_private && !d.followed_by_viewer
      if (blocked || need_follow)
        return

      const newPosts = ifunc.cleanPostsdata(d.edge_owner_to_timeline_media.edges)

      const has_same_owner = newPosts[0].owner == page_owner
      has_next_page = has_same_owner && d.edge_owner_to_timeline_media.page_info.has_next_page

      if (!posts[page_owner]) {
        posts[page_owner] = newPosts.slice()
      } else {
        newPosts.forEach((newPost) => {
          const index = posts[page_owner].findIndex(x => x.id === newPost.id)
          if (index > -1) {
            posts[page_owner][index] = newPost
          } else {
            posts[page_owner].push(newPost)
          }
        });
      }
      console.log(newPosts)
      console.log(posts)

      if (has_next_page && is_crawling)
        setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 25)

      if ((!has_next_page || posts[page_owner][posts[page_owner].length - 1].date < date_range.from)
        && is_crawling) {
        is_crawling = false
        ipcRenderer.send('console_log', "end_crawl")
        ipcRenderer.send('end_crawl', posts[page_owner])
      }
    }
  }, false);
};
ipcRenderer.send('console_log', "index renderer loaded")

ipcRenderer.on('start_crawl', (e, arg) => {
  if (is_crawling) {
    if (confirm("End crawling?")) {
      is_crawling = false
      ipcRenderer.send('end_crawl', posts[page_owner])
      return false
    }
  }
  if (blocked)
    alert("You are blocked from this user!")
  if (need_follow)
    alert("You need to follow this page!")
  if (!page_owner || blocked || need_follow)
    return false
  if (!date_range.from) {
    if (!confirm("You didnt select a from date. Are sure to crawl from first post?"))
      return false
  }

  // let data = window._sharedData
  // data = data ? data.entry_data : undefined
  // data = data ? data.ProfilePage : undefined
  // data = data ? data[0] : undefined
  // data = data ? data.graphql : undefined
  // data = data ? data.user : undefined

  // data = data ? data.edge_owner_to_timeline_media : undefined
  // has_next_page = data ? data.page_info.has_next_page : has_next_page

  // if (data)
  //   posts[page_owner].concat(data)

  if (!has_next_page || posts[page_owner][posts[page_owner].length - 1].date < date_range.from) {
    ipcRenderer.send('end_crawl', posts[page_owner])
    return false
  }
  is_crawling = true
  setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 25)
})


ipcRenderer.on('set_date_range_main', (e, arg) => {
  ipcRenderer.send('console_log', "rend:", arg)
  date_range = arg
})
// ipcRenderer.on('toggle-dark-mode', () => {
//   config.set('darkMode', !config.get('darkMode'))
//   setDarkMode()
// })

// ipcRenderer.on('navigate-home', () => {
//   const home = $('._tdn3u').childNodes[0].childNodes[0]
//   if (home) {
//     home.click()
//   }
// })

// ipcRenderer.on('navigate-discover', () => {
//   const discover = $('._tdn3u').childNodes[1].childNodes[0]
//   console.log(discover)
//   if (discover) {
//     discover.click()
//   }
// })

// ipcRenderer.on('navigate-upload', () => {
//   const upload = $('._tdn3u').childNodes[2]
//   if (upload) {
//     upload.click()
//   }
// })

// ipcRenderer.on('navigate-notifications', () => {
//   const notifications = $('._tdn3u').childNodes[3].childNodes[0]
//   if (notifications) {
//     notifications.click()
//   }
// })

// ipcRenderer.on('navigate-profile', () => {
//   const profile = $('._tdn3u').childNodes[4].childNodes[0]
//   if (profile) {
//     profile.click()
//   }
// })

// ipcRenderer.on('navigate-up', () => {
//   if (post >= 1) {
//     var titles = document.getElementsByClassName('_s5vjd')
//     if (titles[post] != null) {
//       post -= 1
//       var rect = titles[post].getBoundingClientRect()
//       window.scrollBy(0, rect.top - 44)
//     }
//   }
// })

// ipcRenderer.on('navigate-down', () => {
//   var titles = document.getElementsByClassName('_s5vjd')
//   if (titles[post + 1] != null) {
//     post += 1
//     var rect = titles[post].getBoundingClientRect()
//     window.scrollBy(0, rect.top - 44)
//   }
// })

// function backHomeButton(location) {
//   const body = $('body')
//   const link = document.createElement('a')
//   const element = document.createElement('div')

//   link.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22.84 17.39"><polygon points="22.84 8.22 1.82 8.22 9.37 0.67 8.7 0 0 8.7 8.7 17.39 9.37 16.72 1.82 9.17 22.84 9.17 22.84 8.22"/></svg>'

//   if (location === 'home') {
//     element.classList.add('back-btn')
//   } else {
//     element.classList.add('back-btn', 'inactive')
//   }

//   element.appendChild(link)
//   body.insertBefore(element, body.firstChild)

//   link.addEventListener('click', event => {
//     ipcRenderer.send(location)
//   })

//   ipcRenderer.on('set-button-state', (event, enabled) => {
//     if (enabled) {
//       element.classList.remove('inactive')
//     } else {
//       element.classList.add('inactive')
//     }
//   })
// }

// function setDarkMode() {
//   document.documentElement.classList.toggle('dark-mode', config.get('darkMode'))

//   if (document.documentElement.style.backgroundColor === 'rgb(25, 38, 51)') {
//     document.documentElement.style.backgroundColor = '#fff'
//   } else if (config.get('darkMode')) {
//     document.documentElement.style.backgroundColor = '#192633'
//   }
// }

// function fix404() {
//   // Add missing elements
//   const span = $('.root')
//   const section = $('.page')
//   const nav = document.createElement('nav')

//   span.id = 'react-root'
//   section.classList.add('_8f735')
//   nav.classList.add('_onabe', '_5z3y6')

//   section.appendChild(nav)

//   $('.error-container p a').remove()

//   // Add Back button
//   backHomeButton('home')
// }

document.addEventListener('DOMContentLoaded', (event) => {
  // enable OS specific styles
  // document.documentElement.classList.add(`os-${process.platform}`)

  // Initialize darkMode settings
  // setDarkMode()

  // Fix 404 pages
  // elementReady('.dialog-404').then(fix404)
})
