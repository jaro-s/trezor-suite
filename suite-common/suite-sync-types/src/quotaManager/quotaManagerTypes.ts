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
