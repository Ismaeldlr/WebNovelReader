const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const SCRAPER_DIR = path.join(__dirname, '..', '..', '..', 'scraper');
const SCRAPER_ENTRYPOINT = path.join(SCRAPER_DIR, 'main.py');

let workerProcess = null;

function resolvePython() {
  if (process.env.SCRAPER_PYTHON) return process.env.SCRAPER_PYTHON;

  const candidates = process.platform === 'win32'
    ? [
        path.join(SCRAPER_DIR, '.venv', 'Scripts', 'python.exe'),
        path.join(SCRAPER_DIR, '.venv', 'bin', 'python'),
      ]
    : [
        path.join(SCRAPER_DIR, '.venv', 'bin', 'python'),
        path.join(SCRAPER_DIR, '.venv', 'Scripts', 'python.exe'),
      ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || 'python';
}

function isEnabled() {
  return String(process.env.SCRAPER_AUTOSTART || 'true').toLowerCase() !== 'false';
}

function ensureStarted() {
  if (!isEnabled()) return false;
  if (workerProcess && workerProcess.exitCode === null && !workerProcess.killed) return true;

  if (!fs.existsSync(SCRAPER_ENTRYPOINT)) {
    console.error(`[scraper] Entrypoint not found: ${SCRAPER_ENTRYPOINT}`);
    return false;
  }

  const python = resolvePython();
  try {
    workerProcess = spawn(python, [SCRAPER_ENTRYPOINT], {
      cwd: SCRAPER_DIR,
      env: process.env,
      stdio: 'inherit',
      windowsHide: true,
    });

    workerProcess.once('error', (error) => {
      console.error(`[scraper] Worker could not start: ${error.message}`);
      workerProcess = null;
    });

    workerProcess.once('exit', (code, signal) => {
      if (workerProcess?.exitCode === code) workerProcess = null;
      console.log(`[scraper] Worker stopped (${signal || `exit ${code}`}).`);
    });

    console.log(`[scraper] Worker started with ${python}.`);
    return true;
  } catch (error) {
    console.error(`[scraper] Worker could not start: ${error.message}`);
    workerProcess = null;
    return false;
  }
}

function stop() {
  if (!workerProcess || workerProcess.exitCode !== null) return;
  workerProcess.kill();
  workerProcess = null;
}

module.exports = { ensureStarted, stop };
