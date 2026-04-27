import { DELEGATED_IDENTITY_KEY } from '@suite-common/delegated-identity-key-types/mocks';
import { asSuiteSyncOwnerId } from '@suite-common/suite-sync-storage';
import { type WalletDescriptor, asWalletDescriptor } from '@suite-common/wallet-types';
import { type StaticSessionId } from '@trezor/connect-common';
import { err, ok } from '@trezor/type-utils';

import { DEFAULT_ACCOUNT_SIZE_QUOTA } from '../constants';
import { createEnsureOwnerHasAllocatedQuota } from '../createEnsureOwnerHasAllocatedQuota';
import { createEnsureOwnerHasAllocatedQuotaDepsMock } from '../mocks/createEnsureOwnerHasAllocatedQuotaDepsMock';

const ownerId = asSuiteSyncOwnerId('owner-id');
const walletDescriptor: WalletDescriptor = asWalletDescriptor('descriptor');
const deviceId = 'device-123';
const deviceStaticSessionId = `${walletDescriptor}@${deviceId}` as StaticSessionId;

describe(createEnsureOwnerHasAllocatedQuota.name, () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('dispatches owner fetched when storage already exists', async () => {
        const deps = createEnsureOwnerHasAllocatedQuotaDepsMock({
            checkStorageByOwnerIdResponses: [ok({ status: 'Allocated', totalSpace: 2048 })],
            prepareChallengeSessionResponses: [],
            transferStorageResponses: [],
        });

        const result = await createEnsureOwnerHasAllocatedQuota(deps)({
            ownerId,
            delegatedKey: DELEGATED_IDENTITY_KEY,
            deviceStaticSessionId,
            isWriteMode: false,
        });

        expect(result).toEqual(ok());
        expect(deps.checkStorageByOwnerId).toHaveBeenCalledWith({
            baseUrl: 'https://quota-manager.test',
            ownerId,
        });
        expect(deps.dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: '@suite/quota-manager/ownerFetched',
                payload: {
                    walletDescriptor,
                    totalSpace: 2048,
                },
            }),
        );
        expect(deps.prepareChallengeSession).not.toHaveBeenCalled();
        expect(deps.transferStorage).not.toHaveBeenCalled();
    });

    it("does not attempt allocation when no quota is left and returns 'NoQuotaLeftToAllocate'", async () => {
        const deps = createEnsureOwnerHasAllocatedQuotaDepsMock({
            checkStorageByOwnerIdResponses: [ok({ status: 'NoQuota' })],
            prepareChallengeSessionResponses: [],
            transferStorageResponses: [],
            patch: {
                getLeftDeviceQuota: () => 0,
            },
        });

        const result = await createEnsureOwnerHasAllocatedQuota(deps)({
            ownerId,
            delegatedKey: DELEGATED_IDENTITY_KEY,
            deviceStaticSessionId,
            isWriteMode: true,
        });

        expect(result).toEqual(err({ type: 'NoQuotaLeftToAllocate' }));
        expect(deps.prepareChallengeSession).not.toHaveBeenCalled();
        expect(deps.transferStorage).not.toHaveBeenCalled();
    });

    it('returns QuotaManagerCommunicationFailed for non-404 storage lookup failures', async () => {
        const deps = createEnsureOwnerHasAllocatedQuotaDepsMock({
            checkStorageByOwnerIdResponses: [
                err({ type: 'HttpError', code: 500, message: 'Internal error' }),
            ],
            prepareChallengeSessionResponses: [],
            transferStorageResponses: [],
        });

        const result = await createEnsureOwnerHasAllocatedQuota(deps)({
            ownerId,
            delegatedKey: DELEGATED_IDENTITY_KEY,
            deviceStaticSessionId,
            isWriteMode: false,
        });

        expect(result).toEqual(
            err({
                type: 'QuotaManagerCommunicationFailed',
                caused: { type: 'HttpError', code: 500, message: 'Internal error' },
            }),
        );
        expect(deps.prepareChallengeSession).not.toHaveBeenCalled();
    });

    it('requests storage transfer when owner storage is missing', async () => {
        const deps = createEnsureOwnerHasAllocatedQuotaDepsMock({
            checkStorageByOwnerIdResponses: [ok({ status: 'NoQuota' })],
            prepareChallengeSessionResponses: [ok({ sessionId: 'session-123', challenge: 'aa55' })],
            transferStorageResponses: [ok({ publicKeyUnspentSpace: 0, ownerTotalSpace: 0 })],
        });

        const result = await createEnsureOwnerHasAllocatedQuota(deps)({
            ownerId,
            delegatedKey: DELEGATED_IDENTITY_KEY,
            deviceStaticSessionId,
            isWriteMode: true,
        });

        expect(result).toEqual(ok());
        expect(deps.prepareChallengeSession).toHaveBeenCalledWith({
            baseUrl: 'https://quota-manager.test',
        });
        expect(deps.transferStorage).toHaveBeenCalledWith({
            params: {
                ownerId,
                publicKey:
                    '0428a3cefc19b41ff56795e371aab72d6d85a3ca2200bd46c54e611a36222295a88b44d6f23ce94025b6010f9eb0f9168ad35d8396dc865fa0a16f2f5471816a45',
                proof: '2944ed0b226eb961750433b65639366871cf05a10dfd598a0651a39e18e5ada578f76fda26478316ac93115b1538bbad11044b83a59259efa8c2f9feaba1675b',
                size: DEFAULT_ACCOUNT_SIZE_QUOTA,
                challenge: 'aa55',
                sessionId: 'session-123',
            },
            walletDescriptor,
            deviceId,
        });
    });

    it('allocates only the remaining quota when it is below the default increment', async () => {
        const remainingQuota = 500;
        const deps = createEnsureOwnerHasAllocatedQuotaDepsMock({
            checkStorageByOwnerIdResponses: [ok({ status: 'NoQuota' })],
            prepareChallengeSessionResponses: [ok({ sessionId: 'session-456', challenge: 'bb66' })],
            transferStorageResponses: [ok({ publicKeyUnspentSpace: 0, ownerTotalSpace: 0 })],
            patch: {
                getLeftDeviceQuota: () => remainingQuota,
            },
        });

        await createEnsureOwnerHasAllocatedQuota(deps)({
            ownerId,
            delegatedKey: DELEGATED_IDENTITY_KEY,
            deviceStaticSessionId,
            isWriteMode: true,
        });

        expect(deps.transferStorage).toHaveBeenCalledWith(
            expect.objectContaining({
                params: expect.objectContaining({
                    size: remainingQuota,
                }),
            }),
        );
    });
});
