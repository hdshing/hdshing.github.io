// 获取 DOM 元素
const fileInput = document.getElementById('fileInput');
const urlInput = document.getElementById('urlInput');
const loadUrlBtn = document.getElementById('loadUrlBtn');
const contentDiv = document.getElementById('content');

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
        // 使用 marked.parse 将 Markdown 转换为 HTML
        const html = marked.parse(markdown);
        contentDiv.innerHTML = html;
        contentDiv.classList.add('show');

        // Markdown 内的围栏代码块也使用相同的语法高亮。
        if (window.hljs) {
            contentDiv.querySelectorAll('pre code').forEach((code) => {
                hljs.highlightElement(code);
            });
        }
    } catch (error) {
        showError('Markdown 解析失败: ' + error.message);
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
}

function renderFile(source, fileName, mimeType = '') {
    const extension = getExtension(fileName);
    contentDiv.classList.remove('code-mode');

    if (MARKDOWN_EXTENSIONS.has(extension) || (!extension && mimeType.includes('markdown'))) {
        renderMarkdown(source);
    } else {
        renderCode(source, getDisplayName(fileName), extension);
    }
}

/**
 * 显示错误信息
 * @param {string} message - 错误信息
 */
function showError(message) {
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
        renderFile(e.target.result, file.name, file.type);
    };

    reader.onerror = function() {
        showError('文件读取失败，请重试');
    };

    reader.readAsText(file);
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
        renderFile(content, finalUrl, contentType);

        // 清空 URL 输入框
        urlInput.value = '';
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
    const url = urlInput.value;
    loadFromUrl(url);
}

// 事件监听器
fileInput.addEventListener('change', handleFileUpload);
loadUrlBtn.addEventListener('click', handleUrlLoad);

// URL 输入框回车键支持
urlInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        handleUrlLoad();
    }
});

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

// 处理文件
function handleDropFile(file) {
    if (!isSupportedFile(file.name, file.type)) {
        showError('暂不支持该文件格式，请选择 Markdown、代码或纯文本文件');
        return;
    }
    
    showLoading();
    
    const reader = new FileReader();
    reader.onload = function(e) {
        renderFile(e.target.result, file.name, file.type);
    };
    reader.onerror = function() {
        showError('文件读取失败，请重试');
    };
    reader.readAsText(file);
}

// 全局拖拽事件 - 整个页面
document.addEventListener('dragenter', function(event) {
    preventDefault(event);
    dragCounter++;
    if (dragCounter === 1) {
        createDragOverlay().classList.add('show');
    }
});

document.addEventListener('dragover', function(event) {
    preventDefault(event);
});

document.addEventListener('dragleave', function(event) {
    preventDefault(event);
    dragCounter--;
    if (dragCounter === 0) {
        const overlay = document.getElementById('drag-overlay');
        if (overlay) overlay.classList.remove('show');
    }
});

document.addEventListener('drop', function(event) {
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
    const items = event.clipboardData?.items;
    if (items) {
        for (let i = 0; i < items.length; i++) {
            if (items[i].type === 'text/plain' || items[i].type === 'text/markdown') {
                items[i].getAsString(function(text) {
                    renderMarkdown(text);
                });
                event.preventDefault();
                break;
            }
        }
    }
});

console.log('Markdown 与代码阅读器已加载 - 支持全局拖拽');
