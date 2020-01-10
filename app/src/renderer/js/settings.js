const { ipcRenderer } = require('electron')

const $ = document.querySelector.bind(document)

ipcRenderer.on('set_date_range_response', (e, arg) => {
  arg.forEach( item => {
    const src = item.preview_display_url
    $("#result").innerHTML += "<img style='width: 100%' src='"+src+"'>" + "<br>"
  })
})

document.addEventListener('DOMContentLoaded', (event) => {
  $('#submit').onclick = e => {
    const from = new Date($('#date_from').value).getTime() / 1000
    let to = new Date($('#date_from').value)
    to.setDate(to.getDate() + 1)
    to = to.getTime() / 1000

    ipcRenderer.send("set_date_range", {from: from, to: to})
  }
})
