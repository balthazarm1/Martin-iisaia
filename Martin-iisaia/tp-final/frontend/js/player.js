// Único módulo que controla el <audio>. Nunca se recrea al cambiar de vista.

import { showError } from './ui.js';

let audio;
let current = null;

function emitChange() {
    document.dispatchEvent(new CustomEvent('player:change', {
        detail: { songId: current?.id ?? null, playing: !audio.paused },
    }));
}

function updateBar() {
    const toggle = document.getElementById('player-toggle');
    toggle.disabled = current === null;
    toggle.textContent = audio.paused ? '▶' : '❚❚';
    toggle.setAttribute('aria-label', audio.paused ? 'Reproducir' : 'Pausar');
    if (current) {
        document.getElementById('player-title').textContent = current.title;
        document.getElementById('player-artist').textContent = current.artist;
    }
}

function onStateChange() {
    updateBar();
    emitChange();
}

async function safePlay() {
    try {
        await audio.play();
    } catch (err) {
        // AbortError = se cambió de pista antes de que arrancara; no es un fallo.
        if (err.name !== 'AbortError') showError('No se pudo reproducir el audio');
    }
}

export function togglePlay() {
    if (!current) return;
    if (audio.paused) safePlay();
    else audio.pause();
}

export function playTrack(song) {
    if (current?.id === song.id) {
        togglePlay();
        return;
    }
    current = song;
    audio.src = song.audio_url;
    updateBar();
    safePlay();
}

export function getCurrentSongId() {
    return current?.id ?? null;
}

export function isPlaying() {
    return Boolean(audio && !audio.paused);
}

export function initPlayer() {
    audio = document.getElementById('audio');
    document.getElementById('player-toggle').addEventListener('click', togglePlay);
    for (const evt of ['playing', 'pause', 'ended']) {
        audio.addEventListener(evt, onStateChange);
    }
    audio.addEventListener('error', () => {
        if (!audio.getAttribute('src')) return;
        showError('No se pudo cargar el audio');
        onStateChange();
    });
}
