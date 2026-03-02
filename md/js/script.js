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

// 拖拽上传支持
const dropZone = document.querySelector('.input-section');

dropZone.addEventListener('dragover', function(event) {
    event.preventDefault();
    event.stopPropagation();
    this.style.borderColor = 'var(--primary-color)';
    this.style.background = 'rgba(74, 144, 217, 0.05)';
});

dropZone.addEventListener('dragleave', function(event) {
    event.preventDefault();
    event.stopPropagation();
    this.style.borderColor = '';
    this.style.background = '';
});

dropZone.addEventListener('drop', function(event) {
    event.preventDefault();
    event.stopPropagation();
    this.style.borderColor = '';
    this.style.background = '';

    const files = event.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        handleFileUpload({ target: fileInput });
    }
});

console.log('Markdown 阅读器已加载');
