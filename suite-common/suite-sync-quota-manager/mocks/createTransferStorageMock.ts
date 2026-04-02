import { ok } from '@trezor/type-utils';

import {
    type TransferStorage,
    type TransferStorageResult,
} from '../src/storage/createTransferStorage';

const DEFAULT_RESPONSES: TransferStorageResult[] = [
    ok({ publicKeyUnspentSpace: 0, ownerTotalSpace: 0 }),
];

export const createTransferStorageMock = (
    responses: TransferStorageResult[] = DEFAULT_RESPONSES,
): jest.Mock<ReturnType<TransferStorage>, Parameters<TransferStorage>> => {
    const mock = jest.fn<ReturnType<TransferStorage>, Parameters<TransferStorage>>();
    responses.forEach(response => mock.mockResolvedValueOnce(response));

    return mock;
};
