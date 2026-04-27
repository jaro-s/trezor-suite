import { type Result, err, ok } from '@trezor/type-utils';

import {
    type QuotaManagerFetchCommunicationError,
    type QuotaManagerFetchDep,
} from '../quotaManagerFetch';

type NoQuotaResponse = {
    status: 'NoQuota';
};

type QuotaOwnerResponse = {
    status: 'Allocated';
    totalSpace: number;
};

export type AskForStorageResponse = NoQuotaResponse | QuotaOwnerResponse;

export type CheckStorageByOwnerIdParams = {
    baseUrl: string | null;
    ownerId: string;
};

export type CheckStorageByOwnerIdResult = Result<
    AskForStorageResponse,
    QuotaManagerFetchCommunicationError
>;

export type CheckStorageByOwnerId = (
    params: CheckStorageByOwnerIdParams,
) => Promise<CheckStorageByOwnerIdResult>;

export type CheckStorageByOwnerIdDep = {
    checkStorageByOwnerId: CheckStorageByOwnerId;
};

/**
 * Ask quota manager for storage allowance by owner ID.
 */
export const createCheckStorageByOwnerId =
    (deps: QuotaManagerFetchDep): CheckStorageByOwnerId =>
    async ({ baseUrl, ownerId }) => {
        const result = await deps.quotaManagerFetch({
            baseUrl,
            path: '/storage/ask',
            method: 'POST',
            body: { ownerId },
        });

        if (!result.success) {
            return err(result.error);
        }

        return ok(result.payload as AskForStorageResponse);
    };
