const { ipcRenderer, remote } = require('electron')
const win = remote.getCurrentWindow();
const $ = document.querySelector.bind(document)

ipcRenderer.send("get_date_range")

ipcRenderer.on('get_date_range_res', (e, arg) => {
  const from = new Date(arg.from*1000)
  $('#date_from').valueAsDate = from
  let to = new Date(arg.to*1000)
  to.setDate(to.getDate() - 1)
  $('#date_to').valueAsDate = to
})

document.addEventListener('DOMContentLoaded', (event) => {
  
  $('#submit').onclick = e => {
    const from = new Date($('#date_from').value).getTime() / 1000
    let to = new Date($('#date_to').value)
    to.setDate(to.getDate() + 1)
    to = to.getTime() / 1000

    ipcRenderer.send("set_date_range", {from: from, to: to})
    win.close()
  }
})
