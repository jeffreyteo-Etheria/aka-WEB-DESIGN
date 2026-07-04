#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(root, 'backups', timestamp);
const sources = [
  { src: path.join(root, 'dist'), dest: path.join(backupDir, 'dist') },
  { src: path.join(root, 'public'), dest: path.join(backupDir, 'public') },
  { src: path.join(root, 'src', '_data'), dest: path.join(backupDir, 'src', '_data') },
];

fs.mkdirSync(backupDir, { recursive: true });
for (const { src, dest } of sources) {
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
}

console.log(`Backup created at ${backupDir}`);
