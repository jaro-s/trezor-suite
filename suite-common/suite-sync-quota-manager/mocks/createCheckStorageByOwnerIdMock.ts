import { ok } from '@trezor/type-utils';

import {
    type CheckStorageByOwnerId,
    type CheckStorageByOwnerIdResult,
} from '../src/storage/createCheckStorageByOwnerId';

const DEFAULT_RESPONSES: CheckStorageByOwnerIdResult[] = [
    ok({ status: 'Allocated', totalSpace: 5000 }),
];

export const createCheckStorageByOwnerIdMock = (
    responses: CheckStorageByOwnerIdResult[] = DEFAULT_RESPONSES,
): jest.Mock<ReturnType<CheckStorageByOwnerId>, Parameters<CheckStorageByOwnerId>> => {
    const mock = jest.fn<ReturnType<CheckStorageByOwnerId>, Parameters<CheckStorageByOwnerId>>();
    responses.forEach(response => mock.mockResolvedValueOnce(response));

    return mock;
};
