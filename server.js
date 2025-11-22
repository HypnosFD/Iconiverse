
const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const AdmZip = require("adm-zip");


const openModule = require('open');
const openBrowser = openModule.default || openModule;

const app = express();
app.use(express.json());

const INITIAL_PORT = 3000;
const PORT_FILE = path.join(__dirname, '.svg_viewer_port');
const ICONS_DIR = path.join(__dirname, "icons");
console.log("Server ICONS_DIR:", ICONS_DIR);
const PUBLIC_DIR = path.join(__dirname, "public");





/**
 * Reads the last saved port from file, defaults to INITIAL_PORT.
 * @returns {Promise<number>}
 */
async function getPreferredPort() {
  try {
    const port = await fs.readFile(PORT_FILE, 'utf8');
    const portNumber = parseInt(port.trim());
    if (portNumber > 1024) {
      return portNumber;
    }
  } catch (e) {

  }
  return INITIAL_PORT;
}

/**
 * Saves the successfully used port to file.
 * @param {number} port - The port number to save.
 */
async function saveUsedPort(port) {
  try {
    await fs.writeFile(PORT_FILE, port.toString(), 'utf8');
  } catch (e) {
    console.error('Failed to save port to file:', e);
  }
}





/**
 * Helper: Recursive search for icons
 */
async function searchIcons(dir, query, rootDir) {
  let results = [];
  try {
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        results = results.concat(await searchIcons(fullPath, query, rootDir));
      } else if (
        item.name.toLowerCase().includes(query.toLowerCase()) &&
        path.extname(item.name).toLowerCase() === ".svg"
      ) {
        const relativePath = path
          .relative(rootDir, fullPath)
          .replace(/\\/g, "/");
        const content = await fs.readFile(fullPath, "utf8");
        const iconNameWithoutExt = item.name.slice(
          0,
          -path.extname(item.name).length
        );

        results.push({
          type: "icon",
          name: iconNameWithoutExt,
          path: relativePath,
          svgContent: content.trim(),
        });
      }
    }
  } catch (err) {
    console.error(`Error searching in ${dir}:`, err);
  }
  return results;
}





app.use(express.static(PUBLIC_DIR));

/**
 * API for Recursive Search
 */
app.get("/api/search", async (req, res) => {
  const query = req.query.q || "";
  if (!query) {
    return res.json([]);
  }

  try {
    const results = await searchIcons(ICONS_DIR, query, ICONS_DIR);
    res.json(results);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Failed to perform search" });
  }
});

/**
 * API for Batch Download (ZIP)
 */
app.post("/api/download-batch", async (req, res) => {
  const { paths } = req.body;
  if (!paths || !Array.isArray(paths) || paths.length === 0) {
    return res.status(400).json({ error: "No paths provided" });
  }

  try {
    const zip = new AdmZip();


    async function addDirectoryToZip(dirPath, zipPath = "") {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        const zipFilePath = zipPath ? path.join(zipPath, item.name) : item.name;

        if (item.isDirectory()) {
          await addDirectoryToZip(fullPath, zipFilePath);
        } else if (path.extname(item.name).toLowerCase() === ".svg") {
          const content = await fs.readFile(fullPath);
          zip.addFile(zipFilePath, content);
        }
      }
    }

    for (const relativePath of paths) {
      const fullPath = path.join(ICONS_DIR, relativePath);

      if (!fullPath.startsWith(ICONS_DIR)) continue;

      try {
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {

          const folderName = path.basename(relativePath);
          await addDirectoryToZip(fullPath, folderName);
        } else {

          const content = await fs.readFile(fullPath);
          zip.addFile(path.basename(relativePath), content);
        }
      } catch (err) {
        console.error(`Failed to add ${relativePath} to zip:`, err);
      }
    }

    const zipBuffer = zip.toBuffer();
    res.set("Content-Type", "application/zip");
    res.set("Content-Disposition", 'attachment; filename="icons.zip"');
    res.set("Content-Length", zipBuffer.length);
    res.send(zipBuffer);
  } catch (err) {
    console.error("Batch download error:", err);
    res.status(500).json({ error: "Failed to create zip file" });
  }
});

/**
 * API برای دریافت محتوای محتوا
 */
app.get("/api/content", async (req, res) => {
  const relativePath = req.query.path || "";
  console.log(`API Request: /api/content?path=${relativePath}`);
  const fullPath = path.join(ICONS_DIR, relativePath);

  const relative = path.relative(ICONS_DIR, fullPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return res.status(403).json({ error: "Access denied. Invalid path." });
  }

  try {
    await fs.access(fullPath);
  } catch (err) {
    return res.status(404).json({ error: "Directory or file not found." });
  }

  try {
    const items = await fs.readdir(fullPath, { withFileTypes: true });
    const results = [];

    for (const item of items) {
      const itemName = item.name;
      const itemPath = path.join(fullPath, itemName);
      const relativeItemPath = path
        .join(relativePath, itemName)
        .replace(/\\/g, "/");

      if (itemName.startsWith(".")) continue;

      if (item.isDirectory()) {
        results.push({ type: "folder", name: itemName, path: relativeItemPath });
      } else if (path.extname(itemName).toLowerCase() === ".svg") {
        const content = await fs.readFile(itemPath, "utf8");
        const iconNameWithoutExt = itemName.slice(0, -path.extname(itemName).length);

        results.push({ type: "icon", name: iconNameWithoutExt, path: relativeItemPath, svgContent: content.trim() });
      }
    }

    results.sort((a, b) => {
      if (a.type === "folder" && b.type === "icon") return -1;
      if (a.type === "icon" && b.type === "folder") return 1;
      return a.name.localeCompare(b.name);
    });

    res.json(results);
  } catch (err) {
    console.error(`Error reading directory ${fullPath}:`, err);
    res.status(500).json({ error: "Failed to read directory content" });
  }
});






/**
 * Function to start the server, trying the preferred port first, then port 0.
 * @param {number} portToTry - The port number to attempt (saved port or 0).
 * @param {boolean} isFirstAttempt - Flag to know if this is the first attempt (true) or a retry (false).
 */
function startServer(portToTry, isFirstAttempt = true) {
  const server = app.listen(portToTry, async () => {


    const serverAddress = server.address();
    if (!serverAddress || typeof serverAddress === 'string') {
      server.close();
      return;
    }

    const actualPort = serverAddress.port;
    const address = `http://localhost:${actualPort}`;

    console.log(`\n====================================================== `);
    console.log(`  🚀 SVG Icon Viewer Server running at: ${address} `);
    console.log(`====================================================== `);


    await saveUsedPort(actualPort);

    await openBrowser(address);
  });


  if (isFirstAttempt) {
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${portToTry} is busy.Switching to a random available port...`);


        server.close(() => startServer(0, false));
      } else {
        console.error('Server failed to start:', err);
      }
    });
  } else {

    server.on('error', (err) => {
      console.error('Server failed to start on random port:', err);
    });
  }
}


(async () => {
  const preferredPort = await getPreferredPort();
  console.log(`Initial attempt on port: ${preferredPort}`);
  startServer(preferredPort, true);
})();
