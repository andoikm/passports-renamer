import { spawn } from 'node:child_process';

function run(cmd, args) {
  const child = spawn(cmd, args, {
    stdio: 'inherit',
    shell: true,
  });
  return child;
}

const backendPort = process.env.BACKEND_PORT || process.env.PORT || '4000';
const backendUrl = `http://localhost:${backendPort}`;

const clientEnv = {
  ...process.env,
  VITE_BACKEND_URL: backendUrl,
};

const backendEnv = {
  ...process.env,
  PORT: backendPort,
};

const client = spawn('npm', ['-w', 'client', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: clientEnv,
});

const backend = spawn('npm', ['-w', 'backend', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: backendEnv,
});

function shutdown(signal = 'SIGINT') {
  client.kill(signal);
  backend.kill(signal);
}

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());

client.on('exit', (code) => {
  if (code && code !== 0) shutdown();
});

backend.on('exit', (code) => {
  if (code && code !== 0) shutdown();
});

