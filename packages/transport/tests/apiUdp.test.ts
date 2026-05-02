import UDP from 'dgram';

import { UdpApi } from '../src/api/udp';

// mock dgram api
jest.mock('dgram', () => ({
    __esModule: true,
    default: {
        createSocket: jest.fn(() => {
            throw new Error('use mockImplementation');
        }),
    },
}));

// mock of UDP.Socket
const createUdpSocketMock = (optional = {}) =>
    ({
        send: (...args: any[]) => args[3](),
        addListener: () => {},
        removeListener: () => {},
        ...optional,
    }) as unknown as UDP.Socket;

describe('api/udp', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('enumerate target port', () => {
        const captureTargetPort = async (
            env: Record<string, string | undefined>,
            opts: {
                debugLink?: boolean;
            } = {},
        ) => {
            const previous = { ...process.env };
            Object.entries(env).forEach(([k, v]) => {
                if (v === undefined) delete process.env[k];
                else process.env[k] = v;
            });
            try {
                let captured: number | undefined;
                jest.spyOn(UDP, 'createSocket').mockImplementation(() =>
                    createUdpSocketMock({
                        send: (...args: any[]) => {
                            captured ??= args[1];
                            args[3]();
                        },
                    }),
                );
                const api = new UdpApi({ debugLink: opts.debugLink });
                await api.enumerate();

                return captured;
            } finally {
                process.env = previous;
            }
        };

        it('defaults to 21324 when TREZOR_UDP_PORT is unset', async () => {
            expect(await captureTargetPort({ TREZOR_UDP_PORT: undefined })).toBe(21324);
        });

        it('defaults to 21325 in debugLink mode when TREZOR_UDP_PORT is unset', async () => {
            expect(
                await captureTargetPort({ TREZOR_UDP_PORT: undefined }, { debugLink: true }),
            ).toBe(21325);
        });

        it('honors TREZOR_UDP_PORT when set', async () => {
            expect(await captureTargetPort({ TREZOR_UDP_PORT: '21424' })).toBe(21424);
        });

        it('uses TREZOR_UDP_PORT+1 in debugLink mode', async () => {
            expect(await captureTargetPort({ TREZOR_UDP_PORT: '21424' }, { debugLink: true })).toBe(
                21425,
            );
        });

        it('falls back to 21324 if TREZOR_UDP_PORT is non-numeric', async () => {
            expect(await captureTargetPort({ TREZOR_UDP_PORT: 'banana' })).toBe(21324);
        });
    });

    it('read aborted', async () => {
        jest.spyOn(UDP, 'createSocket').mockImplementation(() => createUdpSocketMock());

        const api = new UdpApi({});

        const abortController = new AbortController();
        await api.enumerate(abortController.signal);
        const promise = api.read('1', abortController.signal);
        abortController.abort();
        const result = await promise;
        if (result.success) throw new Error('Unexpected success');
        expect(result.error.code).toContain('Aborted by signal');
    });

    it('write aborted', async () => {
        let listeners = 0;
        jest.spyOn(UDP, 'createSocket').mockImplementation(() =>
            createUdpSocketMock({
                send: (...args: any[]) => {
                    setTimeout(() => args[3](), 200);
                },
                addListener: () => {
                    listeners++;
                },
                removeListener: () => {
                    listeners--;
                },
            }),
        );

        const api = new UdpApi({});

        const abortController = new AbortController();
        await api.enumerate(abortController.signal);
        const promise = api.write('1', Buffer.alloc(api.chunkSize), abortController.signal);
        abortController.abort();

        const result = await promise;
        if (result.success) throw new Error('Unexpected success');
        expect(result.error.code).toContain('Aborted by signal');
        expect(listeners).toBe(1); // only the global listener is present
    });

    it('enumerate aborted', async () => {
        jest.spyOn(UDP, 'createSocket').mockImplementation(() =>
            createUdpSocketMock({
                send: (...args: any[]) => {
                    setTimeout(() => args[3](), 100);
                },
            }),
        );

        const api = new UdpApi({});

        const abortController = new AbortController();
        const promise = api.enumerate(abortController.signal);
        abortController.abort();

        const result = await promise;
        if (result.success) throw new Error('Unexpected success');
        expect(result.error.code).toContain('Aborted by signal');
    });
});
