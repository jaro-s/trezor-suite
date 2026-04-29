import { useState } from 'react';

import { useNavigation } from '@react-navigation/native';

import { Box, Button, Card, CheckBox, HStack, Text, VStack } from '@suite-native/atoms';
import { Translation } from '@suite-native/intl';
import {
    type CreateAdditionalBackupStackParamList,
    CreateAdditionalBackupStackRoutes,
    Screen,
    ScreenHeader,
    type StackNavigationProps,
} from '@suite-native/navigation';
import { prepareNativeStyle, useNativeStyles } from '@trezor/styles-native';

const flexFillStyle = prepareNativeStyle(() => ({
    flex: 1,
}));

type NavigationProp = StackNavigationProps<
    CreateAdditionalBackupStackParamList,
    CreateAdditionalBackupStackRoutes.Disclaimer
>;

export const DisclaimerScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const { applyStyle } = useNativeStyles();
    const [isChecked, setIsChecked] = useState(false);

    const handleContinue = () => {
        navigation.navigate(CreateAdditionalBackupStackRoutes.HowItWorks);
    };

    return (
        <Screen header={<ScreenHeader />}>
            <VStack flex={1} justifyContent="space-between">
                <VStack spacing="sp24">
                    <VStack spacing="sp4">
                        <Text variant="body-sm-strong" color="contentBrand" textAlign="center">
                            <Translation id="moduleCreateAdditionalBackup.disclaimerScreen.label" />
                        </Text>
                        <Text variant="headline-md" textAlign="center">
                            <Translation id="moduleCreateAdditionalBackup.disclaimerScreen.title" />
                        </Text>
                    </VStack>

                    <VStack spacing="sp16">
                        <VStack spacing="sp4">
                            <Text variant="body-md-strong">
                                <Translation id="moduleCreateAdditionalBackup.disclaimerScreen.howItWorks.title" />
                            </Text>
                            <Text variant="body-sm" color="contentSecondary">
                                <Translation id="moduleCreateAdditionalBackup.disclaimerScreen.howItWorks.description" />
                            </Text>
                        </VStack>
                        <VStack spacing="sp4">
                            <Text variant="body-md-strong">
                                <Translation id="moduleCreateAdditionalBackup.disclaimerScreen.currentBackup.title" />
                            </Text>
                            <Text variant="body-sm" color="contentSecondary">
                                <Translation id="moduleCreateAdditionalBackup.disclaimerScreen.currentBackup.description" />
                            </Text>
                        </VStack>
                    </VStack>

                    <Card>
                        <HStack spacing="sp12" alignItems="center">
                            <Text style={applyStyle(flexFillStyle)}>
                                <Translation id="moduleCreateAdditionalBackup.disclaimerScreen.checkbox" />
                            </Text>
                            <CheckBox
                                isChecked={isChecked}
                                onChange={() => setIsChecked(prev => !prev)}
                                testID="@create-additional-backup/disclaimer-checkbox"
                            />
                        </HStack>
                    </Card>
                </VStack>

                {isChecked && (
                    <Box>
                        <Button
                            onPress={handleContinue}
                            isFullWidth
                            testID="@create-additional-backup/disclaimer-continue"
                        >
                            <Translation id="generic.buttons.continue" />
                        </Button>
                    </Box>
                )}
            </VStack>
        </Screen>
    );
};
