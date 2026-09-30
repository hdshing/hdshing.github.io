// 获取 DOM 元素
const fileInput = document.getElementById('fileInput');
const urlInput = document.getElementById('urlInput');
const loadUrlBtn = document.getElementById('loadUrlBtn');
const contentDiv = document.getElementById('content');
const emptyState = document.getElementById('emptyState');
const pageHeader = document.getElementById('pageHeader');
const historyToggle = document.getElementById('historyToggle');
const historyPanel = document.getElementById('historyPanel');
const historyClose = document.getElementById('historyClose');
const historyList = document.getElementById('historyList');
const historyStatus = document.getElementById('historyStatus');
const historyResize = document.getElementById('historyResize');

// IndexedDB 保存文件原文，容量由浏览器管理，适合缓存较大的文本文件。
const HISTORY_DB_NAME = 'universal-preview-history';
const HISTORY_STORE_NAME = 'files';
let historyDbPromise;
let activeHistoryId = null;

function openHistoryDb() {
    if (!historyDbPromise) {
        historyDbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(HISTORY_DB_NAME, 1);
            request.onupgradeneeded = () => {
                request.result.createObjectStore(HISTORY_STORE_NAME, { keyPath: 'id' });
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    return historyDbPromise;
}

async function getHistoryRecord(id) {
    const db = await openHistoryDb();
    return new Promise((resolve, reject) => {
        const request = db.transaction(HISTORY_STORE_NAME, 'readonly')
            .objectStore(HISTORY_STORE_NAME).get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getHistoryRecords() {
    const db = await openHistoryDb();
    return new Promise((resolve, reject) => {
        const request = db.transaction(HISTORY_STORE_NAME, 'readonly')
            .objectStore(HISTORY_STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function putHistoryRecord(record) {
    const db = await openHistoryDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(HISTORY_STORE_NAME, 'readwrite');
        transaction.objectStore(HISTORY_STORE_NAME).put(record);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}

async function deleteHistoryRecord(id) {
    const db = await openHistoryDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(HISTORY_STORE_NAME, 'readwrite');
        transaction.objectStore(HISTORY_STORE_NAME).delete(id);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}

function setActiveHistoryId(id) {
    activeHistoryId = id;
    historyList.querySelectorAll('.history-entry').forEach((item) => {
        const active = item.dataset.id === id;
        item.classList.toggle('active', active);
        const button = item.querySelector('.history-item');
        if (active) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
    });
}

async function refreshHistory() {
    historyStatus.hidden = false;
    historyStatus.textContent = '正在读取历史记录...';
    try {
        const records = await getHistoryRecords();
        // 阅读历史按首次记录时间固定排序，重新打开只更新阅读时间，不改变位置。
        records.sort((a, b) =>
            (b.createdAt ?? b.readAt ?? 0) - (a.createdAt ?? a.readAt ?? 0)
            || String(a.id).localeCompare(String(b.id)));
        const items = document.createDocumentFragment();
        for (const record of records) {
            const item = document.createElement('li');
            item.className = 'history-entry';
            item.dataset.id = record.id;
            if (record.id === activeHistoryId) item.classList.add('active');

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'history-item';
            button.title = record.title;
            button.setAttribute('aria-label', `打开 ${record.title}`);
            if (record.id === activeHistoryId) button.setAttribute('aria-current', 'true');

            const title = document.createElement('span');
            title.className = 'history-title';
            title.textContent = record.title;

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'history-delete';
            removeButton.textContent = '×';
            removeButton.title = '删除记录';
            removeButton.setAttribute('aria-label', `删除 ${record.title} 的历史记录`);

            const time = document.createElement('time');
            time.className = 'history-time';
            const firstRead = new Date(record.createdAt ?? record.readAt);
            if (Number.isFinite(firstRead.getTime())) {
                time.dateTime = firstRead.toISOString();
                time.textContent = `首次记录：${firstRead.toLocaleString('zh-CN', { hour12: false })}`;
            } else {
                time.textContent = '首次记录时间未知';
            }

            button.append(title, time);
            item.append(button, removeButton);
            items.appendChild(item);
        }
        historyList.replaceChildren(items);
        historyStatus.hidden = records.length > 0;
        if (!records.length) historyStatus.textContent = '暂无阅读记录';
    } catch (error) {
        historyStatus.textContent = '无法读取历史记录，请检查浏览器存储设置';
    }
}

async function saveRead(record) {
    try {
        const previous = await getHistoryRecord(record.id);
        const now = Date.now();
        await putHistoryRecord({
            ...record,
            createdAt: previous?.createdAt ?? previous?.readAt ?? record.createdAt ?? now,
            readAt: now
        });
        if (!historyPanel.hidden) await refreshHistory();
    } catch (error) {
        historyStatus.hidden = false;
        historyStatus.textContent = '无法缓存文件，请检查浏览器可用存储空间';
    }
}

function setHistoryOpen(open) {
    historyPanel.hidden = !open;
    historyToggle.setAttribute('aria-expanded', String(open));
    if (open) void refreshHistory();
}

historyToggle.addEventListener('click', () => setHistoryOpen(historyPanel.hidden));
historyClose.addEventListener('click', () => {
    setHistoryOpen(false);
    historyToggle.focus();
});
historyList.addEventListener('click', async (event) => {
    const item = event.target.closest('.history-entry');
    if (!item) return;
    const deleting = Boolean(event.target.closest('.history-delete'));
    try {
        if (deleting) {
            await deleteHistoryRecord(item.dataset.id);
            if (activeHistoryId === item.dataset.id) setActiveHistoryId(null);
            await refreshHistory();
            return;
        }
        const record = await getHistoryRecord(item.dataset.id);
        if (!record) {
            await refreshHistory();
            return;
        }
        if (renderFile(record.source, record.fileName, record.mimeType)) {
            setActiveHistoryId(record.id);
            await saveRead(record);
        }
    } catch (error) {
        historyStatus.hidden = false;
        historyStatus.textContent = deleting ? '无法删除这条历史记录' : '无法打开这条历史记录';
    }
});

const HISTORY_WIDTH_KEY = 'universal-preview-history-width';
const HISTORY_MIN_WIDTH = 160;
const HISTORY_MAX_WIDTH = 560;

function clampHistoryWidth(width) {
    const toolbarWidth = window.innerWidth <= 600 ? 48 : 56;
    const workspaceWidth = window.innerWidth <= 600 ? 0 : 180;
    const maxWidth = Math.max(HISTORY_MIN_WIDTH, Math.min(HISTORY_MAX_WIDTH,
        window.innerWidth - toolbarWidth - workspaceWidth));
    historyResize.setAttribute('aria-valuemax', String(maxWidth));
    return Math.max(HISTORY_MIN_WIDTH, Math.min(maxWidth, width));
}

function setHistoryWidth(width) {
    const nextWidth = clampHistoryWidth(width);
    historyPanel.style.setProperty('--history-panel-width', `${nextWidth}px`);
    historyResize.setAttribute('aria-valuenow', String(nextWidth));
    return nextWidth;
}

try {
    const savedWidth = Number(localStorage.getItem(HISTORY_WIDTH_KEY));
    if (savedWidth > 0) setHistoryWidth(savedWidth);
} catch (error) {
    // 隐私模式可能禁止 localStorage；仍可在本次页面内调整宽度。
}

let historyResizeStart = null;
historyResize.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    historyResizeStart = { x: event.clientX, width: historyPanel.getBoundingClientRect().width };
    historyResize.setPointerCapture(event.pointerId);
    document.body.classList.add('resizing-history');
});
historyResize.addEventListener('pointermove', (event) => {
    if (!historyResizeStart) return;
    setHistoryWidth(historyResizeStart.width + event.clientX - historyResizeStart.x);
});
function finishHistoryResize() {
    if (!historyResizeStart) return;
    historyResizeStart = null;
    document.body.classList.remove('resizing-history');
    try {
        localStorage.setItem(HISTORY_WIDTH_KEY, historyPanel.getBoundingClientRect().width);
    } catch (error) {
        // 宽度偏好无法持久化时，本次页面的调整仍然有效。
    }
}
historyResize.addEventListener('pointerup', finishHistoryResize);
historyResize.addEventListener('pointercancel', finishHistoryResize);
historyResize.addEventListener('lostpointercapture', finishHistoryResize);
historyResize.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const change = event.key === 'ArrowRight' ? 16 : -16;
    setHistoryWidth(historyPanel.getBoundingClientRect().width + change);
    try {
        localStorage.setItem(HISTORY_WIDTH_KEY, historyPanel.getBoundingClientRect().width);
    } catch (error) {
        // 同上：不影响当前页面调整。
    }
});

function hideEmptyState() {
    if (emptyState) {
        emptyState.hidden = true;
    }
}

// 支持的文本文件扩展名及 highlight.js 语言名称。
// 空字符串表示纯文本，不进行语法高亮。
const FILE_LANGUAGES = {
    md: 'markdown', markdown: 'markdown', txt: '',
    js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    py: 'python', pyw: 'python', java: 'java',
    json: 'json', jsonc: 'json',
    html: 'xml', htm: 'xml', xml: 'xml', vue: 'xml', svelte: 'xml',
    css: 'css', scss: 'scss', less: 'less',
    yaml: 'yaml', yml: 'yaml',
    sh: 'bash', bash: 'bash', ps1: 'powershell',
    sql: 'sql', c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp',
    cs: 'csharp', go: 'go', rs: 'rust', php: 'php', rb: 'ruby',
    swift: 'swift', kt: 'kotlin', kts: 'kotlin'
};

const MARKDOWN_EXTENSIONS = new Set(['md', 'markdown']);

function getExtension(fileNameOrUrl) {
    const cleanName = fileNameOrUrl.split(/[?#]/, 1)[0];
    const fileName = cleanName.substring(cleanName.lastIndexOf('/') + 1);
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex > -1 ? fileName.substring(dotIndex + 1).toLowerCase() : '';
}

function getDisplayName(fileNameOrUrl) {
    const cleanName = fileNameOrUrl.split(/[?#]/, 1)[0];
    const fileName = cleanName.substring(cleanName.lastIndexOf('/') + 1);
    try {
        return decodeURIComponent(fileName) || '未命名文件';
    } catch (error) {
        return fileName || '未命名文件';
    }
}

function isSupportedFile(fileName, mimeType = '') {
    const extension = getExtension(fileName);
    return Object.hasOwn(FILE_LANGUAGES, extension) || mimeType.startsWith('text/');
}

// 初始化 marked 配置
marked.setOptions({
    gfm: true,              // 启用 GitHub Flavored Markdown
    breaks: true,           // 允许换行符转换为 <br>
    headerIds: true,        // 为标题添加 id
    mangle: false,          // 不转义内联 HTML
    sanitize: false,        // 不进行 HTML 净化（依赖 DOMPurify 或信任输入）
    smartLists: true,       // 使用更智能的列表行为
    smartypants: true,      // 使用智能标点
    xhtml: false            // 不强制 XHTML 合规
});

/**
 * 渲染 Markdown 内容到页面
 * @param {string} markdown - Markdown 文本内容
 */
function renderMarkdown(markdown) {
    try {
        hideEmptyState();
        contentDiv.classList.remove('code-mode');

        // 使用 marked.parse 将 Markdown 转换为 HTML
        const html = marked.parse(markdown);
        pageHeader.hidden = true;
        contentDiv.innerHTML = html;
        contentDiv.classList.add('show');

        // Markdown 内的围栏代码块也使用相同的语法高亮。
        if (window.hljs) {
            contentDiv.querySelectorAll('pre code').forEach((code) => {
                hljs.highlightElement(code);
            });
        }
        return true;
    } catch (error) {
        showError('Markdown 解析失败: ' + error.message);
        return false;
    }
}

/**
 * 在不破坏代码语义的前提下整理显示内容。
 * JSON 会按两个空格缩进；其他代码只统一换行，保留原始缩进。
 */
function formatCode(source, extension) {
    const normalized = source.replace(/\r\n?/g, '\n');

    if (extension === 'json') {
        try {
            return JSON.stringify(JSON.parse(normalized), null, 2);
        } catch (error) {
            // 无效 JSON 仍按原文显示，避免用户无法阅读文件。
        }
    }

    return normalized;
}

/**
 * 以代码模式展示文件，使用 textContent 保留缩进并避免把代码当成 HTML。
 */
function renderCode(source, fileName, extension) {
    hideEmptyState();
    pageHeader.hidden = true;

    const language = FILE_LANGUAGES[extension] || '';
    const viewer = document.createElement('section');
    viewer.className = 'code-viewer';

    const header = document.createElement('div');
    header.className = 'code-viewer-header';

    const name = document.createElement('span');
    name.className = 'code-file-name';
    name.textContent = fileName;

    const type = document.createElement('span');
    type.className = 'code-language';
    type.textContent = extension ? extension.toUpperCase() : 'TEXT';

    const pre = document.createElement('pre');
    const code = document.createElement('code');
    if (language) code.className = `language-${language}`;
    code.textContent = formatCode(source, extension);

    header.append(name, type);
    pre.appendChild(code);
    viewer.append(header, pre);
    contentDiv.replaceChildren(viewer);
    contentDiv.classList.add('show', 'code-mode');

    if (window.hljs) {
        hljs.highlightElement(code);
    }
    return true;
}

function renderFile(source, fileName, mimeType = '') {
    const extension = getExtension(fileName);
    contentDiv.classList.remove('code-mode');

    if (MARKDOWN_EXTENSIONS.has(extension) || (!extension && mimeType.includes('markdown'))) {
        return renderMarkdown(source);
    } else {
        return renderCode(source, getDisplayName(fileName), extension);
    }
}

/**
 * 显示错误信息
 * @param {string} message - 错误信息
 */
function showError(message) {
    hideEmptyState();
    pageHeader.hidden = false;
    setActiveHistoryId(null);

    const error = document.createElement('div');
    error.className = 'error-message';
    error.textContent = message;
    contentDiv.replaceChildren(error);
    contentDiv.classList.remove('code-mode');
    contentDiv.classList.add('show');
}

/**
 * 显示加载状态
 */
function showLoading() {
    hideEmptyState();
    setActiveHistoryId(null);

    contentDiv.innerHTML = '<div class="loading">正在加载...</div>';
    contentDiv.classList.remove('code-mode');
    contentDiv.classList.add('show');
}

/**
 * 处理文件上传
 * @param {Event} event - 文件选择事件
 */
function handleFileUpload(event) {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    if (!isSupportedFile(file.name, file.type)) {
        showError('暂不支持该文件格式，请选择 Markdown、代码或纯文本文件');
        return;
    }

    showLoading();

    // 使用 FileReader 读取文件内容
    const reader = new FileReader();

    reader.onload = function(e) {
        openLocalFile(file, e.target.result);
    };

    reader.onerror = function() {
        showError('文件读取失败，请重试');
    };

    reader.readAsText(file);
}

function openLocalFile(file, source) {
    const id = `file:${file.name}:${file.size}:${file.lastModified}`;
    if (!renderFile(source, file.name, file.type)) return;
    setActiveHistoryId(id);
    void saveRead({
        id,
        title: file.name,
        fileName: file.name,
        mimeType: file.type,
        source
    });
}

/**
 * 从 URL 加载 Markdown 文件
 * @param {string} url - 文件的 URL
 */
async function loadFromUrl(url) {
    if (!url.trim()) {
        showError('请输入有效的 URL');
        return;
    }

    // 简单的 URL 验证
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
    }

    showLoading();

    try {
        const response = await fetch(finalUrl, {
            method: 'GET',
            headers: {
                'Accept': 'text/plain, text/markdown, */*'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP 错误: ${response.status} ${response.statusText}`);
        }

        const content = await response.text();
        const contentType = response.headers.get('content-type') || '';
        if (!renderFile(content, finalUrl, contentType)) return;
        const id = `url:${finalUrl}`;
        setActiveHistoryId(id);
        void saveRead({
            id,
            title: getDisplayName(finalUrl),
            fileName: finalUrl,
            mimeType: contentType,
            source: content
        });

        // 清空 URL 输入框
        if (urlInput) {
            urlInput.value = '';
        }
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            showError('无法获取文件。可能是 URL 无效、文件不存在、目标服务器禁止跨域访问 (CORS)，或网络连接异常。');
        } else {
            showError('加载失败: ' + error.message);
        }
    }
}

/**
 * 处理 URL 加载按钮点击
 */
function handleUrlLoad() {
    if (!urlInput) return;

    const url = urlInput.value;
    loadFromUrl(url);
}

// 事件监听器
if (fileInput) {
    fileInput.addEventListener('change', handleFileUpload);
}

if (loadUrlBtn) {
    loadUrlBtn.addEventListener('click', handleUrlLoad);
}

// URL 输入框回车键支持
if (urlInput) {
    urlInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            handleUrlLoad();
        }
    });
}

// 拖拽上传支持 - 整个页面都可以拖拽
let dragCounter = 0;
let dragOverlay = null;

// 创建拖拽提示层
function createDragOverlay() {
    if (dragOverlay) return dragOverlay;
    
    dragOverlay = document.createElement('div');
    dragOverlay.id = 'drag-overlay';
    dragOverlay.innerHTML = `
        <div class="drag-overlay-content">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="18" x2="12" y2="12"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            <h2>释放以打开文件</h2>
            <p>支持 Markdown、代码和纯文本格式</p>
        </div>
    `;
    document.body.appendChild(dragOverlay);
    return dragOverlay;
}

// 阻止默认行为
function preventDefault(event) {
    event.preventDefault();
    event.stopPropagation();
}

// 仅在拖入的是文件时显示提示；拖动网页文字或链接不触发。
function isFileDrag(event) {
    return Array.from(event.dataTransfer?.types || []).includes('Files');
}

// 处理文件
function handleDropFile(file) {
    if (!isSupportedFile(file.name, file.type)) {
        showError('暂不支持该文件格式，请选择 Markdown、代码或纯文本文件');
        return;
    }
    
    showLoading();
    
    const reader = new FileReader();
    reader.onload = function(e) {
        openLocalFile(file, e.target.result);
    };
    reader.onerror = function() {
        showError('文件读取失败，请重试');
    };
    reader.readAsText(file);
}

// 全局拖拽事件 - 整个页面
document.addEventListener('dragenter', function(event) {
    if (!isFileDrag(event)) return;

    preventDefault(event);
    dragCounter++;
    if (dragCounter === 1) {
        createDragOverlay().classList.add('show');
    }
});

document.addEventListener('dragover', function(event) {
    if (!isFileDrag(event)) return;

    preventDefault(event);
    event.dataTransfer.dropEffect = 'copy';
});

document.addEventListener('dragleave', function(event) {
    if (!isFileDrag(event)) return;

    preventDefault(event);
    dragCounter = Math.max(0, dragCounter - 1);
    if (dragCounter === 0) {
        const overlay = document.getElementById('drag-overlay');
        if (overlay) overlay.classList.remove('show');
    }
});

document.addEventListener('drop', function(event) {
    if (!isFileDrag(event)) return;

    preventDefault(event);
    dragCounter = 0;
    const overlay = document.getElementById('drag-overlay');
    if (overlay) overlay.classList.remove('show');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        handleDropFile(files[0]);
    }
});

// 粘贴支持
document.addEventListener('paste', function(event) {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    // 从资源管理器复制文件后粘贴时，优先按本地文件处理。
    const pastedFile = clipboardData.files[0]
        || Array.from(clipboardData.items)
            .find((item) => item.kind === 'file')
            ?.getAsFile();

    if (pastedFile) {
        event.preventDefault();
        handleDropFile(pastedFile);
        return;
    }

    // 保留直接粘贴 Markdown/纯文本内容的能力。
    for (const item of clipboardData.items) {
        if (item.kind === 'string'
            && (item.type === 'text/plain' || item.type === 'text/markdown')) {
            item.getAsString(function(text) {
                if (text) {
                    if (!renderMarkdown(text)) return;
                    const title = `粘贴内容 ${new Date().toLocaleString('zh-CN')}`;
                    const id = `paste:${Date.now()}:${Math.random()}`;
                    setActiveHistoryId(id);
                    void saveRead({
                        id,
                        title,
                        fileName: '粘贴内容.md',
                        mimeType: 'text/markdown',
                        source: text
                    });
                }
            });
            event.preventDefault();
            break;
        }
    }
});

console.log('Markdown 与代码阅读器已加载 - 支持全局拖拽');
