export type WriteModeRequiredForAllocationErrType = {
    type: 'WriteModeRequiredForAllocation';
};
export const WriteModeRequiredForAllocation = (): WriteModeRequiredForAllocationErrType => ({
    type: 'WriteModeRequiredForAllocation',
});

/**
 * There is no more quota left for the given device.
 */
export type QuotaManagerNoQuotaLeftOnDeviceToAllocateErrType = {
    type: 'QuotaManagerNoQuotaLeftOnDeviceToAllocate';
};

export const QuotaManagerNoQuotaLeftOnDeviceToAllocate =
    (): QuotaManagerNoQuotaLeftOnDeviceToAllocateErrType => ({
        type: 'QuotaManagerNoQuotaLeftOnDeviceToAllocate',
    });

/**
 * Communication with Quota Manager failed (bad URL, network error, ...)
 */
export type QuotaManagerCommunicationFailedErrType = {
    type: 'QuotaManagerCommunicationFailed';
    caused: unknown;
};
export const QuotaManagerCommunicationFailed = (
    caused: unknown,
): QuotaManagerCommunicationFailedErrType => ({
    type: 'QuotaManagerCommunicationFailed',
    caused,
});
