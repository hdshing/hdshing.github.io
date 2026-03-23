// 获取 DOM 元素
const fileInput = document.getElementById('fileInput');
const urlInput = document.getElementById('urlInput');
const loadUrlBtn = document.getElementById('loadUrlBtn');
const contentDiv = document.getElementById('content');

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
    } catch (error) {
        showError('Markdown 解析失败: ' + error.message);
    }
}

/**
 * 显示错误信息
 * @param {string} message - 错误信息
 */
function showError(message) {
    contentDiv.innerHTML = `<div class="error-message">${message}</div>`;
    contentDiv.classList.add('show');
}

/**
 * 显示加载状态
 */
function showLoading() {
    contentDiv.innerHTML = '<div class="loading">正在加载...</div>';
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

    // 检查文件类型
    const validTypes = [
        'text/markdown',
        'text/x-markdown',
        'text/plain',
        '' // 有些 .md 文件可能没有 MIME 类型
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith('.md') && !file.name.endsWith('.markdown')) {
        showError('请上传有效的 Markdown 文件 (.md, .markdown, .txt)');
        return;
    }

    showLoading();

    // 使用 FileReader 读取文件内容
    const reader = new FileReader();

    reader.onload = function(e) {
        const content = e.target.result;
        renderMarkdown(content);
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
        renderMarkdown(content);

        // 清空 URL 输入框
        urlInput.value = '';
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            showError('无法获取文件。可能的原因：<br>1. URL 无效或文件不存在<br>2. 目标服务器禁止跨域访问 (CORS)<br>3. 网络连接问题');
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
            <h2>释放以打开 Markdown 文件</h2>
            <p>支持 .md, .markdown, .txt 格式</p>
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
    const validTypes = [
        'text/markdown',
        'text/x-markdown',
        'text/plain',
        ''
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.md') && !file.name.endsWith('.markdown') && !file.name.endsWith('.txt')) {
        showError('请上传有效的 Markdown 文件 (.md, .markdown, .txt)');
        return;
    }
    
    showLoading();
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        renderMarkdown(content);
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

console.log('Markdown 阅读器已加载 - 支持全局拖拽');
