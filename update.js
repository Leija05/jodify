const progressBar = document.getElementById('progressBar');
const percentText = document.getElementById('percentText');
const statusText = document.getElementById('statusText');

const btnUpdate = document.getElementById('btnUpdate');
const btnLater = document.getElementById('btnLater');

let downloading = false;

/* =========================
   BOTONES
========================= */

btnUpdate.addEventListener('click', () => {
    if (downloading) return;

    downloading = true;
    btnUpdate.classList.add('btn-disabled');
    btnLater.classList.add('btn-disabled');

    statusText.textContent = 'Descargando actualización...';
    window.electronAPI.startUpdateDownload();
});

btnLater.addEventListener('click', () => {
    if (downloading) return;
    window.electronAPI.deferUpdate();
});

/* =========================
   PROGRESO REAL
========================= */

window.electronAPI.onUpdateProgress((percent) => {
    progressBar.style.width = percent + '%';
    percentText.textContent = percent + '%';

    if (percent >= 100) {
        statusText.textContent = 'Instalando actualización...';
    }
});
