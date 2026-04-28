import { createMockDeps } from '@suite-common/dependency-injection';

import { type EnsureDeviceHasQuotaDeps } from '../device/createEnsureDeviceHasQuota';
import { createRegisterDeviceMock } from '../device/mocks/createRegisterDeviceMock';
import { type CheckStorageByPublicKeyResult } from '../storage/createCheckStorageByPublicKey';
import { createCheckStorageByPublicKeyMock } from '../storage/mocks/createCheckStorageByPublicKeyMock';

type RegisterDeviceResult = Awaited<ReturnType<EnsureDeviceHasQuotaDeps['registerDevice']>>;

type CreateEnsureDeviceHasQuotaDepsMockParams = {
    checkStorageByPublicKeyResponses: CheckStorageByPublicKeyResult[];
    registerDeviceResponses: RegisterDeviceResult[];
    patch?: Partial<EnsureDeviceHasQuotaDeps>;
};

export const createEnsureDeviceHasQuotaDepsMock = ({
    checkStorageByPublicKeyResponses,
    registerDeviceResponses,
    patch = {},
}: CreateEnsureDeviceHasQuotaDepsMockParams) =>
    createMockDeps<EnsureDeviceHasQuotaDeps>({
        checkStorageByPublicKey: createCheckStorageByPublicKeyMock(
            checkStorageByPublicKeyResponses,
        ),
        dispatch: jest.fn(),
        getQuotaManagerBaseUrl: () => 'https://quota-manager.test',
        registerDevice: createRegisterDeviceMock(registerDeviceResponses),
        ...patch,
    });
