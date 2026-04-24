import { type Dispatch } from '@reduxjs/toolkit';

import { type Result, ok } from '@trezor/type-utils';

import { quotaManagerDeviceFetched } from '../quotaManagerActions';
import {
    type QuotaManagerFetchCommunicationError,
    type QuotaManagerFetchDep,
} from '../quotaManagerFetch';

export type RegisterStorageParams = {
    deviceId: string;
    publicKey: string;
    size: number;
    proof: string;
    certificateChain: {
        deviceCert: string;
        caCert: string;
    };
    deviceModel: string;
    sessionId: string;
    challenge: string;
};

type RegisterStorageResponse = {
    totalStorageSize: number;
    unspentStorageSize: number;
};

export type RegisterStorageResult = Result<
    RegisterStorageResponse,
    QuotaManagerFetchCommunicationError
>;

export type RegisterStorage = (params: RegisterStorageParams) => Promise<RegisterStorageResult>;

type GetQuotaManagerBaseUrl = () => string | null;

export type RegisterStorageDeps = {
    dispatch: Dispatch;
    getQuotaManagerBaseUrl: GetQuotaManagerBaseUrl;
} & QuotaManagerFetchDep;

export type RegisterStorageDep = {
    registerStorage: RegisterStorage;
};

export const createRegisterStorage =
    (deps: RegisterStorageDeps): RegisterStorage =>
    async ({ deviceId, ...params }) => {
        const result = await deps.quotaManagerFetch({
            baseUrl: deps.getQuotaManagerBaseUrl(),
            path: '/storage/register',
            method: 'POST',
            body: params,
        });

        if (!result.success) {
            return result;
        }

        const response = result.payload as RegisterStorageResponse;

        deps.dispatch(
            quotaManagerDeviceFetched({
                deviceId,
                totalStorageSize: response.totalStorageSize,
                unspentStorageSize: response.unspentStorageSize,
            }),
        );

        return ok(response);
    };
