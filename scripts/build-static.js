const fs = require('fs').promises;
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../icons');
const PUBLIC_DIR = path.join(__dirname, '../public');
const OUTPUT_DIR = path.join(__dirname, '../github');
const DATA_FILE = path.join(OUTPUT_DIR, 'data.json');

async function ensureDir(dir) {
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

async function getAllItems(dir, rootDir) {
    let results = [];
    try {
        const items = await fs.readdir(dir, { withFileTypes: true });

        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            // Force forward slashes for consistency
            const relativePath = path.relative(rootDir, fullPath).split(path.sep).join('/');

            if (item.name.startsWith('.')) continue;

            if (item.isDirectory()) {
                console.log(`📁 Found folder: ${relativePath}`);
                results.push({
                    type: 'folder',
                    name: item.name,
                    path: relativePath
                });
                
                const children = await getAllItems(fullPath, rootDir);
                results = results.concat(children);
            } else if (path.extname(item.name).toLowerCase() === '.svg') {
                const content = await fs.readFile(fullPath, 'utf8');
                const iconName = item.name.slice(0, -4);
                results.push({
                    type: 'icon',
                    name: iconName,
                    path: relativePath,
                    svgContent: content.trim()
                });
            }
        }
    } catch (err) {
        console.error(`❌ Error scanning directory ${dir}:`, err);
    }
    return results;
}

/**
 * Read the static app.js template and replace placeholders
 */
async function generateStaticAppJS() {
    console.log('🔧 Generating static app.js from public/app.js...');
    
    // Read public/app.js
    let appJS = await fs.readFile(path.join(PUBLIC_DIR, 'app.js'), 'utf8');
    
    // Strategy: Use regex to find and replace entire methods
    
    // 1. Add allData property to constructor
    appJS = appJS.replace(
        /(isSelectionMode: false,\s*\};)/,
        '$1\n    this.allData = []; // Store all icon data from data.json'
    );
    
    // 2. Replace constructor's fetchIcons call
    appJS = appJS.replace(
        /this\.fetchIcons\(this\.state\.currentPath\);/,
        'this.loadDataAndInit();'
    );
    
    // 3. Replace fetchIcons method with loadDataAndInit + filterByPath
    const fetchIconsRegex = /async fetchIcons\(path\) \{[\s\S]*?\n  \}/;
    const newMethods = `async loadDataAndInit() {
    if (!this.dom.iconsContainer || !this.dom.loadingMessage) return;

    this.dom.iconsContainer.innerHTML = "";
    this.dom.loadingMessage.classList.remove("hidden");
    this.dom.itemCountDisplay.textContent = "Loading...";

    try {
      const response = await fetch('data.json');
      if (!response.ok) throw new Error(\`Failed to load data.json: \${response.status}\`);
      
      this.allData = await response.json();
      console.log('Loaded icon data:', this.allData.length, 'items');
      
      this.dom.loadingMessage.classList.add("hidden");
      this.filterByPath(this.state.currentPath);
    } catch (error) {
      console.error("Error loading data:", error);
      this.dom.loadingMessage.classList.add("hidden");
      this.dom.iconsContainer.innerHTML = \`<div class="status-message error-message">Error loading content: \${error.message}</div>\`;
      this.dom.itemCountDisplay.textContent = "Error";
    }
  }

  filterByPath(path) {
    const sanitizedPath = path.replace(/^\\/|\\/$/g, "");
    
    if (sanitizedPath === "") {
      const topLevelFolders = new Set();
      this.allData.forEach(item => {
        if (item.path && !item.path.includes('/')) {
          if (item.type === 'folder') {
            topLevelFolders.add(item.name);
          }
        } else if (item.path && item.path.includes('/')) {
          const firstFolder = item.path.split('/')[0];
          topLevelFolders.add(firstFolder);
        }
      });
      
      this.state.allFoldersInCurrentView = Array.from(topLevelFolders).map(name => ({
        type: 'folder',
        name: name,
        path: name
      }));
      this.state.allIconsInCurrentView = [];
    } else {
      const pathPrefix = sanitizedPath + '/';
      const subFolders = new Set();
      const icons = [];
      
      this.allData.forEach(item => {
        if (item.path === sanitizedPath && item.type === 'folder') {
          return;
        }
        
        if (item.path && item.path.startsWith(pathPrefix)) {
          const remainder = item.path.substring(pathPrefix.length);
          
          if (!remainder.includes('/')) {
            if (item.type === 'icon') {
              icons.push(item);
            } else if (item.type === 'folder') {
              subFolders.add(item.name);
            }
          } else {
            const nextFolder = remainder.split('/')[0];
            subFolders.add(nextFolder);
          }
        } else if (item.path && item.path === sanitizedPath && item.type === 'icon') {
          icons.push(item);
        }
      });
      
      this.state.allFoldersInCurrentView = Array.from(subFolders).map(name => ({
        type: 'folder',
        name: name,
        path: sanitizedPath + '/' + name
      }));
      this.state.allIconsInCurrentView = icons;
    }
    
    this.renderIcons();
  }`;
    
    appJS = appJS.replace(fetchIconsRegex, newMethods);
    
    // 4. Replace remaining fetchIcons calls with filterByPath
    appJS = appJS.replace(
        /this\.fetchIcons\(this\.state\.currentPath\);/g,
        'this.filterByPath(this.state.currentPath);'
    );
    
    // 5. Replace performGlobalSearch
    const searchRegex = /async performGlobalSearch\(term\) \{[\s\S]*?\n  \}/;
    const clientSearch = `async performGlobalSearch(term) {
    if (!this.dom.iconsContainer || !this.dom.loadingMessage) return;
    this.dom.iconsContainer.innerHTML = "";
    this.dom.loadingMessage.classList.remove("hidden");
    this.dom.itemCountDisplay.textContent = "Searching...";

    const lowerTerm = term.toLowerCase();
    const results = this.allData.filter(item => 
      item.type === 'icon' && item.name && item.name.toLowerCase().includes(lowerTerm)
    );

    this.state.allFoldersInCurrentView = [];
    this.state.allIconsInCurrentView = results;
    this.state.isGlobalSearchResults = true;

    this.dom.loadingMessage.classList.add("hidden");
    this.renderIcons();
  }`;
    
    appJS = appJS.replace(searchRegex, clientSearch);
    
    // 6. Replace downloadBatch - match the method with flexible whitespace
    const downloadRegex = /async downloadBatch\(\) \{[\s\S]*?\n  \}(?=\s*\n\s*\n)/;
    const jsZipDownload = `async downloadBatch() {
    if (this.state.selectedPaths.size === 0) return;
    const paths = Array.from(this.state.selectedPaths);
    this.dom.batchDownloadBtn.textContent = "Zipping...";

    try {
      if (typeof JSZip === 'undefined') {
        await this.loadJSZip();
      }

      const zip = new JSZip();

      paths.forEach(path => {
        // Check if it's an icon
        const item = this.allData.find(i => i.path === path && i.type === 'icon');
        if (item && item.svgContent) {
          zip.file(\`\${item.name}.svg\`, item.svgContent);
          return;
        }

        // Check if it's a folder
        const folderItem = this.allData.find(i => i.path === path && i.type === 'folder');
        if (folderItem) {
          const folderPrefix = path + '/';
          const iconsInFolder = this.allData.filter(i => i.type === 'icon' && i.path.startsWith(folderPrefix));
          
          iconsInFolder.forEach(icon => {
            // Use full path to preserve structure relative to root, or relative to folder?
            // User asked for "same shape". Usually implies preserving structure.
            // Since we are flattening the zip root (no svg/jsx folders), using the full path 
            // ensures unique names and structure.
            zip.file(icon.path, icon.svgContent);
          });
        }
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "icons.zip";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      this.dom.batchDownloadBtn.innerHTML = \`Download Selected (<span id="batch-count">\${this.state.selectedPaths.size}</span>)\`;
      this.dom.batchCount = document.getElementById("batch-count");
    } catch (err) {
      console.error(err);
      alert("Failed to download batch: " + err.message);
      this.dom.batchDownloadBtn.innerHTML = \`Download Selected (<span id="batch-count">\${this.state.selectedPaths.size}</span>)\`;
      this.dom.batchCount = document.getElementById("batch-count");
    }
  }

  loadJSZip() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }`;
    
    appJS = appJS.replace(downloadRegex, jsZipDownload);
    
    return appJS;
}

