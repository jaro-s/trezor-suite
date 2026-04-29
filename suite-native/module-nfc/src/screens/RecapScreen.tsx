import { useNavigation } from '@react-navigation/native';

import { Box, Button, VStack } from '@suite-native/atoms';
import { Translation } from '@suite-native/intl';
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
import { SwipeableWalkthroughStepHeader } from '@suite-native/swipeable-walkthrough';

type NavigationProps = StackToStackCompositeNavigationProps<
    CreateAdditionalBackupStackParamList,
    CreateAdditionalBackupStackRoutes,
    DeviceSettingsStackParamList
>;

export const RecapScreen = () => {
    const navigation = useNavigation<NavigationProps>();

    const handleClose = () => {
        navigation.popTo(DeviceSettingsStackRoutes.DeviceBackupAndPassphrase);
    };

    useOverrideBackNavigation({ onNavigateBack: handleClose });

    return (
        <Screen header={<ScreenHeader closeActionType="close" closeAction={handleClose} />}>
            <VStack flex={1} justifyContent="space-between" alignItems="center">
                <Box flex={1} justifyContent="center" alignItems="center">
                    <SwipeableWalkthroughStepHeader
                        callout={
                            <Translation id="moduleCreateAdditionalBackup.recapScreen.callout" />
                        }
                        title={<Translation id="moduleCreateAdditionalBackup.recapScreen.title" />}
                        description={
                            <Translation id="moduleCreateAdditionalBackup.recapScreen.description" />
                        }
                    />
                </Box>
                <Button onPress={handleClose} isFullWidth>
                    <Translation id="moduleCreateAdditionalBackup.recapScreen.button" />
                </Button>
            </VStack>
        </Screen>
    );
};
