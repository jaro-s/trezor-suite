import { useNavigation } from '@react-navigation/native';

import { Box, Button, PictogramTitleHeader, VStack } from '@suite-native/atoms';
import { Translation } from '@suite-native/intl';
import {
    AppTabsRoutes,
    type CreateAdditionalBackupStackParamList,
    CreateAdditionalBackupStackRoutes,
    HomeStackRoutes,
    type RootStackParamList,
    RootStackRoutes,
    Screen,
    ScreenHeader,
    type StackToStackCompositeNavigationProps,
    useOverrideBackNavigation,
} from '@suite-native/navigation';

type NavigationProps = StackToStackCompositeNavigationProps<
    CreateAdditionalBackupStackParamList,
    CreateAdditionalBackupStackRoutes,
    RootStackParamList
>;

export const SuccessScreen = () => {
    const navigation = useNavigation<NavigationProps>();

    const handleClose = () => {
        navigation.popTo(RootStackRoutes.AppTabs, {
            screen: AppTabsRoutes.HomeStack,
            params: {
                screen: HomeStackRoutes.Home,
            },
        });
    };

    const handleContinue = () => {
        navigation.navigate(CreateAdditionalBackupStackRoutes.Recap);
    };

    useOverrideBackNavigation({ onNavigateBack: handleClose });

    return (
        <Screen header={<ScreenHeader closeActionType="close" closeAction={handleClose} />}>
            <VStack flex={1} justifyContent="space-between" alignItems="center">
                <Box flex={1} justifyContent="center" alignItems="center">
                    <PictogramTitleHeader
                        titleVariant="headline-md"
                        variant="success"
                        title={
                            <Translation id="moduleCreateAdditionalBackup.successScreen.title" />
                        }
                        subtitle={
                            <Translation id="moduleCreateAdditionalBackup.successScreen.subtitle" />
                        }
                    />
                </Box>
                <Button onPress={handleContinue} isFullWidth>
                    <Translation id="generic.buttons.continue" />
                </Button>
            </VStack>
        </Screen>
    );
};
