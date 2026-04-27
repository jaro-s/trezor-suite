import { ok } from '@trezor/type-utils';

import {
    type CheckStorageByPublicKey,
    type CheckStorageByPublicKeyResult,
} from '../src/storage/createCheckStorageByPublicKey';

const DEFAULT_RESPONSES: CheckStorageByPublicKeyResult[] = [
    ok({ status: 'Allocated', totalSpace: 5000, unspentSpace: 1200 }),
];

export const createCheckStorageByPublicKeyMock = (
    responses: CheckStorageByPublicKeyResult[] = DEFAULT_RESPONSES,
): jest.Mock<ReturnType<CheckStorageByPublicKey>, Parameters<CheckStorageByPublicKey>> => {
    const mock = jest.fn<
        ReturnType<CheckStorageByPublicKey>,
        Parameters<CheckStorageByPublicKey>
    >();
    responses.forEach(response => mock.mockResolvedValueOnce(response));

    return mock;
};
