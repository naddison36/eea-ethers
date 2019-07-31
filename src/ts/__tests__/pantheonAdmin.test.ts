import { providers } from '../index'

jest.setTimeout(15000)

const provider = new providers.EeaJsonRpcProvider("http://localhost:20000");
provider.on('debug', (info) => {
    console.log(`Sent "${info.action}" action to node 1 with request: ${JSON.stringify(info.request)}\nResponse: ${JSON.stringify(info.response)}`);
})

describe('Pantheon Admin APIs', () => {

    test('get nodeInfo', async() => {
        const nodeInfo = await provider.getNodeInfo()

        expect(nodeInfo.id).toMatch(/^([A-Fa-f0-9]{128})$/)
        expect(typeof nodeInfo.enode).toEqual('string')
        expect(typeof nodeInfo.listenAddr).toEqual('string')
        expect(typeof nodeInfo.name).toEqual('string')
        expect(nodeInfo.ports.discovery).toBeGreaterThan(30000)
        expect(nodeInfo.ports.listener).toBeGreaterThan(30000)
        expect(nodeInfo.protocols).toBeDefined()
    })

    test('get peers', async() => {
        const peers = await provider.getPeers()

        expect(peers).toHaveLength(5)
        expect(peers[0].version).toEqual('0x5')
        expect(typeof peers[0].name).toEqual('string')
        expect(peers[0].caps.length).toBeGreaterThan(1)
        expect(typeof peers[0].network.localAddress).toEqual('string')
        expect(typeof peers[0].network.remoteAddress).toEqual('string')
    })

    test('change log level', async() => {
        let result = await provider.changeLogLevel('TRACE')
        expect(result).toBeTruthy()

        result = await provider.changeLogLevel('DEBUG')
        expect(result).toBeTruthy()
    })

})