import type {
    QuotaManagerCommunicationFailedErrType,
    QuotaManagerNoQuotaLeftOnDeviceToAllocateErrType,
    WriteModeRequiredForAllocationErrType,
} from '@suite-common/suite-sync-quota-manager-types';

export type {
    QuotaManagerCommunicationFailedErrType,
    QuotaManagerNoQuotaLeftOnDeviceToAllocateErrType,
    WriteModeRequiredForAllocationErrType,
};

export const WriteModeRequiredForAllocation = (): WriteModeRequiredForAllocationErrType => ({
    type: 'WriteModeRequiredForAllocation',
});

export const QuotaManagerNoQuotaLeftOnDeviceToAllocate =
    (): QuotaManagerNoQuotaLeftOnDeviceToAllocateErrType => ({
        type: 'QuotaManagerNoQuotaLeftOnDeviceToAllocate',
    });

export const QuotaManagerCommunicationFailed = (
    caused: unknown,
): QuotaManagerCommunicationFailedErrType => ({
    type: 'QuotaManagerCommunicationFailed',
    caused,
});
