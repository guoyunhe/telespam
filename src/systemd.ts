import { execSync } from 'node:child_process';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SERVICE_NAME = 'telespam';
const SYSTEMD_DIR = join(homedir(), '.config', 'systemd', 'user');
const SERVICE_PATH = join(SYSTEMD_DIR, `${SERVICE_NAME}.service`);

function generateServiceFile(workDir: string): string {
  return `[Unit]
Description=Telespam anti-spam bot for Telegram
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${process.execPath} ${process.argv[1]}
WorkingDirectory=${workDir}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
`;
}

function systemctl(args: string): void {
  try {
    execSync(`systemctl --user ${args}`, { stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
}

export function install(): void {
  const configPath = join(homedir(), '.config', 'telespam.json');

  if (!existsSync(configPath)) {
    console.error(`No telespam.json found at ${configPath}`);
    console.error('Create ~/.config/telespam.json first, then run "telespam install" again.');
    process.exit(1);
  }

  // Create systemd user directory if needed
  execSync(`mkdir -p "${SYSTEMD_DIR}"`);

  // Write service file
  const serviceContent = generateServiceFile(homedir());
  writeFileSync(SERVICE_PATH, serviceContent, 'utf-8');
  console.log(`✓ Service file written: ${SERVICE_PATH}`);

  // Reload, enable, start
  systemctl('daemon-reload');
  systemctl(`enable ${SERVICE_NAME}`);
  systemctl(`start ${SERVICE_NAME}`);

  console.log(`✓ Telespam systemd service installed and started`);
  console.log(`  Config: ${configPath}`);
  console.log(`  Status: systemctl --user status ${SERVICE_NAME}`);
  console.log(`  Logs:   journalctl --user -u ${SERVICE_NAME} -f`);
}

export function uninstall(): void {
  if (!existsSync(SERVICE_PATH)) {
    console.log('Telespam service is not installed.');
    return;
  }

  systemctl(`stop ${SERVICE_NAME}`);
  systemctl(`disable ${SERVICE_NAME}`);
  unlinkSync(SERVICE_PATH);
  systemctl('daemon-reload');

  console.log('✓ Telespam systemd service uninstalled');
}

export function restart(): void {
  if (!existsSync(SERVICE_PATH)) {
    console.log('Telespam service is not installed.');
    return;
  }
  systemctl(`restart ${SERVICE_NAME}`);
  console.log('✓ Telespam systemd service restarted');
}

export function logs(): void {
  try {
    execSync(`journalctl --user -u ${SERVICE_NAME} -f`, { stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
}

export function status(): void {
  if (!existsSync(SERVICE_PATH)) {
    console.log('Telespam service is not installed.');
    return;
  }
  systemctl(`status ${SERVICE_NAME}`);
}
