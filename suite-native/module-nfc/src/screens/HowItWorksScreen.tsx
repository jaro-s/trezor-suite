import Svg, { Line } from 'react-native-svg';

import { useNavigation } from '@react-navigation/native';

import { Box, Button, HStack, OrderedListIcon, Text, VStack } from '@suite-native/atoms';
import { Translation } from '@suite-native/intl';
import { useOpenLink } from '@suite-native/link';
import {
    type CreateAdditionalBackupStackParamList,
    CreateAdditionalBackupStackRoutes,
    Screen,
    ScreenHeader,
    type StackNavigationProps,
} from '@suite-native/navigation';
import { prepareNativeStyle, useNativeStyles } from '@trezor/styles-native';
import { HELP_CENTER_MULTI_SHARE_BACKUP_URL } from '@trezor/urls';

type NavigationProp = StackNavigationProps<
    CreateAdditionalBackupStackParamList,
    CreateAdditionalBackupStackRoutes.HowItWorks
>;

const stepIconShadowStyle = prepareNativeStyle(utils => ({
    borderRadius: utils.borders.radii.round,
    ...utils.boxShadows.small,
}));

const CONNECTOR_HEIGHT = 64;
const ICON_COLUMN_WIDTH = 34; // 16px icon + 2 * (8px padding + 1px border)

const iconColumnStyle = prepareNativeStyle(() => ({
    width: ICON_COLUMN_WIDTH,
}));

const flexFillStyle = prepareNativeStyle(() => ({
    flex: 1,
}));

export const HowItWorksScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const openLink = useOpenLink();
    const { applyStyle, utils } = useNativeStyles();

    const handleStartBackup = () => {
        navigation.navigate(CreateAdditionalBackupStackRoutes.FollowInstructions);
    };

    const handleNoBackupPress = () => {
        openLink(HELP_CENTER_MULTI_SHARE_BACKUP_URL);
    };

    return (
        <Screen header={<ScreenHeader />}>
            <VStack flex={1} justifyContent="space-between">
                <VStack spacing="sp24">
                    <VStack spacing="sp4">
                        <Text variant="body-sm-strong" color="contentBrand" textAlign="center">
                            <Translation id="moduleCreateAdditionalBackup.howItWorksScreen.label" />
                        </Text>
                        <Text variant="headline-md" textAlign="center">
                            <Translation id="moduleCreateAdditionalBackup.howItWorksScreen.title" />
                        </Text>
                    </VStack>

                    <VStack>
                        <HStack spacing="sp16" alignItems="flex-start">
                            <VStack alignItems="center" style={applyStyle(iconColumnStyle)}>
                                <Box style={applyStyle(stepIconShadowStyle)}>
                                    <OrderedListIcon
                                        iconNumber={1}
                                        iconSize="medium"
                                        iconBorderRadius="round"
                                        iconBackgroundColor="contentPrimaryInverse"
                                        iconBorderColor="contentPrimaryInverse"
                                    />
                                </Box>
                                <Svg width={2} height={CONNECTOR_HEIGHT}>
                                    <Line
                                        x1={1}
                                        y1={0}
                                        x2={1}
                                        y2={CONNECTOR_HEIGHT}
                                        stroke={utils.colors.borderNeutral}
                                        strokeWidth={1}
                                        strokeDasharray="4 4"
                                    />
                                </Svg>
                            </VStack>
                            <VStack spacing="sp8" style={applyStyle(flexFillStyle)}>
                                <Text variant="body-md-strong">
                                    <Translation id="moduleCreateAdditionalBackup.howItWorksScreen.step1.title" />
                                </Text>
                                <Text variant="body-sm" color="contentSecondary">
                                    <Translation id="moduleCreateAdditionalBackup.howItWorksScreen.step1.description" />
                                </Text>
                            </VStack>
                        </HStack>
                        <HStack spacing="sp16" alignItems="flex-start">
                            <OrderedListIcon
                                iconNumber={2}
                                iconSize="medium"
                                iconBorderRadius="round"
                                iconBorderColor="legacyBackgroundTertiaryDefaultOnElevation1"
                            />
                            <VStack spacing="sp8" style={applyStyle(flexFillStyle)}>
                                <Text variant="body-md-strong">
                                    <Translation id="moduleCreateAdditionalBackup.howItWorksScreen.step2.title" />
                                </Text>
                                <Text variant="body-sm" color="contentSecondary">
                                    <Translation id="moduleCreateAdditionalBackup.howItWorksScreen.step2.description" />
                                </Text>
                            </VStack>
                        </HStack>
                    </VStack>
                </VStack>

                <VStack spacing="sp12">
                    <Button
                        onPress={handleStartBackup}
                        isFullWidth
                        testID="@create-additional-backup/enter-backup"
                    >
                        <Translation id="moduleCreateAdditionalBackup.howItWorksScreen.enterBackupButton" />
                    </Button>
                    <Button
                        onPress={handleNoBackupPress}
                        intent="neutral"
                        priority="secondary"
                        isFullWidth
                        iconRight="arrowSquareOut"
                    >
                        <Translation id="moduleCreateAdditionalBackup.howItWorksScreen.noBackupLink" />
                    </Button>
                </VStack>
            </VStack>
        </Screen>
    );
};
