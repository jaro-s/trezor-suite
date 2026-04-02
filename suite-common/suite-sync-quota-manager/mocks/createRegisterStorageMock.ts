import { ok } from '@trezor/type-utils';

import {
    type RegisterStorage,
    type RegisterStorageResult,
} from '../src/storage/createRegisterStorage';

const DEFAULT_RESPONSES: RegisterStorageResult[] = [
    ok({ totalStorageSize: 5000, unspentStorageSize: 1200 }),
];

export const createRegisterStorageMock = (
    responses: RegisterStorageResult[] = DEFAULT_RESPONSES,
): jest.Mock<ReturnType<RegisterStorage>, Parameters<RegisterStorage>> => {
    const mock = jest.fn<ReturnType<RegisterStorage>, Parameters<RegisterStorage>>();
    responses.forEach(response => mock.mockResolvedValueOnce(response));

    return mock;
};
