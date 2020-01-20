const { ipcRenderer } = require('electron')

const $ = document.querySelector.bind(document)

ipcRenderer.send('show_crawled_loaded')

ipcRenderer.send("get_date_range")

ipcRenderer.on('get_date_range_res', (e, arg) => {
  const from = new Date(arg.from*1000)
  $('#date_from').innerHTML = arg.from ? from.toDateString() : "_"
  let to = new Date(arg.to*1000)
  to.setDate(to.getDate() - 1)
  $('#date_to').innerHTML = arg.to ? to.toDateString() : "_"
})

ipcRenderer.on('show_crawled', (e, arg) => {
  $("#result").innerHTML = ""
  arg.forEach( item => {
    const src = item.preview_display_url
    $("#result").innerHTML += "<img style='width: 100%' src='"+src+"'>" + "<br>"
  })
})
