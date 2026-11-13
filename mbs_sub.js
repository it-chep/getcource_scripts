

// MEDBLOGERS Code
    (function () {
    var BACKEND_URL = 'https://backend.medblogers-base.ru/api/v1/admin/gk/subscription_renewal';
    var API_KEY_STORAGE = 'medblogers_key';
    var WIDGET_ID = 'gc-days-widget';
    var MODAL_ID = 'gc-days-modal';
    var TOAST_ID = 'gc-days-toast-container';
    var isSubmitting = false;

    function getUserIdFromUrl() {
    var match = window.location.pathname.match(/\/id\/(\d+)/);
    return match ? match[1] : null;
}

    function getWidgetButton() {
    var wrapper = document.getElementById(WIDGET_ID);
    return wrapper
    ? /** @type {HTMLButtonElement | null} */ (wrapper.querySelector('.gc-days-widget__button'))
    : null;
}

    function setWidgetButtonState(loading) {
    var button = getWidgetButton();
    if (!button) {
    return;
}

    button.disabled = loading;
    button.classList.toggle('is-loading', loading);
    button.textContent = loading ? 'Отправляем...' : 'Продлить доступ';
}

    function getToastContainer() {
    var container = document.getElementById(TOAST_ID);
    if (container) {
    return container;
}

    container = document.createElement('div');
    container.id = TOAST_ID;
    container.className = 'gc-days-toast-container';
    document.body.appendChild(container);
    return container;
}

    function showMessage(message, isError) {
    var container = getToastContainer();
    var toast = document.createElement('div');
    toast.className = 'gc-days-toast ' + (isError ? 'is-error' : 'is-success');
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(function () {
    toast.classList.add('is-visible');
});

    setTimeout(function () {
    toast.classList.remove('is-visible');
    setTimeout(function () {
    if (toast.parentNode) {
    toast.parentNode.removeChild(toast);
}
}, 250);
}, 3000);
}

    function extractErrorMessage(payload, fallbackMessage) {
    if (!payload) {
    return fallbackMessage;
}

    if (typeof payload === 'string') {
    return payload;
}

    if (payload.message) {
    return payload.message;
}

    if (payload.error) {
    return typeof payload.error === 'string'
    ? payload.error
    : extractErrorMessage(payload.error, fallbackMessage);
}

    if (payload.details && payload.details.length) {
    for (var i = 0; i < payload.details.length; i += 1) {
    if (payload.details[i] && payload.details[i].message) {
    return payload.details[i].message;
}
}
}

    return fallbackMessage;
}

    function createModal() {
    if (document.getElementById(MODAL_ID)) {
    return document.getElementById(MODAL_ID);
}

    var modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'gc-days-modal';
    modal.innerHTML = ''
    + '<div class="gc-days-modal__backdrop" data-close-modal="true"></div>'
    + '<div class="gc-days-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="gc-days-title">'
    + '  <button type="button" class="gc-days-modal__close" data-close-modal="true" aria-label="Закрыть">×</button>'
    + '  <div class="gc-days-modal__title" id="gc-days-title">Продлить доступ</div>'
    + '  <label class="gc-days-modal__label" for="gc-days-input">Количество дней</label>'
    + '  <input id="gc-days-input" class="gc-days-modal__input" type="number" min="1" step="1" placeholder="Например, 30">'
    + '  <div class="gc-days-modal__actions">'
    + '    <button type="button" class="btn btn-default" data-close-modal="true">Отмена</button>'
    + '    <button type="button" class="btn btn-primary" id="gc-days-save">Сохранить</button>'
    + '  </div>'
    + '</div>';

    modal.addEventListener('click', function (event) {
    var target = event.target;
    if (target instanceof Element && target.getAttribute('data-close-modal') === 'true') {
    closeModal();
}
});

    document.body.appendChild(modal);
    return modal;
}

    function openModal() {
    if (isSubmitting) {
    return;
}

    var modal = createModal();
    modal.classList.add('is-open');

    var input = /** @type {HTMLInputElement | null} */ (document.getElementById('gc-days-input'));
    if (input) {
    input.value = '';
    setTimeout(function () {
    input.focus();
}, 50);
}
}

    function closeModal() {
    var modal = document.getElementById(MODAL_ID);
    if (modal) {
    modal.classList.remove('is-open');
}
}

    function sendDays() {
    var input = /** @type {HTMLInputElement | null} */ (document.getElementById('gc-days-input'));
    var days = input ? Number(input.value) : 0;
    var userId = getUserIdFromUrl();
    var apiKey = window.localStorage ? localStorage.getItem(API_KEY_STORAGE) : '';

    if (isSubmitting) {
    return;
}

    if (!userId) {
    showMessage('Не удалось определить ID пользователя из URL.', true);
    return;
}

    if (!Number.isInteger(days) || days <= 0) {
    showMessage('Укажи корректное количество дней больше нуля.', true);
    return;
}

    if (!apiKey) {
    showMessage('В localStorage не найден ключ medblogers_key.', true);
    return;
}

    isSubmitting = true;
    closeModal();
    setWidgetButtonState(true);

    fetch(BACKEND_URL, {
    method: 'POST',
    headers: {
    'Content-Type': 'application/json'
},
    body: JSON.stringify({
    gk_id: Number(userId),
    days_count: days,
    api_key: apiKey
})
})
    .then(function (response) {
    return response.json()
    .catch(function () {
    return {};
})
    .then(function (payload) {
    if (!response.ok) {
    throw new Error(extractErrorMessage(payload, 'Ошибка запроса: HTTP ' + response.status));
}
    return payload;
});
})
    .then(function () {
    showMessage('Подписка успешно продлена.');
})
    .catch(function (error) {
    console.error('Ошибка отправки дней:', error);
    showMessage(error && error.message ? error.message : 'Не удалось отправить данные на бекенд.', true);
})
    .finally(function () {
    isSubmitting = false;
    setWidgetButtonState(false);
});
}

    function createWidget() {
    if (document.getElementById(WIDGET_ID)) {
    return;
}

    var target = document.querySelector('.user-info')
    || document.querySelector('#userFormProfile .panel-body')
    || document.querySelector('#userFormProfile');

    if (!target) {
    return;
}

    var wrapper = document.createElement('div');
    wrapper.id = WIDGET_ID;
    wrapper.className = 'gc-days-widget';
    wrapper.innerHTML = '<button type="button" class="btn btn-primary gc-days-widget__button">Продлить доступ</button>';

    var widgetButton = /** @type {HTMLButtonElement} */ (wrapper.querySelector('.gc-days-widget__button'));
    widgetButton.addEventListener('click', openModal);
    target.appendChild(wrapper);

    var modal = createModal();
    var saveButton = /** @type {HTMLButtonElement} */ (modal.querySelector('#gc-days-save'));
    var input = /** @type {HTMLInputElement} */ (modal.querySelector('#gc-days-input'));

    saveButton.addEventListener('click', sendDays);
    input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
    sendDays();
}
    if (event.key === 'Escape') {
    closeModal();
}
});
}

    function injectStyles() {
    if (document.getElementById('gc-days-widget-styles')) {
    return;
}

    var style = document.createElement('style');
    style.id = 'gc-days-widget-styles';
    style.textContent = ''
    + '.gc-days-widget{margin-top:16px;}'
    + '.gc-days-widget__button{width:100%;}'
    + '.gc-days-widget__button.is-loading{opacity:.75;cursor:wait;}'
    + '.gc-days-modal{display:none;}'
    + '.gc-days-modal.is-open{display:block;}'
    + '.gc-days-modal__backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9998;}'
    + '.gc-days-modal__dialog{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:calc(100% - 32px);max-width:420px;background:#fff;border-radius:12px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.2);z-index:9999;}'
    + '.gc-days-modal__close{position:absolute;top:10px;right:12px;border:0;background:transparent;font-size:24px;line-height:1;cursor:pointer;color:#666;}'
    + '.gc-days-modal__title{font-size:22px;font-weight:600;margin-bottom:16px;}'
    + '.gc-days-modal__label{display:block;font-size:14px;font-weight:600;margin-bottom:8px;}'
    + '.gc-days-modal__input{width:100%;height:42px;border:1px solid #d7dce5;border-radius:8px;padding:0 12px;font-size:16px;margin-bottom:18px;}'
    + '.gc-days-modal__actions{display:flex;justify-content:flex-end;gap:12px;}'
    + '.gc-days-toast-container{position:fixed;right:16px;bottom:16px;z-index:10001;display:flex;flex-direction:column;gap:10px;pointer-events:none;}'
    + '.gc-days-toast{min-width:260px;max-width:360px;padding:14px 16px;border-radius:10px;color:#fff;font-size:14px;line-height:1.4;box-shadow:0 12px 28px rgba(0,0,0,.18);opacity:0;transform:translateY(12px);transition:opacity .25s ease,transform .25s ease;}'
    + '.gc-days-toast.is-visible{opacity:1;transform:translateY(0);}'
    + '.gc-days-toast.is-success{background:#1f9d55;}'
    + '.gc-days-toast.is-error{background:#d64545;}';

    document.head.appendChild(style);
}

    function initWidget() {
    if (!/^\/user\/control\/user\/update\/id\/\d+/.test(window.location.pathname)) {
    return;
}

    injectStyles();
    createWidget();

    if (document.getElementById(WIDGET_ID)) {
    return;
}

    var observer = new MutationObserver(function () {
    createWidget();
    if (document.getElementById(WIDGET_ID)) {
    observer.disconnect();
}
});

    observer.observe(document.body, {
    childList: true,
    subtree: true
});
}

    if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
} else {
    initWidget();
}
})();
