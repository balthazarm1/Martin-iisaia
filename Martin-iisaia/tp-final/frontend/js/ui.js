// Helpers de DOM y feedback visual.

/**
 * Crea un elemento. Los textos van siempre por textContent (nunca innerHTML).
 */
export function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'text') node.textContent = value;
        else if (key === 'className') node.className = value;
        else if (key === 'dataset') Object.assign(node.dataset, value);
        else node.setAttribute(key, value);
    }
    for (const child of [].concat(children)) {
        node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
}

/**
 * Deshabilita el botón y muestra `label` mientras corre `asyncFn`.
 */
export async function withLoading(button, label, asyncFn) {
    const original = button.textContent;
    button.disabled = true;
    button.classList.add('is-loading');
    button.textContent = label;
    try {
        return await asyncFn();
    } finally {
        button.disabled = false;
        button.classList.remove('is-loading');
        button.textContent = original;
    }
}

export function showError(message) {
    const banner = document.getElementById('error-banner');
    document.getElementById('error-message').textContent = message;
    banner.hidden = false;
}

export function initErrorBanner() {
    document.getElementById('error-close').addEventListener('click', () => {
        document.getElementById('error-banner').hidden = true;
    });
}
