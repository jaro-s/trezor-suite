import {
    type QuotaManagerCommunicationFailedErrType,
    type QuotaManagerNoQuotaErrType,
} from '@suite-common/suite-sync-types';

export const quotaManagerCommunicationFailed = (
    caused: unknown,
): QuotaManagerCommunicationFailedErrType => ({
    type: 'QuotaManagerCommunicationFailed',
    caused,
});

export const quotaManagerNoQuota = (): QuotaManagerNoQuotaErrType => ({
    type: 'QuotaManagerNoQuota',
});
