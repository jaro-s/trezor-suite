import { createMockDeps } from '@suite-common/dependency-injection';
import { asSuiteSyncOwnerId } from '@suite-common/suite-sync-storage';
import { type WalletDescriptor, asWalletDescriptor } from '@suite-common/wallet-types';
import { type StaticSessionId } from '@trezor/connect-common';
import { err, ok } from '@trezor/type-utils';

import { createEnsureOwnerHasAllocatedQuotaDepsMock } from '../device/mocks/createEnsureOwnerHasAllocatedQuotaDepsMock';
import { createEnsureOwnerHasAllocatedQuota } from '../owner/createEnsureOwnerHasAllocatedQuota';
import { type IncreaseOwnerQuota } from '../owner/createIncreaseOwnerQuota';

const ownerId = asSuiteSyncOwnerId('owner-id');
const walletDescriptor: WalletDescriptor = asWalletDescriptor('descriptor');
const deviceId = 'device-123';
const deviceStaticSessionId = `${walletDescriptor}@${deviceId}` as StaticSessionId;

describe(createEnsureOwnerHasAllocatedQuota.name, () => {
    const createIncreaseOwnerQuota = () =>
        createMockDeps<{ increaseOwnerQuota: IncreaseOwnerQuota }>({
            increaseOwnerQuota: jest.fn().mockResolvedValue(ok()),
        }).increaseOwnerQuota;

    it('dispatches owner fetched when storage already exists', async () => {
        const deps = createEnsureOwnerHasAllocatedQuotaDepsMock({
            checkStorageByOwnerIdResponses: [ok({ status: 'Allocated', totalSpace: 2048 })],
        });

        const result = await createEnsureOwnerHasAllocatedQuota(deps)({
            ownerId,
            deviceStaticSessionId,
            isWriteMode: false,
        });

        expect(result).toEqual(ok());
        expect(deps.checkStorageByOwnerId).toHaveBeenCalledWith({ ownerId });
        expect(deps.dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: '@suite/quota-manager/ownerFetched',
                payload: {
                    walletDescriptor,
                    totalSpace: 2048,
                },
            }),
        );
        expect(deps.increaseOwnerQuota).not.toHaveBeenCalled();
    });

    it('returns QuotaManagerCommunicationFailed for non-404 storage lookup failures', async () => {
        const deps = createEnsureOwnerHasAllocatedQuotaDepsMock({
            checkStorageByOwnerIdResponses: [
                err({ type: 'HttpError', code: 500, message: 'Internal error' }),
            ],
        });

        const result = await createEnsureOwnerHasAllocatedQuota(deps)({
            ownerId,
            deviceStaticSessionId,
            isWriteMode: false,
        });

        expect(result).toEqual(
            err({
                type: 'QuotaManagerCommunicationFailed',
                caused: { type: 'HttpError', code: 500, message: 'Internal error' },
            }),
        );
        expect(deps.increaseOwnerQuota).not.toHaveBeenCalled();
    });

    it('delegates allocation when owner storage is missing', async () => {
        const increaseOwnerQuota = createIncreaseOwnerQuota();
        const deps = createEnsureOwnerHasAllocatedQuotaDepsMock({
            checkStorageByOwnerIdResponses: [ok({ status: 'NoQuota' })],
            patch: {
                increaseOwnerQuota,
            },
        });

        const result = await createEnsureOwnerHasAllocatedQuota(deps)({
            ownerId,
            deviceStaticSessionId,
            isWriteMode: true,
        });

        expect(result).toEqual(ok());
        expect(increaseOwnerQuota).toHaveBeenCalledWith({
            ownerId,
        });
    });

    it('propagates allocation failures from increaseOwnerQuota', async () => {
        const { increaseOwnerQuota } = createMockDeps<{ increaseOwnerQuota: IncreaseOwnerQuota }>({
            increaseOwnerQuota: jest
                .fn()
                .mockResolvedValue(err({ type: 'QuotaManagerNoQuotaLeftOnDeviceToAllocate' })),
        });
        const deps = createEnsureOwnerHasAllocatedQuotaDepsMock({
            checkStorageByOwnerIdResponses: [ok({ status: 'NoQuota' })],
            patch: {
                increaseOwnerQuota,
            },
        });

        const result = await createEnsureOwnerHasAllocatedQuota(deps)({
            ownerId,
            deviceStaticSessionId,
            isWriteMode: true,
        });

        expect(result).toEqual(err({ type: 'QuotaManagerNoQuotaLeftOnDeviceToAllocate' }));
        expect(increaseOwnerQuota).toHaveBeenCalledTimes(1);
    });
});
