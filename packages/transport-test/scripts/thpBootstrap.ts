/**
 * THP bootstrap for direct-transport scripts.
 *
 * Drives ThpCreateChannel / Noise XX handshake / SkipPairing using
 * @trezor/protocol's existing crypto primitives, leaving a ThpState
 * ready for application messages via:
 *
 *   transport.call({ session, name, data, protocol: thpProtocol, thpState })
 *
 * Mirrors packages/connect/src/device/thp/handshake.ts, but talks to
 * @trezor/transport directly instead of going through @trezor/connect's
 * IDevice abstraction.
 */
import { randomBytes } from 'crypto';

import { protobufManager } from '@trezor/protobuf';
import { thp as protocolThp, v1 as protocolV1, v2 as protocolV2 } from '@trezor/protocol';
import type { UdpTransport } from '@trezor/transport';
import type { Session } from '@trezor/transport/src/types';

type CallResult = Awaited<ReturnType<UdpTransport['call']>>;
type CallSuccess = Extract<CallResult, { success: true }>;

type ResponsePayload = CallSuccess['payload'];

export type CallOnce = (name: string, data: Record<string, unknown>) => Promise<CallResult>;

const matches = (type: string, expected: string | string[]) =>
    Array.isArray(expected) ? expected.includes(type) : expected === type;

/**
 * Unwrap a successful response and check its protobuf type.
 * Throws on transport failures, on `Failure`/`ThpError` payloads, or on a
 * mismatched message type.
 */
export const expectResponse = (
    result: CallResult,
    expectedTypes: string | string[],
): Record<string, unknown> => {
    if (!result.success) {
        throw new Error(`transport.call failed: ${result.error.code}`);
    }
    const payload = result.payload as ResponsePayload;
    const type = (payload as any).type as string;
    const message = (payload as any).message as Record<string, unknown>;

    if (type === 'Failure') {
        const code = message.code ?? 'Failure_UnknownCode';
        throw new Error(`device returned Failure: ${code} ${message.message ?? ''}`.trim());
    }
    if (type === 'ThpError') {
        throw new Error(
            `device returned ThpError: ${message.code} ${message.message ?? ''}`.trim(),
        );
    }
    if (!matches(type, expectedTypes)) {
        const expectedStr = Array.isArray(expectedTypes)
            ? expectedTypes.join(' | ')
            : expectedTypes;
        throw new Error(`expected ${expectedStr}, got ${type}`);
    }

    return message;
};

/**
 * Walk a ButtonRequest/ButtonAck loop. Given an initial response (which may
 * already be ButtonRequest), keep sending ButtonAck via `callOnce` until the
 * device returns a non-ButtonRequest message (or a transport error). The
 * optional `onButton` is invoked for each ButtonRequest seen — useful to log
 * what prompt the user must confirm on the device, or to fire a DebugLink
 * "press YES" so the script can run unattended.
 */
export const awaitNonButton = async (
    initial: CallResult,
    callOnce: CallOnce,
    onButton?: (message: Record<string, unknown>) => void | Promise<void>,
): Promise<CallResult> => {
    let current = initial;
    while (current.success && (current.payload as any).type === 'ButtonRequest') {
        if (onButton) await onButton((current.payload as any).message);
        current = await callOnce('ButtonAck', {});
    }

    return current;
};

/**
 * Fire a DebugLink button press via the secondary UDP socket (port +1, v1
 * protocol). Trezor firmware treats DebugLinkDecision as fire-and-forget when
 * not paired with a wait_layout flag, so we use `send` (no read) instead of
 * `call`. `button: 1` = YES.
 */
export const pressYes = async ({
    debugTransport,
    debugSession,
}: {
    debugTransport: UdpTransport;
    debugSession: Session;
}) => {
    const res = await debugTransport.send({
        session: debugSession,
        name: 'DebugLinkDecision',
        data: { button: 1 },
        protocol: protocolV1,
    });
    if (!res.success) {
        console.log(`        (debugLink press error: ${res.error.code})`);
    }
};

const onButtonLog = (message: Record<string, unknown>) => {
    const code = (message.code as string | undefined) ?? '?';

    console.log(`        ButtonRequest code=${code} -> sending ButtonAck (approve on emulator)`);
};

export type BootstrapOptions = {
    transport: UdpTransport;
    session: Session;
    hostName?: string;
    appName?: string;
    onButton?: (message: Record<string, unknown>) => void;
};

/**
 * Drive a fresh THP channel from default to "paired" state via SkipPairing.
 *
 * Returns a ThpState ready for `transport.call({...protocol: thpProtocol,
 * thpState})` calls carrying application messages.
 *
 * Requires a debug-build emulator that advertises ThpPairingMethod.SkipPairing
 * (i.e. `__debug__` is true on the firmware build).
 */
