import { spawn } from 'node:child_process';
import http from 'node:http';

const port = process.env.PORT || 3000;
const testArgs = process.argv.slice(2);

function isServerAlive(targetPort) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${targetPort}/`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(targetPort, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerAlive(targetPort)) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

async function main() {
  const alreadyRunning = await isServerAlive(port);
  let serverProcess = null;

  if (!alreadyRunning) {
    serverProcess = spawn(
      process.execPath,
      ['./node_modules/tsx/dist/cli.mjs', 'server.ts'],
      {
        env: { ...process.env, PORT: String(port) },
        stdio: 'pipe',
      }
    );

    const ready = await waitForServer(port);
    if (!ready) {
      console.error('Failed to start test server within timeout.');
      if (serverProcess) {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t']);
        } else {
          serverProcess.kill();
        }
      }
      process.exit(1);
    }
  }

  const testRunner = spawn(process.execPath, testArgs, {
    stdio: 'inherit',
    env: { ...process.env, BASE_URL: `http://127.0.0.1:${port}` },
  });

  testRunner.on('exit', (code) => {
    if (serverProcess) {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t']);
      } else {
        serverProcess.kill('SIGTERM');
      }
    }
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
