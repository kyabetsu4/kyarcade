const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("arcade", {
  getProfiles: () => ipcRenderer.invoke("get-profiles"),
  launchProfile: (profileName) => ipcRenderer.invoke("launch-profile", profileName),
  pickAvatar: (profileId) => ipcRenderer.invoke("pick-avatar", profileId),
  saveProfile: (profile) => ipcRenderer.invoke("save-profile", profile),
  renameProfile: (profileId, newName) => ipcRenderer.invoke("rename-profile", profileId, newName),
  deleteProfile: (profileId) => ipcRenderer.invoke("delete-profile", profileId),
});
