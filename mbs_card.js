
// MEDBLOGERS КАРТОЧКА ВРАЧА Code
    (function () {
    'use strict';

    // Этот маркер должен появиться сразу после исполнения тега <script>.
    // Он помогает отличить проблему подключения скрипта от ошибки API или DOM.
    if (window.console && typeof window.console.warn === 'function') {
    window.console.warn('[MEDBLOGERS Base] Скрипт загружен', {
    url: window.location.href
});
}

    var BACKEND_URL = 'https://backend.medblogers-base.ru';
    var API_KEY_STORAGE = 'medblogers_key';
    var DEBUG = true;
    var WIDGET_ID = 'medblogers-base-widget';
    var STYLE_ID = 'medblogers-base-widget-styles';
    var TOAST_CONTAINER_ID = 'medblogers-base-toast-container';
    var searchTimer = null;
    var searchRequestNumber = 0;
    var isBinding = false;

    function log(event, details) {
    if (!DEBUG || !window.console) {
    return;
}
    if (typeof details === 'undefined') {
    console.log('[MEDBLOGERS Base]', event);
    return;
}
    console.log('[MEDBLOGERS Base]', event, details);
}

    function logError(event, error) {
    if (!window.console) {
    return;
}
    console.error('[MEDBLOGERS Base]', event, error);
}

    function getGetCourseID() {
    var match = window.location.pathname.match(/\/user\/control\/user\/update\/id\/(\d+)/);
    return match ? match[1] : null;
}

    function getAPIKey() {
    try {
    return window.localStorage ? localStorage.getItem(API_KEY_STORAGE) : '';
} catch (error) {
    return '';
}
}

    function getWidget() {
    return document.getElementById(WIDGET_ID);
}

    function getContent() {
    var widget = getWidget();
    return widget ? widget.querySelector('[data-base-content]') : null;
}

    function getDoctorURL(getCourseID) {
    return BACKEND_URL + '/api/v1/admin/mm/getcourse/' + encodeURIComponent(getCourseID) + '/doctor';
}

    function getLinkURL(getCourseID) {
    return getDoctorURL(getCourseID) + '/link';
}

    function getSearchURL() {
    return BACKEND_URL + '/api/v1/admin/mm/getcourse/doctors/search';
}

    function withQuery(url, params) {
    var query = [];
    Object.keys(params).forEach(function (key) {
    if (params[key] !== '' && params[key] !== null && typeof params[key] !== 'undefined') {
    query.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
}
});
    return query.length ? url + '?' + query.join('&') : url;
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
    return fallbackMessage;
}

    function requestJSON(url, options) {
    log('Запрос к backend', {
    method: options && options.method ? options.method : 'GET',
    url: url.replace(/([?&]api_key=)[^&]+/, '$1***')
});
    return fetch(url, options)
    .then(function (response) {
    return response.json()
    .catch(function () {
    return {};
})
    .then(function (payload) {
    if (!response.ok) {
    /** @type {Error & { status?: number }} */
    var error = new Error(extractErrorMessage(payload, 'Ошибка запроса: HTTP ' + response.status));
    error.status = response.status;
    logError('Backend вернул ошибку HTTP ' + response.status, error.message);
    throw error;
}
    log('Backend ответил успешно', { status: response.status });
    return payload;
});
});
}

    function getToastContainer() {
    var container = document.getElementById(TOAST_CONTAINER_ID);
    if (container) {
    return container;
}
    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    container.className = 'mb-base-toast-container';
    document.body.appendChild(container);
    return container;
}

    function showToast(message, isError) {
    var toast = document.createElement('div');
    toast.className = 'mb-base-toast ' + (isError ? 'is-error' : 'is-success');
    toast.textContent = message;
    getToastContainer().appendChild(toast);
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
}, 3500);
}

    function clearContent() {
    var content = getContent();
    if (content) {
    content.innerHTML = '';
}
    return content;
}

    function isSafeURL(value) {
    try {
    var parsed = new URL(value, window.location.origin);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : '';
} catch (error) {
    return '';
}
}

    function createAvatar(photoURL, name) {
    var avatar = document.createElement('div');
    avatar.className = 'mb-base-avatar';
    var safePhotoURL = isSafeURL(photoURL);

    if (safePhotoURL) {
    var image = document.createElement('img');
    image.src = safePhotoURL;
    image.alt = name || 'Фото врача';
    image.loading = 'lazy';
    avatar.appendChild(image);
    return avatar;
}

    avatar.classList.add('is-placeholder');
    avatar.textContent = (name || 'В').trim().charAt(0).toUpperCase() || 'В';
    return avatar;
}

    function createCardLink(label, url, className) {
    var safeURL = isSafeURL(url);
    if (!safeURL) {
    return null;
}
    var link = document.createElement('a');
    link.className = className;
    link.href = safeURL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = label;
    return link;
}

    function renderLoading(message) {
    var content = clearContent();
    if (!content) {
    return;
}
    var status = document.createElement('div');
    status.className = 'mb-base-status is-loading';
    status.textContent = message || 'Загружаем данные из базы…';
    content.appendChild(status);
}

    function renderError(message) {
    var content = clearContent();
    if (!content) {
    return;
}
    var status = document.createElement('div');
    status.className = 'mb-base-status is-error';
    status.textContent = message;
    content.appendChild(status);
}

    function renderDoctor(doctor) {
    log('Получена привязка к врачу', { name: doctor.name || '' });
    var content = clearContent();
    if (!content) {
    return;
}

    var card = document.createElement('div');
    card.className = 'mb-base-doctor';
    card.appendChild(createAvatar(doctor.photoUrl || doctor.photo_url, doctor.name));

    var info = document.createElement('div');
    info.className = 'mb-base-doctor__info';
    var title = document.createElement('div');
    title.className = 'mb-base-doctor__name';
    title.textContent = doctor.name || 'Врач';
    info.appendChild(title);

    var links = document.createElement('div');
    links.className = 'mb-base-doctor__links';
    var doctorLink = createCardLink('Карточка в базе', doctor.doctorCardUrl || doctor.doctor_card_url, 'mb-base-link');
    var adminLink = createCardLink('Карточка в админке', doctor.adminCardUrl || doctor.admin_card_url, 'mb-base-link');
    if (doctorLink) {
    links.appendChild(doctorLink);
}
    if (adminLink) {
    links.appendChild(adminLink);
}
    if (links.children.length) {
    info.appendChild(links);
}

    card.appendChild(info);
    content.appendChild(card);
}

    function renderSearch() {
    log('Привязка не найдена: показываем поиск врача');
    var content = clearContent();
    if (!content) {
    return;
}

    var hint = document.createElement('div');
    hint.className = 'mb-base-status';
    hint.textContent = 'В базе пока нет привязанного врача. Найдите его по ФИО или slug.';
    content.appendChild(hint);

    var input = document.createElement('input');
    input.className = 'form-control mb-base-search__input';
    input.type = 'search';
    input.autocomplete = 'off';
    input.placeholder = 'Начните вводить ФИО врача';
    input.setAttribute('aria-label', 'Поиск врача в базе MEDBLOGERS');
    content.appendChild(input);

    var results = document.createElement('div');
    results.className = 'mb-base-search__results';
    content.appendChild(results);

    input.addEventListener('input', function () {
    window.clearTimeout(searchTimer);
    var query = input.value.trim();
    if (query.length < 2) {
    results.innerHTML = '';
    return;
}
    searchTimer = window.setTimeout(function () {
    searchDoctors(query, results);
}, 300);
});
}

    function renderSearchResults(container, items, query) {
    container.innerHTML = '';
    if (!items.length) {
    var empty = document.createElement('div');
    empty.className = 'mb-base-status';
    empty.textContent = 'По запросу «' + query + '» врачи не найдены.';
    container.appendChild(empty);
    return;
}

    items.forEach(function (item) {
    var slug = item.doctorSlug || item.doctor_slug || item.slug;
    if (!slug) {
    return;
}

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'mb-base-search__item';
    button.appendChild(createAvatar(item.photoUrl || item.photo_url, item.name));

    var name = document.createElement('span');
    name.className = 'mb-base-search__name';
    name.textContent = item.name || 'Врач';
    button.appendChild(name);
    button.addEventListener('click', function () {
    linkDoctor(slug, item.name || 'врача');
});
    container.appendChild(button);
});
}

    function searchDoctors(query, container) {
    var apiKey = getAPIKey();
    var currentRequest = ++searchRequestNumber;
    if (!apiKey) {
    log('Поиск не выполнен: отсутствует medblogers_key');
    renderError('В localStorage не найден ключ medblogers_key.');
    return;
}

    log('Запуск поиска врачей', { query: query });
    container.innerHTML = '<div class="mb-base-status is-loading">Ищем…</div>';
    requestJSON(withQuery(getSearchURL(), {
    query: query,
    api_key: apiKey
}), {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
})
    .then(function (payload) {
    if (currentRequest !== searchRequestNumber) {
    log('Игнорируем устаревший ответ поиска', { query: query });
    return;
}
    var items = Array.isArray(payload.items) ? payload.items : [];
    log('Поиск завершён', { query: query, itemsCount: items.length });
    renderSearchResults(container, items, query);
})
    .catch(function (error) {
    if (currentRequest !== searchRequestNumber) {
    return;
}
    logError('Ошибка поиска врачей', error);
    container.innerHTML = '';
    var status = document.createElement('div');
    status.className = 'mb-base-status is-error';
    status.textContent = error.message || 'Не удалось выполнить поиск.';
    container.appendChild(status);
});
}

    function linkDoctor(doctorSlug, doctorName) {
    var getCourseID = getGetCourseID();
    var apiKey = getAPIKey();
    if (isBinding || !getCourseID) {
    log('Привязка пропущена', { isBinding: isBinding, hasGetCourseID: Boolean(getCourseID) });
    return;
}
    if (!apiKey) {
    log('Привязка не выполнена: отсутствует medblogers_key');
    showToast('В localStorage не найден ключ medblogers_key.', true);
    return;
}

    isBinding = true;
    log('Запуск привязки врача', { getCourseID: getCourseID, doctorSlug: doctorSlug });
    renderLoading('Привязываем «' + doctorName + '»…');
    requestJSON(getLinkURL(getCourseID), {
    method: 'POST',
    headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
},
    body: JSON.stringify({
    doctor_slug: doctorSlug,
    api_key: apiKey
})
})
    .then(function () {
    log('Врач успешно привязан', { getCourseID: getCourseID, doctorSlug: doctorSlug });
    showToast('Врач успешно привязан к пользователю GetCourse.', false);
    return loadDoctor();
})
    .catch(function (error) {
    logError('Ошибка привязки врача', error);
    showToast(error.message || 'Не удалось привязать врача.', true);
    renderSearch();
})
    .finally(function () {
    isBinding = false;
    log('Привязка завершена');
});
}

    function loadDoctor() {
    var getCourseID = getGetCourseID();
    var apiKey = getAPIKey();
    if (!getCourseID) {
    log('Не удалось определить GetCourse ID из URL', { pathname: window.location.pathname });
    renderError('Не удалось определить GetCourse ID пользователя из URL.');
    return Promise.resolve();
}
    if (!apiKey) {
    log('Загрузка врача не выполнена: отсутствует medblogers_key');
    renderError('В localStorage не найден ключ medblogers_key.');
    return Promise.resolve();
}

    log('Загружаем привязку врача', { getCourseID: getCourseID });
    renderLoading();
    return requestJSON(withQuery(getDoctorURL(getCourseID), {
    api_key: apiKey
}), {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
})
    .then(function (payload) {
    if (payload && payload.doctor) {
    renderDoctor(payload.doctor);
    return;
}
    log('Backend не вернул врача, показываем поиск');
    renderSearch();
})
    .catch(function (error) {
    if (error.status === 404) {
    log('Привязка врача не найдена', { getCourseID: getCourseID });
    renderSearch();
    return;
}
    logError('Ошибка загрузки привязки врача', error);
    renderError(error.message || 'Не удалось получить данные из базы.');
});
}

    function createWidget() {
    if (getWidget()) {
    log('Виджет уже существует на странице');
    return true;
}

    var moneyPanel = document.querySelector('#userFormBroughtMoney');
    var fallbackTarget = document.querySelector('.user-info')
    || document.querySelector('#userFormProfile .panel-body')
    || document.querySelector('#userFormProfile');
    if (!moneyPanel && !fallbackTarget) {
    log('Контейнер для виджета пока не найден');
    return false;
}

    var widget = document.createElement('section');
    widget.id = WIDGET_ID;
    widget.className = 'mb-base-widget';
    widget.innerHTML = ''
    + '<div class="mb-base-widget__title">База MEDBLOGERS</div>'
    + '<div class="mb-base-widget__content" data-base-content></div>';
    if (moneyPanel && moneyPanel.parentNode) {
    moneyPanel.parentNode.insertBefore(widget, moneyPanel.nextSibling);
    log('Виджет добавлен после блока «Принес денег»');
} else {
    fallbackTarget.appendChild(widget);
    log('Виджет добавлен в резервный контейнер');
}
    return true;
}

    function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
    return;
}
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = ''
    + '.mb-base-widget{margin-top:16px;padding:16px;border:1px solid #dfe3e8;border-radius:10px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.04);}'
    + '.mb-base-widget__title{margin-bottom:12px;font-size:17px;font-weight:700;color:#1f2937;}'
    + '.mb-base-status{padding:10px 0;color:#64748b;font-size:14px;line-height:1.45;}'
    + '.mb-base-status.is-loading:before{content:"";display:inline-block;width:13px;height:13px;margin-right:8px;border:2px solid #cbd5e1;border-top-color:#2563eb;border-radius:50%;vertical-align:-2px;animation:mb-base-spin .7s linear infinite;}'
    + '.mb-base-status.is-error{color:#b91c1c;}'
    + '.mb-base-doctor{display:flex;align-items:center;gap:12px;}'
    + '.mb-base-avatar{width:48px;height:48px;flex:0 0 48px;overflow:hidden;border-radius:50%;background:#e2e8f0;}'
    + '.mb-base-avatar img{display:block;width:100%;height:100%;object-fit:cover;}'
    + '.mb-base-avatar.is-placeholder{display:flex;align-items:center;justify-content:center;background:#dbeafe;color:#1d4ed8;font-size:18px;font-weight:700;}'
    + '.mb-base-doctor__info{min-width:0;}'
    + '.mb-base-doctor__name{margin-bottom:5px;color:#111827;font-size:15px;font-weight:700;}'
    + '.mb-base-doctor__links{display:flex;flex-wrap:wrap;gap:8px 12px;}'
    + '.mb-base-link{color:#2563eb;font-size:13px;text-decoration:none;}.mb-base-link:hover{text-decoration:underline;}'
    + '.mb-base-search__input{margin:10px 0 8px;}'
    + '.mb-base-search__results{display:flex;flex-direction:column;gap:6px;}'
    + '.mb-base-search__item{display:flex;align-items:center;gap:10px;width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;text-align:left;cursor:pointer;transition:border-color .15s,background .15s;}'
    + '.mb-base-search__item:hover{border-color:#93c5fd;background:#f8fbff;}'
    + '.mb-base-search__item .mb-base-avatar{width:36px;height:36px;flex-basis:36px;font-size:14px;}'
    + '.mb-base-search__name{overflow:hidden;color:#1f2937;font-size:14px;font-weight:600;text-overflow:ellipsis;white-space:nowrap;}'
    + '.mb-base-toast-container{position:fixed;right:16px;bottom:16px;z-index:10001;display:flex;flex-direction:column;gap:10px;pointer-events:none;}'
    + '.mb-base-toast{min-width:260px;max-width:360px;padding:14px 16px;border-radius:10px;color:#fff;font-size:14px;line-height:1.4;box-shadow:0 12px 28px rgba(0,0,0,.18);opacity:0;transform:translateY(12px);transition:opacity .25s ease,transform .25s ease;}'
    + '.mb-base-toast.is-visible{opacity:1;transform:translateY(0);}.mb-base-toast.is-success{background:#15803d;}.mb-base-toast.is-error{background:#b91c1c;}'
    + '@keyframes mb-base-spin{to{transform:rotate(360deg);}}';
    document.head.appendChild(style);
}

    function initWidget() {
    if (!/^\/user\/control\/user\/update\/id\/\d+/.test(window.location.pathname)) {
    log('Страница не является карточкой GetCourse пользователя', { pathname: window.location.pathname });
    return;
}

    log('Инициализация виджета', { getCourseID: getGetCourseID() });
    injectStyles();
    if (createWidget()) {
    loadDoctor();
    return;
}

    var observer = new MutationObserver(function () {
    if (createWidget()) {
    observer.disconnect();
    loadDoctor();
}
});
    observer.observe(document.body, { childList: true, subtree: true });
}

    if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
} else {
    initWidget();
}
})();
