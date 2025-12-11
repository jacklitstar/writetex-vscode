import Bonjour from 'bonjour-service';
import * as os from 'os';
import * as vscode from 'vscode';

export interface MdnsHandle {
  stop: () => Promise<void>;
}


/**
 * Advertise WriteTex OCR service via mDNS on the local network
 * Service name: 'WriteTex VSCode'
 */
export function advertise(port: number): MdnsHandle {
  const instance = new Bonjour();

  const service = instance.publish({
    name: 'WriteTex VSCode',
    type: 'writetex-vscode',
    protocol: 'tcp',
    port,
    txt: {
      fork: vscode.env.appName
    }
  });

  if (typeof (service as any).start === 'function') {
    (service as any).start();
  }

  console.log(`[mDNS] Advertising port: ${port}`);

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