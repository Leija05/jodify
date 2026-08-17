const { contextBridge } = require('electron');

const apiUrlArg = process.argv.find((a) => a.startsWith('--jodify-api-url='));

contextBridge.exposeInMainWorld('jodifyEnv', {
  apiUrl: apiUrlArg ? apiUrlArg.slice('--jodify-api-url='.length) : '',
});
