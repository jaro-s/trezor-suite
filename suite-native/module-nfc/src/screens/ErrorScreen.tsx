import { useNavigation } from '@react-navigation/native';

import { Box, Button, PictogramTitleHeader, VStack } from '@suite-native/atoms';
import { Translation } from '@suite-native/intl';
import { useOpenLink } from '@suite-native/link';
import {
    type CreateAdditionalBackupStackParamList,
    type CreateAdditionalBackupStackRoutes,
    type DeviceSettingsStackParamList,
    DeviceSettingsStackRoutes,
    Screen,
    ScreenHeader,
    type StackToStackCompositeNavigationProps,
    useOverrideBackNavigation,
} from '@suite-native/navigation';
import { TREZOR_SUPPORT_URL } from '@trezor/urls';

type NavigationProps = StackToStackCompositeNavigationProps<
    CreateAdditionalBackupStackParamList,
    CreateAdditionalBackupStackRoutes,
    DeviceSettingsStackParamList
>;

export const ErrorScreen = () => {
    const navigation = useNavigation<NavigationProps>();
    const openLink = useOpenLink();

    const handleClose = () => {
        navigation.popTo(DeviceSettingsStackRoutes.DeviceBackupAndPassphrase);
    };

    const handleContactSupport = () => {
        openLink(TREZOR_SUPPORT_URL);
    };

    useOverrideBackNavigation({ onNavigateBack: handleClose });

    return (
        <Screen header={<ScreenHeader closeActionType="close" closeAction={handleClose} />}>
            <VStack flex={1} justifyContent="space-between" alignItems="center">
                <Box flex={1} justifyContent="center" alignItems="center">
                    <PictogramTitleHeader
                        titleVariant="headline-md"
                        variant="critical"
                        title={<Translation id="moduleCreateAdditionalBackup.errorScreen.title" />}
                        subtitle={
                            <Translation id="moduleCreateAdditionalBackup.errorScreen.description" />
                        }
                    />
                </Box>
                <VStack alignSelf="stretch">
                    <Button
                        onPress={handleContactSupport}
                        intent="critical"
                        priority="primary"
                        isFullWidth
                    >
                        <Translation id="moduleCreateAdditionalBackup.errorScreen.supportButton" />
                    </Button>
                    <Button
                        onPress={handleClose}
                        intent="critical"
                        priority="secondary"
                        isFullWidth
                    >
                        <Translation id="moduleCreateAdditionalBackup.errorScreen.notNowButton" />
                    </Button>
                </VStack>
            </VStack>
        </Screen>
    );
};
