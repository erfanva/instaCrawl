const { ipcRenderer } = require('electron')

const $ = document.querySelector.bind(document)

ipcRenderer.send('show_crawled_loaded')

ipcRenderer.send("get_date_range")

const locales = ["fa-IR", "en-US"]
let l = 0

let posts = []
let date_range = {}

ipcRenderer.on('get_date_range_res', (e, arg) => {
  date_range = arg
  show_date_range()
})

ipcRenderer.on('show_crawled', (e, arg) => {
  posts = arg
  show_posts()
})

document.addEventListener('DOMContentLoaded', (event) => {
  $('#like_sort').onclick = e => {
    posts.sort((a, b) => b.likes_count - a.likes_count)
    show_posts()
  }
  $('#comment_sort').onclick = e => {
    posts.sort((a, b) => b.comments_count - a.comments_count)
    show_posts()
  }
  $('#chnage_date').onclick = e => {
    l = (l + 1) % locales.length
    show_posts()
    show_date_range()
  }
})

function show_date_range() { 
  const from = new Date(date_range.from * 1000)
  $('#date_from').innerHTML = arg.from ? from.toLocaleDateString(locales[l]) : "_"
  let to = new Date(date_range.to * 1000)
  to.setDate(to.getDate() - 1)
  $('#date_to').innerHTML = date_range.to ? to.toLocaleDateString(locales[l]) : "_"
}

function show_posts() {
  $("#result").innerHTML = ""
  posts.forEach(item => {
    const src = item.preview_display_url
    const date = new Date(item.date*1000).toLocaleDateString(locales[l])
    $("#result").innerHTML += `
      <a href="${item.url}" style="text-decoration: none;display: block;position: relative;">
      <div style="display: block;"><img style='width: 100%' src="${src}"></div>
      <div style="
        display: flex; flex-direction: row; justify-content: center;position: absolute;
        bottom: 0;
        left: 0;
        position: absolute;
        right: 0;
        /*top: 50%;*/
        color: white;
        font-family: sans-serif;
        font-weight: 900;
        background:rgba(0, 0, 0, 0.3);
        ">
        🕒 <span style="margin-right: 60px;">${date}</span>
        ❤️ <span style="margin-right: 30px;">${item.likes_count}</span>
        💬 <span style="margin-right: 30px;">${item.comments_count}</span>
      </div>
      </a>
    `
  })
}