const { ipcRenderer } = require('electron')

const $ = document.querySelector.bind(document)

ipcRenderer.send('show_crawled_loaded')

ipcRenderer.on('show_crawled', (e, arg) => {
  $("#result").innerHTML = ""
  arg.forEach( item => {
    const src = item.preview_display_url
    $("#result").innerHTML += "<img style='width: 100%' src='"+src+"'>" + "<br>"
  })
})
