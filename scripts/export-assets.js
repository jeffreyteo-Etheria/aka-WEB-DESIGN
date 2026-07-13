#!/usr/bin/env node
/**
 * export-assets.js — copies images, videos, and fonts from public/ to exports/assets/
 */
const fs   = require("fs");
const path = require("path");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`  skip (not found): ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src,  entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  console.log(`  copied: ${src} → ${dest}`);
}

console.log("Exporting assets...");
copyDir("public/images", "exports/assets/images");
copyDir("public/videos", "exports/assets/videos");
copyDir("public/fonts",  "exports/assets/fonts");
console.log("Done.");
