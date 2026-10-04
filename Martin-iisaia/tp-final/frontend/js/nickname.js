// Nickname del usuario persistido en localStorage.

const KEY = 'indiestream.nickname';

export function getNickname() {
    return (localStorage.getItem(KEY) || '').trim();
}

export function setNickname(value) {
    localStorage.setItem(KEY, value.trim());
}

export function initNickname() {
    const input = document.getElementById('nickname-input');
    input.value = getNickname();
    input.addEventListener('input', () => setNickname(input.value));
}

export function focusNickname() {
    document.getElementById('nickname-input').focus();
}
