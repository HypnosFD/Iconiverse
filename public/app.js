const FOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';

const VIEW_MODES = ["medium", "large", "compact"];
const LOCAL_STORAGE_KEY_THEME = "iconBrowserTheme";
const LOCAL_STORAGE_KEY_PATH = "iconBrowserPath";
const LOCAL_STORAGE_KEY_VIEW = "iconBrowserViewMode";
const VIRTUAL_ROOT_NAME = "icons";

class IconBrowser {
  constructor() {
    this.dom = {};
    this.state = {
      selectedIconData: null,
      currentPath: "",
      currentViewMode: "medium",
      allIconsInCurrentView: [],
      allFoldersInCurrentView: [],
      iconElementMap: new Map(),
      isGlobalSearchResults: false,
      selectedPaths: new Set(),
      isSelectionMode: false,
    };

    this.initDOM();
    this.loadStateFromLocalStorage();
    this.initEventListeners();

    this.renderPath();
    this.fetchIcons(this.state.currentPath);
  }





  initDOM() {
    this.dom.iconsContainer = document.getElementById("icons-container");
    this.dom.infoPanel = document.getElementById("info-panel");
    this.dom.svgPreviewContainer = this.dom.infoPanel?.querySelector("#svg-preview-container > svg");
    this.dom.iconNameDisplay = document.getElementById("icon-name");
    this.dom.backButton = document.getElementById("back-button");
    this.dom.currentPathDisplay = document.getElementById("current-path");
    this.dom.itemCountDisplay = document.getElementById("item-count-display");
    this.dom.searchInput = document.getElementById("search-input");
    this.dom.modeToggleBtn = document.getElementById("mode-toggle-btn");
    this.dom.viewModeToggleBtn = document.getElementById("view-mode-toggle-btn");
    this.dom.viewModeIndicator = document.getElementById("current-view-mode-indicator");

    this.dom.copyMenuBtn = document.getElementById("copy-menu-btn");
    this.dom.copyMenu = document.getElementById("copy-menu");
    this.dom.copySvgItem = document.getElementById("copy-svg-item");
    this.dom.copyJsxItem = document.getElementById("copy-jsx-item");

    this.dom.downloadMenuBtn = document.getElementById("download-menu-btn");
    this.dom.downloadMenu = document.getElementById("download-menu");
    this.dom.downloadSvgItem = document.getElementById("download-svg-item");
    this.dom.downloadJsxItem = document.getElementById("download-jsx-item");

    this.dom.closePanelBtn = document.getElementById("close-panel-btn");
    this.dom.loadingMessage = document.getElementById("loading-message");


    this.dom.selectAllBtn = document.getElementById("select-all-btn");
    this.dom.clearSelectionBtn = document.getElementById("clear-selection-btn");
    this.dom.batchDownloadBtn = document.getElementById("batch-download-btn");
    this.dom.batchCount = document.getElementById("batch-count");
  }

  loadStateFromLocalStorage() {

    const savedTheme = localStorage.getItem(LOCAL_STORAGE_KEY_THEME);
    const body = document.body;
    if (savedTheme) {
      body.classList.add(savedTheme);
      if (savedTheme === "dark-mode") body.classList.remove("light-mode");
      else body.classList.remove("dark-mode");
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      body.classList.add("dark-mode");
      body.classList.remove("light-mode");
    } else {
      body.classList.add("light-mode");
      body.classList.remove("dark-mode");
    }
    this.updateThemeIcon();


    const savedViewMode = localStorage.getItem(LOCAL_STORAGE_KEY_VIEW);
    if (savedViewMode && VIEW_MODES.includes(savedViewMode)) {
      this.state.currentViewMode = savedViewMode;
    }
    this.applyViewMode(this.state.currentViewMode);


    const savedPath = localStorage.getItem(LOCAL_STORAGE_KEY_PATH);
    if (savedPath) {
      this.state.currentPath = savedPath;
    }
  }

