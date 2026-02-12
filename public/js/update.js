const progressBar = document.getElementById('progressBar');
const percentText = document.getElementById('percentText');
const statusText = document.getElementById('statusText');
const versionText = document.getElementById('versionText');

const btnUpdate = document.getElementById('btnUpdate');
const btnLater = document.getElementById('btnLater');

let downloading = false;
console.log("Script de actualización cargado");
btnUpdate.addEventListener('click', () => {
    if (downloading) return;

    downloading = true;
    btnUpdate.classList.add('btn-disabled');
    btnLater.classList.add('btn-disabled');

    statusText.textContent = 'Descargando actualización...';
    percentText.textContent = '0%';
    progressBar.style.width = '0%';

    window.electronAPI.startUpdateDownload();
});

btnLater.addEventListener('click', () => {
    if (downloading) return;
    window.electronAPI.deferUpdate();
});

window.electronAPI.onUpdateProgress((percent) => {
    const safe = Math.min(Math.max(percent, 0), 100);

    progressBar.style.width = safe + '%';
    percentText.textContent = safe + '%';

    if (safe >= 100) {
        statusText.textContent = 'Instalando actualización...';
        document.querySelector('.window').style.animation =
            'fadeOut 0.6s ease forwards';
    }
});

window.electronAPI.onUpdateInfo(({ current, next }) => {
    versionText.textContent = `Versión ${current} → ${next}`;
});
