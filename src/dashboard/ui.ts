/**
 * Lance logo SVG (embedded)
 */
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="40" height="40">
  <circle cx="100" cy="100" r="95" fill="#1a1a2e"/>
  <rect x="45" y="55" width="110" height="100" rx="15" ry="15" fill="#4a90d9"/>
  <line x1="100" y1="55" x2="100" y2="30" stroke="#4a90d9" stroke-width="6" stroke-linecap="round"/>
  <circle cx="100" cy="25" r="10" fill="#ff6b6b"/>
  <rect x="30" y="80" width="15" height="40" rx="5" ry="5" fill="#357abd"/>
  <rect x="155" y="80" width="15" height="40" rx="5" ry="5" fill="#357abd"/>
  <rect x="55" y="70" width="90" height="70" rx="10" ry="10" fill="#5ba3ec"/>
  <rect x="50" y="82" width="45" height="35" rx="8" ry="8" fill="none" stroke="#1a1a2e" stroke-width="6"/>
  <rect x="105" y="82" width="45" height="35" rx="8" ry="8" fill="none" stroke="#1a1a2e" stroke-width="6"/>
  <line x1="95" y1="100" x2="105" y2="100" stroke="#1a1a2e" stroke-width="6"/>
  <line x1="50" y1="95" x2="35" y2="90" stroke="#1a1a2e" stroke-width="5" stroke-linecap="round"/>
  <line x1="150" y1="95" x2="165" y2="90" stroke="#1a1a2e" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="62" cy="92" rx="8" ry="5" fill="rgba(255,255,255,0.3)"/>
  <ellipse cx="117" cy="92" rx="8" ry="5" fill="rgba(255,255,255,0.3)"/>
  <circle cx="72" cy="100" r="12" fill="#1a1a2e"/>
  <circle cx="128" cy="100" r="12" fill="#1a1a2e"/>
  <circle cx="75" cy="97" r="5" fill="#ffffff"/>
  <circle cx="131" cy="97" r="5" fill="#ffffff"/>
  <path d="M 75 130 Q 100 145 125 130" fill="none" stroke="#1a1a2e" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="60" cy="120" rx="8" ry="5" fill="rgba(255,107,107,0.4)"/>
  <ellipse cx="140" cy="120" rx="8" ry="5" fill="rgba(255,107,107,0.4)"/>
  <circle cx="55" cy="145" r="5" fill="#357abd"/>
  <circle cx="145" cy="145" r="5" fill="#357abd"/>
