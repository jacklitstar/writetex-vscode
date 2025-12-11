import Bonjour from 'bonjour-service';
import * as os from 'os';
import * as vscode from 'vscode';

export interface MdnsHandle {
  stop: () => Promise<void>;
}

/**
 * Get the primary non-virtual network interface IP address
 * Prioritizes 10.x.x.x, then 192.168.x.x, then 172.16-31.x.x
 */
function getPrimaryNetworkAddress(): string | undefined {
  const interfaces = os.networkInterfaces();
  const candidates: { ip: string, priority: number }[] = [];

  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) { continue; }

    for (const addr of iface) {
      // Skip loopback, internal, and IPv6
      if (addr.internal || addr.family !== 'IPv4') { continue; }

      const ip = addr.address;

      // Prioritize based on common network ranges
      if (ip.startsWith('10.')) {
        candidates.push({ ip, priority: 1 }); // Highest priority
      } else if (ip.startsWith('192.168.')) {
        candidates.push({ ip, priority: 2 });
      } else if (ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
        candidates.push({ ip, priority: 3 });
      } else if (!ip.startsWith('169.254.')) {
        // Include other non-link-local addresses with low priority
        candidates.push({ ip, priority: 4 });
      }
    }
  }

  // Sort by priority and return the best candidate
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0]?.ip;
}

/**
 * Advertise WriteTex OCR service via mDNS on the local network
 * Service name: 'WriteTex VSCode'
 * Automatically detects and uses primary network interface
 */
export function advertise(port: number): MdnsHandle {
  const host = getPrimaryNetworkAddress();

  const instance = new Bonjour();

  const service = instance.publish({
    name: 'WriteTex VSCode',
    type: 'writetex-vscode',
    protocol: 'tcp',
    port,
    host, // Advertise this specific host
    txt: {
      fork: vscode.env.appName
    }
  });

  if (typeof (service as any).start === 'function') {
    (service as any).start();
  }

  console.log(`[mDNS] Advertising on ${host}:${port}`);

  return {
    stop: async () => new Promise(resolve => {
      const s: any = service;
      if (typeof s.stop === 'function') {
        s.stop(() => {
          instance.destroy();
          resolve();
        });
      } else {
        instance.destroy();
        resolve();
      }
    })
  };
}
