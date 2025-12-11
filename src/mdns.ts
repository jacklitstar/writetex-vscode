import multicastDns from 'multicast-dns';
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
 * Service name: 'WriteTex VSCode'
 * 
 * On Windows, creates separate mDNS instances for each network interface
 * to ensure proper multicast binding. On Mac/Linux, uses a single instance.
 */
export function advertise(port: number): MdnsHandle {
  const hostname = os.hostname();
  const serviceName = `WriteTex VSCode @ ${hostname}`;
  const serviceType = '_writetex-vscode._tcp.local';
  const fqdn = `${hostname}.local`;

  const mdnsInstances: any[] = [];
  const isWindows = process.platform === 'win32';

  // On Windows, bind to each interface explicitly for reliability
  // On Mac/Linux, use default binding (works fine without explicit interface)
  if (isWindows) {
    const addresses = getActiveIPv4Addresses();

    if (addresses.length === 0) {
      console.warn('[mDNS] No active IPv4 interfaces found, using default binding');
      const mdns = multicastDns({ interface: '0.0.0.0' });
      mdnsInstances.push(mdns);
      setupMdnsResponder(mdns, serviceName, serviceType, fqdn, port);
    } else {
      console.log(`[mDNS] Binding to ${addresses.length} network interface(s) on Windows:`, addresses);

      for (const addr of addresses) {
        try {
          const mdns = multicastDns({ interface: addr });
          mdnsInstances.push(mdns);
          setupMdnsResponder(mdns, serviceName, serviceType, fqdn, port);
          console.log(`[mDNS] Bound to interface: ${addr}`);
        } catch (err) {
          console.error(`[mDNS] Failed to bind to interface ${addr}:`, err);
        }
      }
    }
  } else {
    // Mac/Linux: single instance with default binding
    const mdns = multicastDns();
    mdnsInstances.push(mdns);
    setupMdnsResponder(mdns, serviceName, serviceType, fqdn, port);
    console.log('[mDNS] Started with default binding (Mac/Linux)');
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
 * Setup mDNS responder to answer queries for our service
 */
function setupMdnsResponder(
  mdns: any,
  serviceName: string,
  serviceType: string,
  fqdn: string,
  port: number
): void {
  const serviceInstanceName = `${serviceName}.${serviceType}`;

  mdns.on('query', (query: any) => {
    const answers: any[] = [];
    const additionals: any[] = [];

    for (const question of query.questions || []) {
      // Respond to service type queries (PTR)
      if (question.name === serviceType && question.type === 'PTR') {
        answers.push({
          name: serviceType,
          type: 'PTR',
          ttl: 120,
          data: serviceInstanceName
        });

        // Include SRV, TXT, and A records as additionals for complete resolution
        additionals.push({
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

        additionals.push({
          name: serviceInstanceName,
          type: 'TXT',
          ttl: 120,
          data: {
            fork: vscode.env.appName
          }
        });

        const addresses = getActiveIPv4Addresses();
        for (const addr of addresses) {
          additionals.push({
            name: fqdn,
            type: 'A',
            ttl: 120,
            data: addr
          });
        }
      }

      // Respond to service instance queries (SRV, TXT)
      if (question.name === serviceInstanceName) {
        if (question.type === 'SRV' || question.type === 'ANY') {
          answers.push({
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

          // Include A records as additionals
          const addresses = getActiveIPv4Addresses();
          for (const addr of addresses) {
            additionals.push({
              name: fqdn,
              type: 'A',
              ttl: 120,
              data: addr
            });
          }
        }

        if (question.type === 'TXT' || question.type === 'ANY') {
          answers.push({
            name: serviceInstanceName,
            type: 'TXT',
            ttl: 120,
            data: {
              fork: vscode.env.appName
            }
          });
        }
      }

      // Respond to hostname queries (A)
      if (question.name === fqdn && (question.type === 'A' || question.type === 'ANY')) {
        const addresses = getActiveIPv4Addresses();
        for (const addr of addresses) {
          answers.push({
            name: fqdn,
            type: 'A',
            ttl: 120,
            data: addr
          });
        }
      }
    }

    if (answers.length > 0) {
      mdns.respond({ answers, additionals });
    }
  });

  // Proactively announce our service
  const announceService = () => {
    const addresses = getActiveIPv4Addresses();
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
        data: {
          fork: vscode.env.appName
        }
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