  initEventListeners() {
    if (this.dom.modeToggleBtn)
      this.dom.modeToggleBtn.addEventListener("click", () => this.toggleTheme());

    if (this.dom.viewModeToggleBtn)
      this.dom.viewModeToggleBtn.addEventListener("click", () => this.toggleViewMode());

    if (this.dom.searchInput) {
      let debounceTimeout;
      this.dom.searchInput.addEventListener("input", (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          this.handleSearch(e.target.value);
        }, 300);
      });
    }

    if (this.dom.backButton)
      this.dom.backButton.addEventListener("click", () => this.goToParentFolder());


    this.setupDropdown(this.dom.copyMenuBtn, this.dom.copyMenu);
    this.setupDropdown(this.dom.downloadMenuBtn, this.dom.downloadMenu);


    if (this.dom.copySvgItem)
      this.dom.copySvgItem.addEventListener("click", (e) => {
        e.stopPropagation();
        this.closeAllDropdowns();
        if (this.state.selectedIconData)
          this.copyToClipboard(this.state.selectedIconData.svgContent, this.dom.copyMenuBtn, "SVG Copied");
      });

    if (this.dom.copyJsxItem)
      this.dom.copyJsxItem.addEventListener("click", (e) => {
        e.stopPropagation();
        this.closeAllDropdowns();
        if (this.state.selectedIconData)
          this.copyJSX(this.state.selectedIconData.name, this.state.selectedIconData.svgContent);
      });


    if (this.dom.downloadSvgItem)
      this.dom.downloadSvgItem.addEventListener("click", (e) => {
        e.stopPropagation();
        this.closeAllDropdowns();
        if (this.state.selectedIconData)
          this.downloadSVG(this.state.selectedIconData.name, this.state.selectedIconData.svgContent);
      });

    if (this.dom.downloadJsxItem)
      this.dom.downloadJsxItem.addEventListener("click", (e) => {
        e.stopPropagation();
        this.closeAllDropdowns();
        if (this.state.selectedIconData)
          this.downloadJSX(this.state.selectedIconData.name, this.state.selectedIconData.svgContent);
      });

    if (this.dom.closePanelBtn)
      this.dom.closePanelBtn.addEventListener("click", () => this.closeInfoPanel());


    this.dom.selectAllBtn?.addEventListener("click", () => this.selectAll());
    this.dom.clearSelectionBtn?.addEventListener("click", () => this.clearSelection());
    this.dom.batchDownloadBtn?.addEventListener("click", () => this.downloadBatch());


    document.addEventListener("keydown", (e) => {

      if (e.key === "Escape" && this.state.selectedPaths.size > 0) {
        this.clearSelection();
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        // Select all if there are any items (icons or folders)
        const hasItems = this.state.allIconsInCurrentView.length > 0 || 
                         this.state.allFoldersInCurrentView.length > 0;
        if (hasItems) {
          e.preventDefault();
          this.selectAll();
        }
      }
    });


    document.addEventListener("mouseup", (e) => {

      if (e.button === 3) {

        e.preventDefault();
        this.goToParentFolder();
      } else if (e.button === 4) {

        e.preventDefault();
      }
    });


    if (this.dom.currentPathDisplay)
      this.dom.currentPathDisplay.addEventListener("click", (e) => {
        if (e.target.classList.contains("path-link")) {
          e.preventDefault();
          const path = e.target.getAttribute("data-path-segment");
          this.goToFolder(path);
        }
      });
  }





  createIconElement(item) {
    const isFolder = item.type === "folder";
    const el = document.createElement("div");
    el.className = "icon-item";
    el.setAttribute("data-name", item.name);
    el.setAttribute("data-type", item.type);

    const isFilled = item.type === "icon" && item.path.includes("filled/");
    if (isFilled) el.classList.add("is-filled-icon");

    const svgWrapper = document.createElement("div");
    svgWrapper.className = "icon-svg-wrapper";
    svgWrapper.innerHTML = isFolder ? FOLDER_SVG : item.svgContent;

    const nameEl = document.createElement("small");
    nameEl.textContent = item.name;

    el.appendChild(svgWrapper);
    el.appendChild(nameEl);

    el.addEventListener("click", (e) => {
      // Ctrl+Click: Select both icons and folders
      if (e.ctrlKey || e.metaKey) {
        this.toggleSelection(item.path);
      } else if (isFolder) {
        // Regular click on folder: Navigate
        this.goToFolder(item.path);
      } else {
        // Regular click on icon: Open info panel
        this.selectIcon(item, el);
      }
    });


    if (this.state.selectedPaths.has(item.path)) {
      el.classList.add("batch-selected");
    }


    if (!this.state.isSelectionMode && this.state.selectedIconData && this.state.selectedIconData.path === item.path) {
      el.classList.add("selected");
    }

    return el;
  }

  renderIcons() {
    if (!this.dom.iconsContainer || !this.dom.itemCountDisplay) return;

    const allItems = [...this.state.allFoldersInCurrentView, ...this.state.allIconsInCurrentView];
    this.dom.iconsContainer.innerHTML = "";
    this.state.iconElementMap.clear();

    if (allItems.length === 0) {
      this.dom.iconsContainer.innerHTML = '<div class="status-message no-items-message">No items found in this folder.</div>';
      this.dom.itemCountDisplay.textContent = "0 items";
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const item of allItems) {
      const el = this.createIconElement(item);
      this.state.iconElementMap.set(item.name, el);
      fragment.appendChild(el);
    }
    this.dom.iconsContainer.appendChild(fragment);
    this.dom.itemCountDisplay.textContent = `${allItems.length} items`;
  }

  renderPath() {
    if (!this.dom.currentPathDisplay || !this.dom.backButton) return;
    this.dom.currentPathDisplay.innerHTML = "";

    const sanitizedPath = this.state.currentPath.replace(/^\/|\/$/g, "");
    const pathSegments = sanitizedPath.split("/").filter((s) => s.length > 0);
    let pathAccumulator = "";

    const rootLink = document.createElement("a");
    rootLink.className = "path-link";
    rootLink.textContent = VIRTUAL_ROOT_NAME;
    rootLink.href = "#";
    rootLink.setAttribute("data-path-segment", "");
    this.dom.currentPathDisplay.appendChild(rootLink);

    pathSegments.forEach((segment, index) => {
      this.dom.currentPathDisplay.innerHTML += '<span class="path-separator"> / </span>';
      pathAccumulator = index === 0 ? segment : `${pathAccumulator}/${segment}`;
      if (index < pathSegments.length - 1) {
        const link = document.createElement("a");
        link.className = "path-link";
        link.textContent = segment;
        link.href = "#";
        link.setAttribute("data-path-segment", pathAccumulator);
        this.dom.currentPathDisplay.appendChild(link);
      } else {
        const current = document.createElement("span");
        current.className = "path-segment";
        current.textContent = segment;
        this.dom.currentPathDisplay.appendChild(current);
      }
    });

    if (sanitizedPath === "") {
      this.dom.backButton.classList.add("hidden");
    } else {
      this.dom.backButton.classList.remove("hidden");
    }
  }





  goToFolder(newPath) {

    this.closeInfoPanel();
    const sanitizedPath = newPath.replace(/^\/|\/$/g, "");
    this.state.currentPath = sanitizedPath;
    localStorage.setItem(LOCAL_STORAGE_KEY_PATH, this.state.currentPath);
    this.renderPath();
    this.fetchIcons(this.state.currentPath);
  }

  goToParentFolder() {
    if (this.state.currentPath === "") return;

    this.closeInfoPanel();
    const parts = this.state.currentPath.split("/");
    parts.pop();
    const newPath = parts.join("/");
    this.state.currentPath = newPath;
    localStorage.setItem(LOCAL_STORAGE_KEY_PATH, this.state.currentPath);
    this.renderPath();
    this.fetchIcons(this.state.currentPath);
  }

  async fetchIcons(path) {
    if (!this.dom.iconsContainer || !this.dom.loadingMessage) return;

    this.dom.iconsContainer.innerHTML = "";
    this.dom.loadingMessage.classList.remove("hidden");
    this.dom.itemCountDisplay.textContent = "Loading...";

    try {
      console.log(`Frontend Fetch: /api/content?path=${path}`);
      const response = await fetch(`/api/content?path=${path}`);
      if (!response.ok) throw new Error(`Server returned status ${response.status}`);

      const data = await response.json();
      console.log("Frontend Received Data:", data);
      this.state.allFoldersInCurrentView = data.filter((item) => item.type === "folder");
      this.state.allIconsInCurrentView = data.filter((item) => item.type === "icon");

      this.dom.loadingMessage.classList.add("hidden");
      this.renderIcons();
    } catch (error) {
      console.error("Error fetching icons:", error);
      this.dom.loadingMessage.classList.add("hidden");
      this.dom.iconsContainer.innerHTML = `<div class="status-message error-message">Error loading content: ${error.message}</div>`;
      this.dom.itemCountDisplay.textContent = "Error";
      this.state.allFoldersInCurrentView = [];
      this.state.allIconsInCurrentView = [];
    }
  }





  async handleSearch(searchTerm) {
    const term = searchTerm;
    if (term.length === 0) {
      if (this.state.isGlobalSearchResults) {
        this.state.isGlobalSearchResults = false;
        this.fetchIcons(this.state.currentPath);
      } else {
        this.filterIcons("");
      }
      return;
    }

    if (this.state.currentPath === "" && term.trim().length > 0) {
      await this.performGlobalSearch(term.trim());
    } else {
      this.filterIcons(term.trim());
    }
  }

  async performGlobalSearch(term) {
    if (!this.dom.iconsContainer || !this.dom.loadingMessage) return;
    this.dom.iconsContainer.innerHTML = "";
    this.dom.loadingMessage.classList.remove("hidden");
    this.dom.itemCountDisplay.textContent = "Searching...";

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
      if (!response.ok) throw new Error("Search failed");
      const results = await response.json();

      this.state.allFoldersInCurrentView = [];
      this.state.allIconsInCurrentView = results;
      this.state.isGlobalSearchResults = true;

      this.dom.loadingMessage.classList.add("hidden");
      this.renderIcons();
    } catch (err) {
      console.error(err);
      this.dom.loadingMessage.classList.add("hidden");
      this.dom.iconsContainer.innerHTML = '<div class="status-message error-message">Search failed.</div>';
    }
  }

  filterIcons(term) {
    const lowerTerm = term.toLowerCase();
    this.state.iconElementMap.forEach((el, name) => {
      if (name.toLowerCase().includes(lowerTerm)) {
        el.style.display = "";
      } else {
        el.style.display = "none";
      }
    });
  }





  toggleSelection(path) {
    if (this.state.selectedPaths.has(path)) {
      this.state.selectedPaths.delete(path);
    } else {
      this.state.selectedPaths.add(path);
    }
    this.updateBatchUI();
    this.renderIcons();
  }

  selectAll() {
    // Select all icons
    this.state.allIconsInCurrentView.forEach(icon => {
      this.state.selectedPaths.add(icon.path);
    });
    // Select all folders
    this.state.allFoldersInCurrentView.forEach(folder => {
      this.state.selectedPaths.add(folder.path);
    });
    this.updateBatchUI();
    this.renderIcons();
  }

  clearSelection() {
    this.state.selectedPaths.clear();
    this.updateBatchUI();
    this.renderIcons();
  }

  updateBatchUI() {
    const count = this.state.selectedPaths.size;
    const hasItems = this.state.allIconsInCurrentView.length > 0 || 
                     this.state.allFoldersInCurrentView.length > 0;

    if (this.dom.batchCount) this.dom.batchCount.textContent = count;

    // Download button - show when items selected
    if (this.dom.batchDownloadBtn) {
      this.dom.batchDownloadBtn.disabled = count === 0;
      if (count > 0) {
        this.dom.batchDownloadBtn.classList.remove("hidden");
      } else {
        this.dom.batchDownloadBtn.classList.add("hidden");
      }
    }

    // Select All button - show when there are icons or folders
    if (this.dom.selectAllBtn) {
      if (hasItems) {
        this.dom.selectAllBtn.classList.remove("hidden");
        // Disable if all selected
        const totalItems = this.state.allIconsInCurrentView.length + 
                           this.state.allFoldersInCurrentView.length;
        this.dom.selectAllBtn.disabled = (count >= totalItems);
      } else {
        this.dom.selectAllBtn.classList.add("hidden");
      }
    }

    // Clear Selection button - show when items selected
    if (this.dom.clearSelectionBtn) {
      if (count > 0) {
        this.dom.clearSelectionBtn.classList.remove("hidden");
      } else {
        this.dom.clearSelectionBtn.classList.add("hidden");
      }
    }
  }

  async downloadBatch() {
    if (this.state.selectedPaths.size === 0) return;
    const paths = Array.from(this.state.selectedPaths);
    this.dom.batchDownloadBtn.textContent = "Zipping...";

    try {
      const response = await fetch("/api/download-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths }),
      });

      if (!response.ok) throw new Error("Batch download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "icons.zip";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      this.dom.batchDownloadBtn.innerHTML = `Download Selected (<span id="batch-count">${this.state.selectedPaths.size}</span>)`;
      this.dom.batchCount = document.getElementById("batch-count");
    } catch (err) {
      console.error(err);
      alert("Failed to download batch.");
      this.dom.batchDownloadBtn.innerHTML = `Download Selected (<span id="batch-count">${this.state.selectedPaths.size}</span>)`;
      this.dom.batchCount = document.getElementById("batch-count");
    }
  }





  // =================================================================
  // F. UI Actions (Theme, View, Panel, Copy, Download)
  // =================================================================

  toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains("dark-mode");
    if (isDark) {
      body.classList.remove("dark-mode");
      body.classList.add("light-mode");
      localStorage.setItem(LOCAL_STORAGE_KEY_THEME, "light-mode");
    } else {
      body.classList.remove("light-mode");
      body.classList.add("dark-mode");
      localStorage.setItem(LOCAL_STORAGE_KEY_THEME, "dark-mode");
    }
    this.updateThemeIcon();
  }

  updateThemeIcon() {
    const isDark = document.body.classList.contains("dark-mode");
    const btn = this.dom.modeToggleBtn;
    if (!btn) return;
    if (isDark) {
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
      btn.setAttribute("aria-label", "Switch to light mode");
    } else {
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
      btn.setAttribute("aria-label", "Switch to dark mode");
    }
  }

  toggleViewMode() {
    const currentIndex = VIEW_MODES.indexOf(this.state.currentViewMode);
    const nextIndex = (currentIndex + 1) % VIEW_MODES.length;
    this.state.currentViewMode = VIEW_MODES[nextIndex];
    localStorage.setItem(LOCAL_STORAGE_KEY_VIEW, this.state.currentViewMode);
    this.applyViewMode(this.state.currentViewMode);
  }

  applyViewMode(mode) {
    if (!this.dom.iconsContainer) return;
    this.dom.iconsContainer.classList.remove(...VIEW_MODES.map((m) => `view-mode-${m}`));
    this.dom.iconsContainer.classList.add(`view-mode-${mode}`);
    if (this.dom.viewModeIndicator) {
      this.dom.viewModeIndicator.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
    }
  }

  setupDropdown(btn, menu) {
    if (!btn || !menu) return;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isActive = menu.classList.contains("active");
      this.closeAllDropdowns();
      if (!isActive) {
        menu.classList.add("active");
        btn.classList.add("active");
      }
    });
  }

  closeAllDropdowns() {
    document.querySelectorAll(".dropdown-menu").forEach((m) => m.classList.remove("active"));
    document.querySelectorAll(".dropdown-toggle").forEach((b) => b.classList.remove("active"));
  }

  selectIcon(iconData, element) {
    if (this.state.selectedIconData && this.state.selectedIconData.name === iconData.name) {
      // Already selected, just open panel
    } else {
      if (this.dom.iconsContainer) {
        const prevSelected = this.dom.iconsContainer.querySelector(".icon-item.selected");
        if (prevSelected) prevSelected.classList.remove("selected");
      }
      element.classList.add("selected");
      this.state.selectedIconData = iconData;
    }
    this.openInfoPanel(element, iconData);
  }

  openInfoPanel(element, iconData) {
    if (!this.dom.infoPanel) return;
    this.updateInfoPanel(iconData);
    this.dom.infoPanel.classList.add("active");
  }

  closeInfoPanel() {
    if (this.dom.infoPanel) this.dom.infoPanel.classList.remove("active");
    if (this.dom.iconsContainer) {
      const selected = this.dom.iconsContainer.querySelector(".icon-item.selected");
      if (selected) selected.classList.remove("selected");
    }
    this.state.selectedIconData = null;
  }

  updateInfoPanel(data) {
    if (this.dom.iconNameDisplay) this.dom.iconNameDisplay.textContent = data.name;
    if (this.dom.svgPreviewContainer) {
      this.dom.svgPreviewContainer.innerHTML = data.svgContent;

      // Add filled icon class if applicable
      const isFilled = data.path && data.path.includes('filled/');
      const previewSection = this.dom.svgPreviewContainer.closest('.preview-section');
      if (previewSection) {
        if (isFilled) {
          previewSection.classList.add('is-filled-icon');
        } else {
          previewSection.classList.remove('is-filled-icon');
        }
      }

      // Extract SVG attributes from the content
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(data.svgContent, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');

      if (svgElement) {
        const viewBox = svgElement.getAttribute('viewBox') || 'Not specified';
        const width = svgElement.getAttribute('width') || 'Not specified';
        const height = svgElement.getAttribute('height') || 'Not specified';

        // Update detail spans
        const viewBoxSpan = document.getElementById('viewbox-value');
        const widthSpan = document.getElementById('width-value');
        const heightSpan = document.getElementById('height-value');

        if (viewBoxSpan) viewBoxSpan.textContent = viewBox;
        if (widthSpan) widthSpan.textContent = width;
        if (heightSpan) heightSpan.textContent = height;
      }
    }
  }

  copyToClipboard(text, triggerBtn, successMsg) {
    navigator.clipboard.writeText(text).then(() => {
      // Store original HTML
      const originalHTML = triggerBtn.innerHTML;

      // Success icon SVG
      const successIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" stroke-width="2"><path d="m12 15 2 2 4-4"/><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;

      // Change to success icon with Copied! text
      triggerBtn.innerHTML = successIcon + '<span style="margin-left: 6px;">Copied!</span>';
      triggerBtn.classList.add("success");

      setTimeout(() => {
        triggerBtn.innerHTML = originalHTML;
        triggerBtn.classList.remove("success");
      }, 2000);
    });
  }

  copyJSX(name, svgContent) {
    const jsx = this.generateJSX(name, svgContent);
    this.copyToClipboard(jsx, this.dom.copyMenuBtn, "JSX Copied!");
  }

  downloadSVG(name, content) {
    const blob = new Blob([content], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  downloadJSX(name, svgContent) {
    const jsx = this.generateJSX(name, svgContent);
    const blob = new Blob([jsx], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.jsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  generateJSX(name, svgContent) {
    const componentName = name
      .replace(/[^a-zA-Z0-9]/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");

    let jsxContent = svgContent
      .replace(/class=/g, "className=")
      .replace(/fill-rule=/g, "fillRule=")
      .replace(/clip-rule=/g, "clipRule=")
      .replace(/stroke-width=/g, "strokeWidth=")
      .replace(/stroke-linecap=/g, "strokeLinecap=")
      .replace(/stroke-linejoin=/g, "strokeLinejoin=")
      .replace(/xmlns:xlink=/g, "xmlnsXlink=")
      .replace(/xlink:href=/g, "xlinkHref=");

    // Remove xmlns
    jsxContent = jsxContent.replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, "");

    return `import React from 'react';

const ${componentName} = (props) => (
  ${jsxContent.replace("<svg", "<svg {...props}")}
);

export default ${componentName};`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new IconBrowser();
});
