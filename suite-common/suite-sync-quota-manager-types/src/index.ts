export type WriteModeRequiredForAllocationErrType = {
    type: 'WriteModeRequiredForAllocation';
};

/**
 * There is no more quota left for the given device.
 */
export type QuotaManagerNoQuotaLeftOnDeviceToAllocateErrType = {
    type: 'QuotaManagerNoQuotaLeftOnDeviceToAllocate';
};

/**
 * Communication with Quota Manager failed (bad URL, network error, ...)
 */
export type QuotaManagerCommunicationFailedErrType = {
    type: 'QuotaManagerCommunicationFailed';
    caused: unknown;
};
