import Bonjour from 'bonjour-service';

export interface MdnsHandle {
  stop: () => Promise<void>;
}

/**
 * Advertise WriteTex OCR service via mDNS on the local network
 * Service name: 'WriteTex OCR'
 * Auth requirement: always true
 */
export function advertise(port: number): MdnsHandle {
  const instance = new Bonjour();
  const service = instance.publish({
    name: 'WriteTex VSCode',
    type: 'writetex-vscode',
    protocol: 'tcp',
    port,
    txt: {
      path: '/v1/chat/completions'
    }
  });

  if (typeof (service as any).start === 'function') {
    (service as any).start();
  }

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
