const { ipcRenderer } = require('electron')

const $ = document.querySelector.bind(document)

ipcRenderer.send('show_crawled_loaded')

ipcRenderer.send("get_date_range")

const locales = ["fa-IR", "en-US"]
let pageTitle = ""
let l = 0

let posts = []
let date_range = {}

ipcRenderer.on('download-progress', (e, arg) => {
  const { percent, file } = arg
  document.title = pageTitle + " - Downloading: " + percent + "%"
  if (percent == 100) {
    document.title = pageTitle
    alert("Downloads completed!")
  }
  update_progress(percent, file.id)
})

ipcRenderer.on('get_date_range_res', (e, arg) => {
  date_range = arg
  show_date_range()
})

ipcRenderer.on('show_crawled', (e, arg) => {
  posts = arg
  $('#tot_count').innerHTML = posts.length
  $('#dl_count').max = posts.length
  pageTitle = `${posts[0].owner} (${posts.length} posts)`
  document.title = pageTitle
  show_posts()
})

document.addEventListener('DOMContentLoaded', (event) => {
  // pageTitle = document.title
  $('#like_sort').onclick = e => {
    $('#like_sort').disabled = true
    $('#comment_sort').disabled = false
    likes_sort()
    show_posts()
  }
  $('#comment_sort').onclick = e => {
    $('#like_sort').disabled = false
    $('#comment_sort').disabled = true
    comments_sort()
    show_posts()
  }
  $('#chnage_date').onclick = e => {
    l = (l + 1) % locales.length
    show_posts()
    show_date_range()
  }
  $('#download').onclick = e => {
    if(!$('#dl_count').validity.valid) {
      alert("Downloads count is incorrect!")
      return false
    }
    const count = $('#dl_count').value

    // let lsort = []
    // likes_sort()
    // posts.forEach(p => lsort.push(p))

    // let csort = []
    // comments_sort()
    // posts.forEach(p => csort.push(p))

    // ipcRenderer.send('download-files', { posts, count, lsort, csort })
    ipcRenderer.send('download-files', posts.slice(0, count))
  }
})

function likes_sort() {
  posts.sort((a, b) => b.likes_count - a.likes_count)
}

function comments_sort() {
  posts.sort((a, b) => b.comments_count - a.comments_count)
}

function update_progress(progress, file_id) {
  console.log(file_id, progress)
}

function show_date_range() {
  const from = new Date(date_range.from * 1000)
  $('#date_from').innerHTML = date_range.from ? from.toLocaleDateString(locales[l]) : "..."
  let to = new Date(date_range.to * 1000)
  to.setDate(to.getDate() - 1)
  $('#date_to').innerHTML = date_range.to ? to.toLocaleDateString(locales[l]) : "..."
}

function show_posts() {
  $("#result").innerHTML = ""
  posts.forEach(item => {
    const src = item.preview_display_url
    const date = new Date(item.date * 1000).toLocaleDateString(locales[l])
    $("#result").innerHTML += `
      <a id="${item.id}" href="${item.url}" style="text-decoration: none;display: block;position: relative;">
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