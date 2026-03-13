const fs = require("fs");
const path = require("path");

const logoPath = path.join(__dirname, "..", "public", "images", "logo.png");
const electronDir = path.join(__dirname, "..", "electron");
const iconPath = path.join(electronDir, "icon.png");

if (!fs.existsSync(logoPath)) {
  console.warn("Logo not found at public/images/logo.png, skipping icon build");
  process.exit(0);
}

// Copy logo to electron folder as icon.png (for Linux, Mac)
fs.copyFileSync(logoPath, iconPath);
console.log("Copied logo to electron/icon.png");

// Generate .ico for Windows - resize to 256x256 first (to-ico needs standard sizes)
(async () => {
  try {
    const sharp = require("sharp");
    const toIco = require("to-ico");
    const resized = await sharp(fs.readFileSync(logoPath))
      .resize(256, 256)
      .png()
      .toBuffer();
    const icoBuffer = await toIco([resized]);
    fs.writeFileSync(path.join(electronDir, "icon.ico"), icoBuffer);
    console.log("Generated electron/icon.ico for Windows");
  } catch (err) {
    console.warn("Could not generate .ico:", err.message);
  }
})();
