import { execSync } from 'node:child_process';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SERVICE_NAME = 'telespam';
const SYSTEMD_DIR = '/etc/systemd/system';
const SERVICE_PATH = join(SYSTEMD_DIR, `${SERVICE_NAME}.service`);

function generateServiceFile(): string {
  return `[Unit]
Description=Telespam anti-spam bot for Telegram
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${process.argv[1]}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
`;
}

function systemctl(args: string): void {
  try {
    execSync(`systemctl ${args}`, { stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
}

export function install(): void {
  // 写入系统级服务配置文件
  const serviceContent = generateServiceFile();
  try {
    writeFileSync(SERVICE_PATH, serviceContent, 'utf-8');
    console.log(`✓ Service file written: ${SERVICE_PATH}`);
  } catch (err) {
    console.error(
      `Failed to write service file to ${SERVICE_PATH}. Make sure to run with elevated privileges (e.g., sudo).`,
    );
    process.exit(1);
  }

  // Reload, enable, start
  systemctl('daemon-reload');
  systemctl(`enable --now ${SERVICE_NAME}`);

  console.log(`✓ Telespam systemd service installed and started`);
}

export function uninstall(): void {
  if (!existsSync(SERVICE_PATH)) {
    console.log('Telespam service is not installed.');
    return;
  }

  systemctl(`disable --now ${SERVICE_NAME}`);

  try {
    unlinkSync(SERVICE_PATH);
  } catch (err) {
    console.error(`Failed to delete service file at ${SERVICE_PATH}. Make sure to run with sudo.`);
    process.exit(1);
  }

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
    execSync(`journalctl -u ${SERVICE_NAME} -f`, { stdio: 'inherit' });
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