</svg>`;

/**
 * Favicon as base64 data URL
 */
const FAVICON_SVG = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="95" fill="#1a1a2e"/><rect x="45" y="55" width="110" height="100" rx="15" ry="15" fill="#4a90d9"/><line x1="100" y1="55" x2="100" y2="30" stroke="#4a90d9" stroke-width="6" stroke-linecap="round"/><circle cx="100" cy="25" r="10" fill="#ff6b6b"/><rect x="30" y="80" width="15" height="40" rx="5" ry="5" fill="#357abd"/><rect x="155" y="80" width="15" height="40" rx="5" ry="5" fill="#357abd"/><rect x="55" y="70" width="90" height="70" rx="10" ry="10" fill="#5ba3ec"/><rect x="50" y="82" width="45" height="35" rx="8" ry="8" fill="none" stroke="#1a1a2e" stroke-width="6"/><rect x="105" y="82" width="45" height="35" rx="8" ry="8" fill="none" stroke="#1a1a2e" stroke-width="6"/><line x1="95" y1="100" x2="105" y2="100" stroke="#1a1a2e" stroke-width="6"/><circle cx="72" cy="100" r="12" fill="#1a1a2e"/><circle cx="128" cy="100" r="12" fill="#1a1a2e"/><circle cx="75" cy="97" r="5" fill="#fff"/><circle cx="131" cy="97" r="5" fill="#fff"/><path d="M 75 130 Q 100 145 125 130" fill="none" stroke="#1a1a2e" stroke-width="4" stroke-linecap="round"/></svg>`)}`;

/**
 * Generate the dashboard HTML page.
 * This is a self-contained HTML page with embedded CSS and JavaScript.
 */
export function getDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>lance-context Dashboard</title>
  <link rel="icon" type="image/svg+xml" href="${FAVICON_SVG}">
  <style>
    :root {
      /* Light theme */
      --bg-primary-light: #ffffff;
      --bg-secondary-light: #f6f8fa;
      --bg-tertiary-light: #eaeef2;
      --border-color-light: #d0d7de;
      --text-primary-light: #1f2328;
      --text-secondary-light: #656d76;
      --text-muted-light: #8c959f;
      --accent-blue: #0969da;
      --accent-green: #1a7f37;
      --accent-yellow: #9a6700;
      --accent-red: #cf222e;
      --accent-purple: #8250df;

      /* Dark theme */
      --bg-primary-dark: #0d1117;
      --bg-secondary-dark: #161b22;
      --bg-tertiary-dark: #21262d;
      --border-color-dark: #30363d;
      --text-primary-dark: #e6edf3;
      --text-secondary-dark: #8b949e;
      --text-muted-dark: #6e7681;
      --accent-blue-dark: #58a6ff;
      --accent-green-dark: #3fb950;
      --accent-yellow-dark: #d29922;
      --accent-red-dark: #f85149;
      --accent-purple-dark: #a371f7;
    }

    [data-theme="dark"] {
      --bg-primary: var(--bg-primary-dark);
      --bg-secondary: var(--bg-secondary-dark);
      --bg-tertiary: var(--bg-tertiary-dark);
      --border-color: var(--border-color-dark);
      --text-primary: var(--text-primary-dark);
      --text-secondary: var(--text-secondary-dark);
      --text-muted: var(--text-muted-dark);
      --accent-blue: var(--accent-blue-dark);
      --accent-green: var(--accent-green-dark);
      --accent-yellow: var(--accent-yellow-dark);
      --accent-red: var(--accent-red-dark);
      --accent-purple: var(--accent-purple-dark);
    }

    [data-theme="light"] {
      --bg-primary: var(--bg-primary-light);
      --bg-secondary: var(--bg-secondary-light);
      --bg-tertiary: var(--bg-tertiary-light);
      --border-color: var(--border-color-light);
      --text-primary: var(--text-primary-light);
      --text-secondary: var(--text-secondary-light);
      --text-muted: var(--text-muted-light);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.5;
      min-height: 100vh;
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    h1 {
      font-size: 24px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo svg {
      width: 40px;
      height: 40px;
    }

    .theme-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background-color: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      cursor: pointer;
      color: var(--text-secondary);
      font-size: 14px;
      transition: all 0.2s ease;
    }

    .theme-toggle:hover {
      background-color: var(--bg-secondary);
      color: var(--text-primary);
    }

    .theme-toggle svg {
      width: 16px;
      height: 16px;
    }

    .sun-icon, .moon-icon {
      display: none;
    }

    [data-theme="dark"] .moon-icon {
      display: block;
    }

    [data-theme="light"] .sun-icon {
      display: block;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--text-secondary);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--accent-red);
    }

    .status-dot.connected {
      background-color: var(--accent-green);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }

    .card {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 20px;
      transition: background-color 0.3s ease, border-color 0.3s ease;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      font-size: 12px;
      font-weight: 500;
      border-radius: 12px;
      background-color: var(--bg-tertiary);
      color: var(--text-secondary);
    }

    .badge.success {
      background-color: rgba(63, 185, 80, 0.15);
      color: var(--accent-green);
    }

    .badge.warning {
      background-color: rgba(210, 153, 34, 0.15);
      color: var(--accent-yellow);
    }

    .badge.error {
      background-color: rgba(248, 81, 73, 0.15);
      color: var(--accent-red);
    }

    .stat {
      margin-bottom: 12px;
    }

    .stat:last-child {
      margin-bottom: 0;
    }

    .stat-label {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .stat-value.small {
      font-size: 14px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      color: var(--text-secondary);
    }

    .progress-container {
      margin-top: 16px;
      display: none;
    }

    .progress-container.active {
      display: block;
    }

    .progress-bar {
      height: 8px;
      background-color: var(--bg-tertiary);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent-blue), var(--accent-purple));
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .progress-text {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .patterns-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .pattern-tag {
      display: inline-block;
      padding: 2px 8px;
      font-size: 12px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      background-color: var(--bg-tertiary);
      border-radius: 4px;
      color: var(--text-secondary);
    }

    .pattern-tag.exclude {
      color: var(--accent-red);
      text-decoration: line-through;
      opacity: 0.7;
    }

    .card.full-width {
      grid-column: 1 / -1;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-secondary);
    }

    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .pulsing {
      animation: pulse 2s ease-in-out infinite;
    }

    /* Command Usage Chart Styles */
    .usage-chart {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .usage-bar-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .usage-bar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }

    .usage-bar-label {
      color: var(--text-secondary);
      font-weight: 500;
    }

    .usage-bar-count {
      color: var(--text-muted);
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    }

    .usage-bar-track {
      height: 24px;
      background-color: var(--bg-tertiary);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }

    .usage-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.5s ease;
      min-width: 2px;
    }

    .usage-bar-fill.search { background: linear-gradient(90deg, #58a6ff, #388bfd); }
    .usage-bar-fill.index { background: linear-gradient(90deg, #3fb950, #2ea043); }
    .usage-bar-fill.status { background: linear-gradient(90deg, #a371f7, #8957e5); }
    .usage-bar-fill.clear { background: linear-gradient(90deg, #f85149, #da3633); }
    .usage-bar-fill.instructions { background: linear-gradient(90deg, #d29922, #bb8009); }

    .usage-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid var(--border-color);
      margin-top: 4px;
    }

    .usage-total-label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .usage-total-count {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .usage-empty {
      text-align: center;
      padding: 20px;
      color: var(--text-muted);
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-left">
        <h1>
          <div class="logo">${LOGO_SVG}</div>
          lance-context
        </h1>
      </div>
      <div class="header-right">
        <button class="theme-toggle" id="themeToggle" title="Toggle theme">
          <svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          <span class="theme-label">Theme</span>
        </button>
        <div class="connection-status">
          <div class="status-dot" id="connectionDot"></div>
          <span id="connectionText">Connecting...</span>
        </div>
      </div>
    </header>

    <div class="grid">
      <!-- Index Status Card -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Index Status</span>
          <span class="badge" id="indexBadge">Loading...</span>
        </div>
        <div class="stat">
          <div class="stat-label">Files Indexed</div>
          <div class="stat-value" id="fileCount">-</div>
        </div>
        <div class="stat">
          <div class="stat-label">Total Chunks</div>
          <div class="stat-value" id="chunkCount">-</div>
        </div>
        <div class="stat">
          <div class="stat-label">Last Updated</div>
          <div class="stat-value small" id="lastUpdated">-</div>
        </div>
        <div class="progress-container" id="progressContainer">
          <div class="progress-bar">
            <div class="progress-fill" id="progressFill" style="width: 0%"></div>
          </div>
          <div class="progress-text" id="progressText">Initializing...</div>
        </div>
      </div>

      <!-- Embedding Backend Card -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Embedding Backend</span>
        </div>
        <div class="stat">
          <div class="stat-label">Backend</div>
          <div class="stat-value small" id="embeddingBackend">-</div>
        </div>
        <div class="stat">
          <div class="stat-label">Index Path</div>
          <div class="stat-value small" id="indexPath">-</div>
        </div>
      </div>

      <!-- Configuration Card -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Configuration</span>
        </div>
        <div class="stat">
          <div class="stat-label">Project Path</div>
          <div class="stat-value small" id="projectPath">-</div>
        </div>
        <div class="stat">
          <div class="stat-label">Chunk Size</div>
          <div class="stat-value small" id="chunkSize">-</div>
        </div>
        <div class="stat">
          <div class="stat-label">Search Weights</div>
          <div class="stat-value small" id="searchWeights">-</div>
        </div>
      </div>

      <!-- Patterns Card -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">File Patterns</span>
        </div>
        <div class="stat">
          <div class="stat-label">Include</div>
          <div class="patterns-list" id="includePatterns">
            <span class="pattern-tag">Loading...</span>
          </div>
        </div>
        <div class="stat" style="margin-top: 12px;">
          <div class="stat-label">Exclude</div>
          <div class="patterns-list" id="excludePatterns">
            <span class="pattern-tag exclude">Loading...</span>
          </div>
        </div>
      </div>

      <!-- Command Usage Card -->
      <div class="card full-width">
        <div class="card-header">
          <span class="card-title">Command Usage</span>
          <span class="badge" id="sessionBadge">This Session</span>
        </div>
        <div class="usage-chart" id="usageChart">
          <div class="usage-empty">No commands executed yet</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Theme management
    function getStoredTheme() {
      return localStorage.getItem('lance-context-theme') || 'dark';
    }

    function setTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('lance-context-theme', theme);
    }

    function toggleTheme() {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
    }

    // Initialize theme
    setTheme(getStoredTheme());

    // Theme toggle button
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // State
    let isConnected = false;
    let eventSource = null;

    // DOM elements
    const connectionDot = document.getElementById('connectionDot');
    const connectionText = document.getElementById('connectionText');
    const indexBadge = document.getElementById('indexBadge');
    const fileCount = document.getElementById('fileCount');
    const chunkCount = document.getElementById('chunkCount');
    const lastUpdated = document.getElementById('lastUpdated');
    const embeddingBackend = document.getElementById('embeddingBackend');
    const indexPath = document.getElementById('indexPath');
    const projectPath = document.getElementById('projectPath');
    const chunkSize = document.getElementById('chunkSize');
    const searchWeights = document.getElementById('searchWeights');
    const includePatterns = document.getElementById('includePatterns');
    const excludePatterns = document.getElementById('excludePatterns');
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    // Format date
    function formatDate(isoString) {
      if (!isoString) return 'Never';
      const date = new Date(isoString);
      return date.toLocaleString();
    }

    // Update connection status
    function setConnected(connected) {
      isConnected = connected;
      connectionDot.className = 'status-dot' + (connected ? ' connected' : '');
      connectionText.textContent = connected ? 'Connected' : 'Disconnected';
    }

    // Update index status
    function updateStatus(status) {
      if (status.indexed) {
        indexBadge.textContent = 'Indexed';
        indexBadge.className = 'badge success';
      } else {
        indexBadge.textContent = 'Not Indexed';
        indexBadge.className = 'badge warning';
      }

      if (status.isIndexing) {
        indexBadge.textContent = 'Indexing...';
        indexBadge.className = 'badge warning pulsing';
        progressContainer.className = 'progress-container active';
      } else {
        progressContainer.className = 'progress-container';
      }

      fileCount.textContent = status.fileCount.toLocaleString();
      chunkCount.textContent = status.chunkCount.toLocaleString();
      lastUpdated.textContent = formatDate(status.lastUpdated);
      embeddingBackend.textContent = status.embeddingBackend || 'Not configured';
      indexPath.textContent = status.indexPath || '-';
    }

    // Update config display
    function updateConfig(config) {
      projectPath.textContent = config.projectPath || '-';

      if (config.chunking) {
        chunkSize.textContent = config.chunking.maxLines + ' lines (overlap: ' + config.chunking.overlap + ')';
      }

      if (config.search) {
        searchWeights.textContent = 'Semantic: ' + (config.search.semanticWeight * 100) + '%, Keyword: ' + (config.search.keywordWeight * 100) + '%';
      }

      // Update patterns
      if (config.patterns) {
        includePatterns.innerHTML = config.patterns
          .slice(0, 10)
          .map(p => '<span class="pattern-tag">' + escapeHtml(p) + '</span>')
          .join('');
        if (config.patterns.length > 10) {
          includePatterns.innerHTML += '<span class="pattern-tag">+' + (config.patterns.length - 10) + ' more</span>';
        }
      }

      if (config.excludePatterns) {
        excludePatterns.innerHTML = config.excludePatterns
          .slice(0, 6)
          .map(p => '<span class="pattern-tag exclude">' + escapeHtml(p) + '</span>')
          .join('');
        if (config.excludePatterns.length > 6) {
          excludePatterns.innerHTML += '<span class="pattern-tag exclude">+' + (config.excludePatterns.length - 6) + ' more</span>';
        }
      }
    }

    // Update progress
    function updateProgress(progress) {
      const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
      progressFill.style.width = percent + '%';
      progressText.textContent = progress.message;
    }

    // Command bar CSS class mapping
    const commandBarClass = {
      'search_code': 'search',
      'index_codebase': 'index',
      'get_index_status': 'status',
      'clear_index': 'clear',
      'get_project_instructions': 'instructions'
    };

    // Update usage chart
    const usageChart = document.getElementById('usageChart');

    function updateUsage(data) {
      const { usage, total } = data;

      if (total === 0) {
        usageChart.innerHTML = '<div class="usage-empty">No commands executed yet</div>';
        return;
      }

      const maxCount = Math.max(...usage.map(u => u.count));

      let html = '';
      for (const item of usage) {
        const percent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
        const barClass = commandBarClass[item.command] || 'search';

        html += '<div class="usage-bar-container">';
        html += '<div class="usage-bar-header">';
        html += '<span class="usage-bar-label">' + escapeHtml(item.label) + '</span>';
        html += '<span class="usage-bar-count">' + item.count + '</span>';
        html += '</div>';
        html += '<div class="usage-bar-track">';
        html += '<div class="usage-bar-fill ' + barClass + '" style="width: ' + percent + '%"></div>';
        html += '</div>';
        html += '</div>';
      }

      html += '<div class="usage-total">';
      html += '<span class="usage-total-label">Total Commands</span>';
      html += '<span class="usage-total-count">' + total + '</span>';
      html += '</div>';

      usageChart.innerHTML = html;
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Fetch initial data
    async function fetchData() {
      try {
        const [statusRes, configRes, usageRes] = await Promise.all([
          fetch('/api/status'),
          fetch('/api/config'),
          fetch('/api/usage')
        ]);

        if (statusRes.ok) {
          const status = await statusRes.json();
          updateStatus(status);
        }

        if (configRes.ok) {
          const config = await configRes.json();
          updateConfig(config);
        }

        if (usageRes.ok) {
          const usage = await usageRes.json();
          updateUsage(usage);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    }

    // Connect to SSE
    function connectSSE() {
      if (eventSource) {
        eventSource.close();
      }

      eventSource = new EventSource('/api/events');

      eventSource.addEventListener('connected', (e) => {
        setConnected(true);
        fetchData();
      });

      eventSource.addEventListener('indexing:progress', (e) => {
        const progress = JSON.parse(e.data);
        progressContainer.className = 'progress-container active';
        indexBadge.textContent = 'Indexing...';
        indexBadge.className = 'badge warning pulsing';
        updateProgress(progress);
      });

      eventSource.addEventListener('indexing:start', () => {
        progressContainer.className = 'progress-container active';
        indexBadge.textContent = 'Indexing...';
        indexBadge.className = 'badge warning pulsing';
        progressFill.style.width = '0%';
        progressText.textContent = 'Starting...';
      });

      eventSource.addEventListener('indexing:complete', () => {
        progressContainer.className = 'progress-container';
        fetchData();
      });

      eventSource.addEventListener('status:change', (e) => {
        const status = JSON.parse(e.data);
        updateStatus(status);
      });

      eventSource.addEventListener('usage:update', (e) => {
        const usage = JSON.parse(e.data);
        // The event data is the usage array, need to compute total
        const total = usage.reduce((sum, u) => sum + u.count, 0);
        updateUsage({ usage, total });
      });

      eventSource.addEventListener('heartbeat', () => {
        // Just keep connection alive
      });

      eventSource.onerror = () => {
        setConnected(false);
        // EventSource will automatically reconnect
      };
    }

    // Initialize
    fetchData();
    connectSSE();
  </script>
</body>
</html>`;
}
