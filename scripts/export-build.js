#!/usr/bin/env node
/**
 * export-build.js — copies the dist/ build output to exports/build/
 */
const fs   = require("fs");
const path = require("path");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Error: ${src} does not exist. Run "npm run build" first.`);
    process.exit(1);
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
}

console.log("Copying build to exports/build/...");
fs.rmSync("exports/build", { recursive: true, force: true });
copyDir("dist", "exports/build");
console.log("Done. exports/build/ is ready to deploy.");
