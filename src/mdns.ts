import Bonjour from 'bonjour-service'

export interface MdnsHandle {
  stop: () => Promise<void>
}

export function advertise(serviceName: string, port: number, requireToken: boolean): MdnsHandle {
  const bonjour = new Bonjour()
  const service = bonjour.publish({
    name: serviceName,
    type: 'writetex-vscode',
    protocol: 'tcp',
    port,
    txt: { path: '/ocr', version: '1', requireToken: String(requireToken) }
  })
  if (typeof (service as any).start === 'function') {
    (service as any).start()
  }
  return {
    stop: async () => new Promise(resolve => {
      const s: any = service
      if (typeof s.stop === 'function') {
        s.stop(() => {
          bonjour.destroy()
          resolve()
        })
      } else {
        bonjour.destroy()
        resolve()
      }
    })
  }
}
