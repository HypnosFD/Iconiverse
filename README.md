# Iconiverse - SVG Icon Viewer

A modern, elegant SVG icon browser with dual deployment options: local server or static GitHub Pages.

## Features

- 🎨 **Beautiful UI**: Modern glassmorphism design with dark/light themes
- 📁 **Folder Navigation**: Browse icons organized in folders
- 🔍 **Global Search**: Search across all icons instantly
- 📦 **Batch Download**: Select multiple icons or entire folders and download as ZIP
- 🎯 **File Explorer Selection**: Ctrl+Click to select multiple items
- 📱 **Responsive**: Works on desktop and mobile devices
- 🌐 **Dual Deployment**: Run locally with Node.js or deploy to GitHub Pages

---

## Quick Start

### Adding Icons
- Place your SVG files in the `icons` folder
- Organize them in subfolders as needed
- **Filled Icons**: If you have filled icons (solid style) that are not outlined, place them in a folder named `filled` (e.g., `icons/filled/my-icon.svg`). This ensures they are displayed correctly with the appropriate styles.

### Dependencies
The project requires the following Node.js packages:
```bash
npm install express adm-zip open
```
These are automatically installed when you run `Setup.bat`.

3. **Run the Server**
   - Double-click `RunServer.bat`, or
   - Run manually: `node server.js`
   - The browser will open automatically at `http://localhost:3000`

### Option 2: Static GitHub Pages

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Add Your Icons**
   - Place your SVG files in the `icons` folder

3. **Generate Static Data**
   - Double-click `UpdateData.bat`, or
   - Run manually: `node scripts/build-static.js`
   - This creates/updates `github/data.json`

4. **Deploy**
   - Push the `github` folder to your GitHub repository
   - Enable GitHub Pages pointing to the `github` folder
   - Or host the `github` folder on any static hosting service

---

## Project Structure

```
SVG Viewer/
├── icons/                  # Your SVG icons go here
│   ├── folder1/
│   │   └── icon1.svg
│   └── folder2/
│       └── icon2.svg
├── public/                 # Local server assets
│   ├── app.js             # Client-side logic (local)
│   ├── style.css          # Styles
│   └── index.html         # HTML template
├── github/                 # Static build output (GitHub Pages)
│   ├── app.js             # Client-side logic (static)
│   ├── style.css          # Styles (copy of public)
│   ├── index.html         # HTML (copy of public)
│   └── data.json          # Pre-generated icon data
├── scripts/
│   └── build-static.js    # Generates data.json
├── server.js              # Express server for local development
├── RunServer.bat          # Start local server (Windows)
├── UpdateData.bat         # Update data.json (Windows)
└── package.json           # Node.js dependencies
```

---

## Usage

### Browsing Icons
- Click folders to navigate
- Click the back button or breadcrumb to go up
- Use the search bar for global search

### Selecting Icons
- **Single Selection**: Click an icon to view details
- **Multi-Selection**: Ctrl+Click (Cmd+Click on Mac) to select multiple
- **Select All**: Click "Select All" to select all items in current view
- **Select Folders**: You can select entire folders for batch download

### Downloading
- **Single Icon**: Click an icon, then use the download button in the info panel
- **Batch Download**: Select multiple icons/folders, then click "Download Selected"
  - Local version: Creates ZIP on server
  - Static version: Shows alert (client-side ZIP not yet implemented)

### Theme Toggle
- Click the sun/moon icon in the header to switch between light and dark modes

---

## Updating Icons

### For Local Server
1. Add/remove SVG files in the `icons` folder
2. Refresh the browser - changes are reflected immediately

### For GitHub Pages
1. Add/remove SVG files in the `icons` folder
2. Run `UpdateData.bat` (or `node scripts/build-static.js`)
3. Commit and push the updated `github/data.json` to your repository
4. GitHub Pages will update automatically

---

## Development

### Local Server Features
- **Hot Reload**: Changes to icons are reflected on refresh
- **Server-Side Search**: Recursive search across all folders
- **Server-Side ZIP**: Batch downloads create ZIP files on the server
- **Folder Downloads**: Recursively includes all SVG files from selected folders

### Static Version Features
- **Pre-generated Data**: All icon data is in `data.json`
- **Client-Side Filtering**: Fast navigation and search
- **No Server Required**: Can be hosted anywhere
- **Folder Selection**: Can select folders, but download requires client-side implementation

---

## Requirements

- **Node.js** 14+ (for running the server or building static data)
- **Modern Browser** (Chrome, Firefox, Safari, Edge)

---

## Customization

### Changing Colors
Edit CSS variables in `public/style.css` and `github/style.css`:
```css
:root {
  --color-accent: #ff6b6b;        /* Primary accent color */
  --color-bg-primary: #f4f6f9;    /* Background color */
  /* ... more variables */
}
```

### Adding Features
- **Local version**: Modify `public/app.js` and `server.js`
- **Static version**: Modify `github/app.js`
- Keep both versions in sync for consistent UX

---

## Troubleshooting

### Server won't start
- Check if port 3000 is available
- The server will automatically try a random port if 3000 is busy
- Make sure Node.js is installed: `node --version`

### Icons not showing
- **Local**: Check that SVG files are in the `icons` folder
- **Static**: Run `UpdateData.bat` to regenerate `data.json`

### Select All button disappears
- This has been fixed in the latest version
- Make sure you're using the updated `github/app.js`

---

## License

This project is provided as-is for personal and commercial use.

---

## Credits

Built with:
- Express.js (local server)
- AdmZip (server-side ZIP creation)
- Modern vanilla JavaScript (no frameworks!)
- CSS3 with glassmorphism effects

---

## Support

For issues or questions, please check the code comments or create an issue in the repository.
