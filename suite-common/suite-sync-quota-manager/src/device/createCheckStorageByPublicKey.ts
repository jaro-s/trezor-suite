import { type Result, err, ok } from '@trezor/type-utils';

import {
    type QuotaManagerFetchCommunicationError,
    type QuotaManagerFetchDep,
} from '../quotaManagerFetch';

type NoQuotaResponse = {
    status: 'NoQuota';
};

type QuotaPublicKeyResponse = {
    status: 'Allocated';
    totalSpace: number;
    unspentSpace: number;
};

export type AskForStoragePublicKeyResponse = NoQuotaResponse | QuotaPublicKeyResponse;

export type CheckStorageByPublicKeyParams = {
    publicKey: string;
};

export type CheckStorageByPublicKeyResult = Result<
    AskForStoragePublicKeyResponse,
    QuotaManagerFetchCommunicationError
>;

export type CheckStorageByPublicKey = (
    params: CheckStorageByPublicKeyParams,
) => Promise<CheckStorageByPublicKeyResult>;

export type CheckStorageByPublicKeyDep = {
    checkStorageByPublicKey: CheckStorageByPublicKey;
};

/**
 * Ask quota manager for storage allowance by public key.
 * Returns also unspent space left.
 */
export const createCheckStorageByPublicKey =
    (deps: QuotaManagerFetchDep): CheckStorageByPublicKey =>
    async ({ publicKey }) => {
        const result = await deps.quotaManagerFetch({
            path: '/storage/ask',
            method: 'POST',
            body: { publicKey },
        });

        if (!result.success) {
            return err(result.error);
        }

        return ok(result.payload as AskForStoragePublicKeyResponse);
    };