async function build() {
    console.log('🏗️  Starting static build...');

    // Create output directory
    await ensureDir(OUTPUT_DIR);
    console.log('✅ Created github directory');

    // Copy HTML and CSS
    console.log('📂 Copying index.html and style.css...');
    await fs.copyFile(
        path.join(PUBLIC_DIR, 'index.html'),
        path.join(OUTPUT_DIR, 'index.html')
    );
    await fs.copyFile(
        path.join(PUBLIC_DIR, 'style.css'),
        path.join(OUTPUT_DIR, 'style.css')
    );
    console.log('✅ Assets copied');

    // Generate static app.js
    const staticAppJS = await generateStaticAppJS();
    await fs.writeFile(
        path.join(OUTPUT_DIR, 'app.js'),
        staticAppJS,
        'utf8'
    );
    console.log('✅ Generated static app.js');

    // Scan icons
    console.log('🔍 Scanning icons...');
    const allItems = await getAllItems(ICONS_DIR, ICONS_DIR);
    
    // Generate summary
    const folderCount = allItems.filter(i => i.type === 'folder').length;
    const iconCount = allItems.filter(i => i.type === 'icon').length;
    const filledFolders = allItems.filter(i => i.type === 'folder' && (i.name === 'filled' || i.path.includes('/filled')));
    const outlineFolders = allItems.filter(i => i.type === 'folder' && (i.name === 'outline' || i.path.includes('/outline')));

    console.log(`✅ Scan Complete:`);
    console.log(`   - Total Items: ${allItems.length}`);
    console.log(`   - Folders: ${folderCount}`);
    console.log(`   - Icons: ${iconCount}`);
    console.log(`   - 'filled' folders detected: ${filledFolders.length}`);
    console.log(`   - 'outline' folders detected: ${outlineFolders.length}`);

    if (filledFolders.length === 0 && outlineFolders.length === 0) {
        console.warn('⚠️  WARNING: No filled/outline folders detected. Please check your folder structure.');
    }

    // Write data.json
    await fs.writeFile(DATA_FILE, JSON.stringify(allItems, null, 2));
    console.log('✅ Wrote data.json');

    console.log('🎉 Build complete! Output in /github');
}

build().catch(console.error);
