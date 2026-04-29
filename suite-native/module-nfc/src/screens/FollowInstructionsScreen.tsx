import { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { useNavigation } from '@react-navigation/native';

import { useAlert } from '@suite-native/alerts';
import { ContinueOnTrezorScreenContent } from '@suite-native/device';
import { useTranslate } from '@suite-native/intl';
import {
    type CreateAdditionalBackupStackParamList,
    CreateAdditionalBackupStackRoutes,
    type DeviceSettingsStackParamList,
    DeviceSettingsStackRoutes,
    Screen,
    ScreenHeader,
    type StackToStackCompositeNavigationProps,
    useInterceptNativeNavigation,
    useOverrideBackNavigation,
} from '@suite-native/navigation';
import TrezorConnect from '@trezor/connect';

import { createAdditionalBackupThunk } from '../createAdditionalBackupThunks';

type NavigationProps = StackToStackCompositeNavigationProps<
    CreateAdditionalBackupStackParamList,
    CreateAdditionalBackupStackRoutes,
    DeviceSettingsStackParamList
>;

export const FollowInstructionsScreen = () => {
    const dispatch = useDispatch();
    const navigation = useNavigation<NavigationProps>();
    const { showAlert } = useAlert();
    const { translate } = useTranslate();

    useInterceptNativeNavigation();

    const handleExitButtonPress = useCallback(() => {
        showAlert({
            title: translate('moduleCreateAdditionalBackup.cancelAlert.title'),
            description: translate('moduleCreateAdditionalBackup.cancelAlert.description'),
            primaryButtonTitle: translate('moduleCreateAdditionalBackup.cancelAlert.primaryButton'),
            primaryButtonColorProps: { intent: 'warning', priority: 'primary' },
            secondaryButtonTitle: translate(
                'moduleCreateAdditionalBackup.cancelAlert.secondaryButton',
            ),
            secondaryButtonColorProps: { intent: 'warning', priority: 'secondary' },
            onPressPrimaryButton: () => {
                TrezorConnect.cancel();
                navigation.popTo(DeviceSettingsStackRoutes.DeviceBackupAndPassphrase);
            },
        });
    }, [showAlert, translate, navigation]);

    useOverrideBackNavigation({ onNavigateBack: handleExitButtonPress });

    const showCanceledOnTrezorAlert = useCallback(() => {
        showAlert({
            title: translate('moduleCreateAdditionalBackup.canceledOnTrezorAlert.title'),
            description: translate(
                'moduleCreateAdditionalBackup.canceledOnTrezorAlert.description',
            ),
            primaryButtonTitle: translate(
                'moduleCreateAdditionalBackup.canceledOnTrezorAlert.primaryButton',
            ),
            onPressPrimaryButton: () => {
                navigation.popTo(DeviceSettingsStackRoutes.DeviceBackupAndPassphrase);
            },
            primaryButtonColorProps: { intent: 'warning', priority: 'primary' },
        });
    }, [showAlert, translate, navigation]);

    useEffect(() => {
        const startBackupFlow = async () => {
            try {
                const response = await dispatch(createAdditionalBackupThunk()).unwrap();

                if (response.success === true) {
                    navigation.navigate(CreateAdditionalBackupStackRoutes.Success);

                    return;
                }

                if (response.error.code === 'Failure_ActionCancelled') {
                    showCanceledOnTrezorAlert();

                    return;
                }

                if (response.error.code === 'Method_Interrupted') {
                    navigation.popTo(DeviceSettingsStackRoutes.DeviceBackupAndPassphrase);

                    return;
                }

                navigation.navigate(CreateAdditionalBackupStackRoutes.Error);
            } catch {
                navigation.navigate(CreateAdditionalBackupStackRoutes.Error);
            }
        };
        startBackupFlow();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Screen
            noBottomPadding
            header={<ScreenHeader closeActionType="close" closeAction={handleExitButtonPress} />}
        >
            <ContinueOnTrezorScreenContent titleTxKey="moduleCreateAdditionalBackup.followInstructionsScreen.title" />
        </Screen>
    );
};
