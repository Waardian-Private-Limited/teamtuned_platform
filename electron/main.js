const { app, BrowserWindow } = require('electron')
const path = require('path')

let mainWindow

function createWindow() {
  console.log("Creating BrowserWindow...")

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.webContents.openDevTools()

  const port = process.env.PORT || '3000'
  const url = process.env.APP_URL || `http://localhost:${port}`
  console.log("Loading URL:", url)

  mainWindow.once('ready-to-show', () => {
    console.log("Window ready, showing")
    mainWindow.show()
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDesc) => {
    console.error('Failed to load:', errorCode, errorDesc)
    setTimeout(() => mainWindow.loadURL(url), 1000)
  })

  mainWindow.loadURL(url).catch(err => console.error("LoadURL promise error:", err))
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    console.log("App ready")
    createWindow()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
