import {
    type SuiteSyncOwner,
    asSuiteSyncOwnerId,
    asSuiteSyncOwnerSecretHex,
} from '@suite-common/suite-sync-storage';
import { asDelegatedIdentityKey } from '@suite-common/suite-types';
import { mockSuiteDevice } from '@suite-common/suite-types/mocks';
import { type StaticSessionId } from '@trezor/connect';
import { err, ok } from '@trezor/type-utils';

import { createEnsureQuota } from '../createEnsureQuota';
import { createEnsureQuotaDepsMock } from '../mocks/createEnsureQuotaDepsMock';

const OWNER_ABCD: SuiteSyncOwner = {
    ownerId: asSuiteSyncOwnerId('owner-id-abcd'),
    ownerSecret: asSuiteSyncOwnerSecretHex('owner-secret-abcd'),
};

const DELEGATED_KEY = asDelegatedIdentityKey('delegated-key-abcd');

const deviceStaticSessionId: StaticSessionId = '1@device-id:3';

const DEFAULT_PARAMS = {
    deviceStaticSessionId,
    delegatedKey: DELEGATED_KEY,
    owner: OWNER_ABCD,
    isWriteMode: false,
};

const device = mockSuiteDevice({
    id: 'device-id',
    state: { staticSessionId: deviceStaticSessionId },
});

describe(createEnsureQuota.name, () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it.each([
        {
            description: 'device is not found',
            getDevice: () => null,
        },
        {
            description: 'device has no id',
            getDevice: () => mockSuiteDevice({ id: undefined } as never),
        },
    ])('returns ok without calling services when $description', async ({ getDevice }) => {
        const deps = createEnsureQuotaDepsMock({
            ensureDeviceHasQuotaResponses: [],
            ensureOwnerHasAllocatedQuotaResponses: [],
            patch: {
                getDeviceForStaticSessionId: () => getDevice(),
            },
        });

        const result = await createEnsureQuota(deps)(DEFAULT_PARAMS);

        expect(result).toEqual(ok());
        expect(deps.ensureDeviceHasQuota).not.toHaveBeenCalled();
        expect(deps.ensureOwnerHasAllocatedQuota).not.toHaveBeenCalled();
    });

    it('returns ok without calling services when allowance is granted', async () => {
        const deps = createEnsureQuotaDepsMock({
            ensureDeviceHasQuotaResponses: [],
            ensureOwnerHasAllocatedQuotaResponses: [],
            patch: {
                getDeviceHasAllowance: () => true,
                getDeviceForStaticSessionId: () => device,
            },
        });

        const result = await createEnsureQuota(deps)(DEFAULT_PARAMS);

        expect(result).toEqual(ok());
        expect(deps.ensureDeviceHasQuota).not.toHaveBeenCalled();
        expect(deps.ensureOwnerHasAllocatedQuota).not.toHaveBeenCalled();
    });

    it('calls both quota services when allowance is not granted', async () => {
        const deps = createEnsureQuotaDepsMock({
            ensureDeviceHasQuotaResponses: [ok()],
            ensureOwnerHasAllocatedQuotaResponses: [ok()],
            patch: {
                getDeviceForStaticSessionId: () => device,
            },
        });

        const result = await createEnsureQuota(deps)(DEFAULT_PARAMS);

        expect(result).toEqual(ok());
        expect(deps.ensureDeviceHasQuota).toHaveBeenCalledWith({
            delegatedKey: DELEGATED_KEY,
            device,
        });
        expect(deps.ensureOwnerHasAllocatedQuota).toHaveBeenCalledWith({
            delegatedKey: DELEGATED_KEY,
            deviceStaticSessionId,
            isWriteMode: false,
            ownerId: OWNER_ABCD.ownerId,
        });
    });

    it('returns WriteModeRequiredForAllocation when owner allocation fails with that error', async () => {
        const deps = createEnsureQuotaDepsMock({
            ensureDeviceHasQuotaResponses: [ok()],
            ensureOwnerHasAllocatedQuotaResponses: [
                err({ type: 'WriteModeRequiredForAllocation' }),
            ],
            patch: {
                getDeviceForStaticSessionId: () => device,
            },
        });

        const result = await createEnsureQuota(deps)(DEFAULT_PARAMS);

        expect(result).toEqual(err({ type: 'WriteModeRequiredForAllocation' }));
    });

    it('returns owner allocation errors other than WriteModeRequiredForAllocation directly', async () => {
        const deps = createEnsureQuotaDepsMock({
            ensureDeviceHasQuotaResponses: [ok()],
            ensureOwnerHasAllocatedQuotaResponses: [err({ type: 'NoQuotaLeftToAllocate' })],
            patch: {
                getDeviceForStaticSessionId: () => device,
            },
        });

        const result = await createEnsureQuota(deps)(DEFAULT_PARAMS);

        expect(result).toEqual(err({ type: 'NoQuotaLeftToAllocate' }));
    });

    it('returns QuotaManagerCommunicationFailed when device registration fails', async () => {
        const deps = createEnsureQuotaDepsMock({
            ensureDeviceHasQuotaResponses: [
                err({
                    type: 'QuotaManagerCommunicationFailed',
                    caused: { type: 'HttpError', code: 500 },
                }),
            ],
            ensureOwnerHasAllocatedQuotaResponses: [],
            patch: {
                getDeviceForStaticSessionId: () => device,
            },
        });

        const result = await createEnsureQuota(deps)(DEFAULT_PARAMS);

        expect(result).toEqual(
            err({
                type: 'QuotaManagerCommunicationFailed',
                caused: { type: 'HttpError', code: 500 },
            }),
        );
        expect(deps.ensureOwnerHasAllocatedQuota).not.toHaveBeenCalled();
    });

    it('uses the current allowance state when deciding whether to call services', async () => {
        let hasDeviceAllowance = false;

        const deps = createEnsureQuotaDepsMock({
            ensureDeviceHasQuotaResponses: [],
            ensureOwnerHasAllocatedQuotaResponses: [],
            patch: {
                getDeviceHasAllowance: () => hasDeviceAllowance,
                getDeviceForStaticSessionId: () => device,
            },
        });

        hasDeviceAllowance = true;

        const result = await createEnsureQuota(deps)(DEFAULT_PARAMS);

        expect(result).toEqual(ok());
        expect(deps.ensureDeviceHasQuota).not.toHaveBeenCalled();
        expect(deps.ensureOwnerHasAllocatedQuota).not.toHaveBeenCalled();
    });
});
