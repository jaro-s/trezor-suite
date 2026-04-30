import { factory } from '@trezor/connect-common';

const dummy = () => {
    throw new Error('Not implemented');
};

// Exported to enable using directly
const TrezorConnect = factory({
    eventEmitter: { on: dummy, removeListener: dummy, removeAllListeners: dummy } as any,
    init: dummy,
    call: dummy,
    updateConnectSettings: dummy,
    uiResponse: dummy,
    cancel: dummy,
    dispose: dummy,
});

export default TrezorConnect;

// allowed only here
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
export * from './exports';
