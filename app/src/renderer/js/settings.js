const { ipcRenderer } = require('electron')

const $ = document.querySelector.bind(document)

document.addEventListener('DOMContentLoaded', (event) => {
  $('#submit').onclick = e => {
    const from = new Date($('#date_from').value).getTime() / 1000
    let to = new Date($('#date_from').value)
    to.setDate(to.getDate() + 1)
    to = to.getTime() / 1000

    ipcRenderer.send("set_date_range", {from: from, to: to})
  }
})
