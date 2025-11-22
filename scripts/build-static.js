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

async function copyDir(src, dest) {
    await ensureDir(dest);
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

async function scanIcons(dir, rootDir) {
    const items = await fs.readdir(dir, { withFileTypes: true });
    const results = [];

    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
        
        
        if (item.name.startsWith('.')) continue;

        if (item.isDirectory()) {
            
            const children = await scanIcons(fullPath, rootDir);
            results.push({
                type: 'folder',
                name: item.name,
                path: relativePath,
                children: children 
                
                
                
                
                
                
            });
            
            
            
            
            
            
            
            
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
    return results;
}

async function getAllItems(dir, rootDir) {
    let results = [];
    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

        if (item.name.startsWith('.')) continue;

        if (item.isDirectory()) {
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
    return results;
}

async function build() {
    console.log('🏗️  Starting static build...');

    
    await ensureDir(OUTPUT_DIR);
    console.log('✅ Created github directory');

    
    console.log('📂 Copying public assets...');
    await copyDir(PUBLIC_DIR, OUTPUT_DIR);
    console.log('✅ Assets copied');

    
    console.log('🔍 Scanning icons...');
    const allItems = await getAllItems(ICONS_DIR, ICONS_DIR);
    console.log(`✅ Found ${allItems.length} items`);

    
    await fs.writeFile(DATA_FILE, JSON.stringify(allItems, null, 2));
    console.log('✅ Wrote data.json');

    console.log('🎉 Build complete! Output in /github');
}

build().catch(console.error);
