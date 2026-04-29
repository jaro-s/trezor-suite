import { useSelector } from 'react-redux';

import {
    selectDeviceFeatures,
    selectDeviceModel,
    selectHasExtendableShamirBackup,
    selectIsDeviceBackupUnfinished,
    selectIsDeviceInitialized,
} from '@suite-common/device';
import { VStack } from '@suite-native/atoms';
import { FeatureFlag, useFeatureFlag } from '@suite-native/feature-flags';
import { Translation } from '@suite-native/intl';
import { DynamicScreenHeader, Screen } from '@suite-native/navigation';
import { DeviceModelInternal } from '@trezor/device-utils';

import { CheckBackupCard } from '../components/CheckBackupCard';
import { CreateAdditionalBackupCard } from '../components/CreateAdditionalBackupCard';
import { PassphraseCard } from '../components/PassphraseCard';

export const BackupAndPassphraseScreen = () => {
    const isN4w1BackupEnabled = useFeatureFlag(FeatureFlag.IsN4w1BackupEnabled);

    const isDeviceInitialized = useSelector(selectIsDeviceInitialized);
    const isDeviceBackupUnfinished = useSelector(selectIsDeviceBackupUnfinished);
    const isCheckBackupAvailable = isDeviceInitialized && !isDeviceBackupUnfinished;
    const deviceModel = useSelector(selectDeviceModel);
    const deviceFeatures = useSelector(selectDeviceFeatures);
    const hasExtendableShamirBackup = useSelector(selectHasExtendableShamirBackup);
    const isBackupDone = deviceFeatures?.backup_availability === 'NotAvailable';
    const isT3W1 = deviceModel === DeviceModelInternal.T3W1;
    const isCreateAdditionalBackupAvailable =
        isN4w1BackupEnabled && isT3W1 && hasExtendableShamirBackup && isBackupDone;

    return (
        <Screen
            header={
                <DynamicScreenHeader
                    title={<Translation id="moduleDeviceSettings.backupAndPassphrase.title" />}
                    closeActionType="back"
                />
            }
        >
            <VStack spacing="sp16">
                {isCheckBackupAvailable && <CheckBackupCard />}
                {isCreateAdditionalBackupAvailable && <CreateAdditionalBackupCard />}
                <PassphraseCard />
            </VStack>
        </Screen>
    );
};
