import multicastDns from 'multicast-dns';
import Bonjour from 'bonjour-service';
import * as os from 'os';
import * as vscode from 'vscode';

export interface MdnsHandle {
  stop: () => Promise<void>;
}

/**
 * Get all active IPv4 addresses from network interfaces
 */
function getActiveIPv4Addresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const name in interfaces) {
    const iface = interfaces[name];
    if (!iface) {
      continue;
    }

    for (const addr of iface) {
      // Only IPv4, not internal/loopback
      if (addr.family === 'IPv4' && !addr.internal) {
        addresses.push(addr.address);
      }
    }
  }

  return addresses;
}

/**
 * Advertise WriteTex OCR service via mDNS on the local network
 * 
 * Uses platform-specific implementation:
 * - macOS: bonjour-service (native Bonjour, iOS compatible)
 * - Windows: multicast-dns (explicit interface binding)
 */
export function advertise(port: number): MdnsHandle {
  const isMac = process.platform === 'darwin';

  if (isMac) {
    return advertiseMac(port);
  } else {
    return advertiseWindows(port);
  }
}

/**
 * macOS implementation using bonjour-service
 * Native Bonjour for perfect iOS compatibility
 */
function advertiseMac(port: number): MdnsHandle {
  const instance = new Bonjour();
  const hostname = os.hostname();
  const serviceName = `WriteTex VSCode @ ${hostname}`;

  const service = instance.publish({
    name: serviceName,
    type: 'writetex-vscode',
    protocol: 'tcp',
    port,
    txt: {
      fork: vscode.env.appName
    }
  });

  // Start if method exists
  if (typeof (service as any).start === 'function') {
    (service as any).start();
  }

  console.log(`[mDNS] macOS Bonjour advertising: ${serviceName} on port ${port}`);

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

/**
 * Windows implementation using multicast-dns
 * Explicit interface binding for reliability
 */
function advertiseWindows(port: number): MdnsHandle {
  const hostname = os.hostname();
  const serviceName = `WriteTex VSCode @ ${hostname}`;
  const serviceType = '_writetex-vscode._tcp.local';
  const fqdn = `${hostname}.local`;

  const mdnsInstances: any[] = [];
  const addresses = getActiveIPv4Addresses();

  if (addresses.length === 0) {
    console.warn('[mDNS] No active IPv4 interfaces found, using default binding');
    try {
      const mdns = multicastDns({ interface: '0.0.0.0' });
      mdnsInstances.push(mdns);
      setupMdnsResponder(mdns, serviceName, serviceType, fqdn, port);
    } catch (e: any) {
      console.error('[mDNS] Failed to bind to 0.0.0.0:', e);
    }
  } else {
    console.log(`[mDNS] Windows binding to ${addresses.length} network interface(s):`, addresses);

    for (const addr of addresses) {
      try {
        const mdns = multicastDns({ interface: addr });
        mdnsInstances.push(mdns);
        setupMdnsResponder(mdns, serviceName, serviceType, fqdn, port, addr);
        console.log(`[mDNS] Bound to interface: ${addr}`);
      } catch (err) {
        console.error(`[mDNS] Failed to bind to interface ${addr}:`, err);
      }
    }
  }

  console.log(`[mDNS] Advertising service: ${serviceName} on port ${port}`);

  return {
    stop: async () => {
      for (const mdns of mdnsInstances) {
        try {
          mdns.destroy();
        } catch (err) {
          console.error('[mDNS] Error destroying instance:', err);
        }
      }
    }
  };
}

/**
 * Setup mDNS responder for Windows multicast-dns
 */
function setupMdnsResponder(
  mdns: any,
  serviceName: string,
  serviceType: string,
  fqdn: string,
  port: number,
  boundAddress?: string
): void {
  const serviceInstanceName = `${serviceName}.${serviceType}`;

  mdns.on('query', (query: any) => {
    const responses: any[] = [];

    for (const question of query.questions || []) {
      // Respond to service type queries (PTR)
      if (question.name === serviceType && question.type === 'PTR') {
        responses.push({
          name: serviceType,
          type: 'PTR',
          ttl: 120,
          data: serviceInstanceName
        });
      }

      // Respond to service instance queries (SRV, TXT)
      if (question.name === serviceInstanceName) {
        if (question.type === 'SRV' || question.type === 'ANY') {
          responses.push({
            name: serviceInstanceName,
            type: 'SRV',
            ttl: 120,
            data: {
              priority: 0,
              weight: 0,
              port: port,
              target: fqdn
            }
          });
        }

        if (question.type === 'TXT' || question.type === 'ANY') {
          responses.push({
            name: serviceInstanceName,
            type: 'TXT',
            ttl: 120,
            data: Buffer.from(`fork=${vscode.env.appName}`)
          });
        }
      }

      // Respond to hostname queries (A)
      if (question.name === fqdn && (question.type === 'A' || question.type === 'ANY')) {
        const addresses = boundAddress ? [boundAddress] : getActiveIPv4Addresses();
        for (const addr of addresses) {
          responses.push({
            name: fqdn,
            type: 'A',
            ttl: 120,
            data: addr
          });
        }
      }
    }

    if (responses.length > 0) {
      mdns.respond(responses);
    }
  });

  // Proactively announce our service
  const announceService = () => {
    const addresses = boundAddress ? [boundAddress] : getActiveIPv4Addresses();
    const announcements = [
      {
        name: serviceType,
        type: 'PTR',
        ttl: 120,
        data: serviceInstanceName
      },
      {
        name: serviceInstanceName,
        type: 'SRV',
        ttl: 120,
        data: {
          priority: 0,
          weight: 0,
          port: port,
          target: fqdn
        }
      },
      {
        name: serviceInstanceName,
        type: 'TXT',
        ttl: 120,
        data: Buffer.from(`fork=${vscode.env.appName}`)
      }
    ];

    // Add A records for all interfaces
    for (const addr of addresses) {
      announcements.push({
        name: fqdn,
        type: 'A',
        ttl: 120,
        data: addr
      });
    }

    mdns.respond(announcements);
  };

  // Announce immediately and periodically
  announceService();
  const announceInterval = setInterval(announceService, 60000); // Every 60 seconds

  // Clean up interval on destroy
  const originalDestroy = mdns.destroy.bind(mdns);
  mdns.destroy = () => {
    clearInterval(announceInterval);
    originalDestroy();
  };
}