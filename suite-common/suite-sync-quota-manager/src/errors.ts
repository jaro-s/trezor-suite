export type WriteModeRequiredForAllocationErrType = {
    type: 'WriteModeRequiredForAllocation';
};

export type QuotaManagerCommunicationFailedErrType = {
    type: 'QuotaManagerCommunicationFailed';
    caused: unknown;
};

export type QuotaManagerNoQuotaErrType = {
    type: 'QuotaManagerNoQuota';
};

export const quotaManagerCommunicationFailed = (
    caused: unknown,
): QuotaManagerCommunicationFailedErrType => ({
    type: 'QuotaManagerCommunicationFailed',
    caused,
});

export const quotaManagerNoQuota = (): QuotaManagerNoQuotaErrType => ({
    type: 'QuotaManagerNoQuota',
});