export const thpBootstrap = async ({
    transport,
    session,
    hostName = 'manual-kv-test',
    appName = 'manual-kv-test',
    onButton = onButtonLog,
}: BootstrapOptions) => {
    const thpState = new protocolThp.ThpState();
    thpState.setChannel(protocolThp.constants.THP_DEFAULT_CHANNEL);

    const tcall: CallOnce = (name, data) =>
        transport.call({ session, name, data, protocol: protocolV2, thpState });

    // ------------------------------------------------------------------
    // Step 1: ThpCreateChannelRequest -> ThpCreateChannelResponse
    // ------------------------------------------------------------------
    const nonce = randomBytes(8);
    const ccr = await tcall('ThpCreateChannelRequest', { nonce });
    const ccrMsg = expectResponse(ccr, 'ThpCreateChannelResponse') as {
        nonce: Buffer;
        channel: Buffer;
        properties: any;
        handshakeHash: Buffer;
    };
    if (Buffer.compare(nonce, ccrMsg.nonce) !== 0) {
        throw new Error(
            `nonce mismatch: sent ${nonce.toString('hex')}, got ${ccrMsg.nonce.toString('hex')}`,
        );
    }
    if (
        !ccrMsg.properties.pairing_methods?.some(
            (m: any) =>
                protocolThp.getThpPairingMethod(m) === protocolThp.ThpPairingMethod.SkipPairing,
        )
    ) {
        throw new Error(
            'device does not advertise SkipPairing (need __debug__ firmware build for emulator)',
        );
    }
    thpState.setThpProperties(ccrMsg.properties);
    thpState.setChannel(ccrMsg.channel);
    thpState.updateHandshakeCredentials({
        pairingMethods: [protocolThp.ThpPairingMethod.SkipPairing],
        handshakeHash: ccrMsg.handshakeHash,
    });

    // ------------------------------------------------------------------
    // Step 2: ThpHandshakeInitRequest -> Response
    // ------------------------------------------------------------------
    const hostEphemeralKeys = protocolThp.getCurve25519KeyPair(randomBytes(32));
    const hir = await tcall('ThpHandshakeInitRequest', {
        key: hostEphemeralKeys.publicKey,
        tryToUnlock: 0,
    });
    const hirMsg = expectResponse(hir, 'ThpHandshakeInitResponse') as {
        trezorEphemeralPubkey: Buffer;
        trezorEncryptedStaticPubkey: Buffer;
        tag: Buffer;
    };

    const hsCreds = protocolThp.handleHandshakeInit({
        handshakeInitResponse: hirMsg,
        thpState,
        hostEphemeralKeys,
        knownCredentials: [],
        tryToUnlock: 0,
        protobufEncoder: (n: string, d: Record<string, unknown>) => protobufManager.encode(n, d),
    });
    thpState.updateHandshakeCredentials({
        trezorEncryptedStaticPubkey: hirMsg.trezorEncryptedStaticPubkey,
        hostEncryptedStaticPubkey: hsCreds.hostEncryptedStaticPubkey,
        handshakeHash: hsCreds.handshakeHash,
        trezorKey: hsCreds.trezorKey,
        hostKey: hsCreds.hostKey,
        staticKey: hsCreds.staticKey,
        hostStaticPublicKey: hsCreds.hostStaticKeys.publicKey,
    });
    thpState.setPairingCredentials(hsCreds.allCredentials);

    // ------------------------------------------------------------------
    // Step 3: ThpHandshakeCompletionRequest -> Response (state)
    // ------------------------------------------------------------------
    const hcr = await tcall('ThpHandshakeCompletionRequest', {
        hostPubkey: hsCreds.hostEncryptedStaticPubkey,
        encryptedPayload: hsCreds.encryptedPayload,
    });
    const hcrMsg = expectResponse(hcr, 'ThpHandshakeCompletionResponse') as { state: number };

    thpState.setIsPaired(hcrMsg.state !== 0);
    thpState.setPhase('pairing');

    if (hcrMsg.state === 2) {
        // Auto-paired (host already had valid credentials embedded in handshake).
        const end = await tcall('ThpEndRequest', {});
        expectResponse(end, 'ThpEndResponse');
        thpState.setPhase('paired');

        return thpState;
    }

    // ------------------------------------------------------------------
    // Step 4: ThpPairingRequest -> ThpPairingRequestApproved
    //   Device shows a "connect this host?" dialog. The firmware emits a
    //   ButtonRequest first; user confirms on SDL; then ThpPairingRequestApproved.
    // ------------------------------------------------------------------
    const pr = await awaitNonButton(
        await tcall('ThpPairingRequest', { host_name: hostName, app_name: appName }),
        tcall,
        onButton,
    );
    expectResponse(pr, 'ThpPairingRequestApproved');

    // ------------------------------------------------------------------
    // Step 5: ThpSelectMethod{SkipPairing} -> ThpEndResponse
    // ------------------------------------------------------------------
    const sm = await awaitNonButton(
        await tcall('ThpSelectMethod', { selected_pairing_method: 'SkipPairing' }),
        tcall,
        onButton,
    );
    expectResponse(sm, 'ThpEndResponse');

    thpState.setIsPaired(true);
    thpState.setPhase('paired');

    return thpState;
};
