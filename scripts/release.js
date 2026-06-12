#!/usr/bin/env node
/**
 * Release script for Educom
 * Handles version bumping and creating Git tags
 *
 * Usage:
 *   node scripts/release.js           # Bump patch version (1.0.0 -> 1.0.1)
 *   node scripts/release.js minor     # Bump minor version (1.0.0 -> 1.1.0)
 *   node scripts/release.js major     # Bump major version (1.0.0 -> 2.0.0)
 *   node scripts/release.js 1.2.3     # Set specific version
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const bumpType = args[0];

// Get current version from tauri.conf.json
function getCurrentVersion() {
  const configPath = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return config.version;
}

// Parse version string to components
function parseVersion(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return { major, minor, patch };
}

// Format version back to string
function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

// Bump version based on type
function bumpVersion(current, type) {
  const v = parseVersion(current);

  switch (type) {
    case 'major':
      v.major++;
      v.minor = 0;
      v.patch = 0;
      break;
    case 'minor':
      v.minor++;
      v.patch = 0;
      break;
    case 'patch':
    case undefined:
      v.patch++;
      break;
    default:
      // Assume it's a specific version
      if (/^\d+\.\d+\.\d+$/.test(type)) {
        return type;
      }
      console.error(`Unknown bump type: ${type}`);
      process.exit(1);
  }

  return formatVersion(v);
}

// Update version in tauri.conf.json
function updateVersion(newVersion) {
  const configPath = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  config.version = newVersion;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

// Run git commands
function gitCommit(message) {
  execSync(`git add -A`, { stdio: 'inherit' });
  execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
}

function gitTag(version) {
  execSync(`git tag -a v${version} -m "Release v${version}"`, { stdio: 'inherit' });
}

function gitPush() {
  execSync(`git push origin main --tags`, { stdio: 'inherit' });
}

// Main
function main() {
  const currentVersion = getCurrentVersion();
  console.log(`Current version: ${currentVersion}`);

  const newVersion = bumpVersion(currentVersion, bumpType);
  console.log(`New version: ${newVersion}`);

  // Verify with user
  if (args.length === 0) {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question(`Bump ${currentVersion} -> ${newVersion}? (y/n) `, (answer) => {
      readline.close();
      if (answer.toLowerCase() !== 'y') {
        console.log('Aborted');
        process.exit(0);
      }
      proceed(newVersion);
    });
  } else {
    proceed(newVersion);
  }
}

function proceed(newVersion) {
  updateVersion(newVersion);
  console.log('Updated tauri.conf.json');

  gitCommit(`Bump version to ${newVersion}`);
  gitTag(newVersion);

  console.log(`
Version ${newVersion} ready!

To create the release:
1. Push the tag: git push origin v${newVersion}
2. The GitHub Actions workflow will automatically build and create the release

To cancel and redo:
  git tag -d v${newVersion}
  git reset --soft HEAD~1
`);
}

main();