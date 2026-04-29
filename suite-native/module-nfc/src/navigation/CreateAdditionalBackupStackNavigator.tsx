import { useSelector } from 'react-redux';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { selectIsAdditionalShamirBackupInProgress } from '@suite-common/device';
import {
    DeviceConnectionGuardScreen,
    useDeviceConnectionGuard,
} from '@suite-native/device-authorization';
import {
    type CreateAdditionalBackupStackParamList,
    CreateAdditionalBackupStackRoutes,
    stackNavigationOptionsConfig,
} from '@suite-native/navigation';

import { DisclaimerScreen } from '../screens/DisclaimerScreen';
import { ErrorScreen } from '../screens/ErrorScreen';
import { FollowInstructionsScreen } from '../screens/FollowInstructionsScreen';
import { HowItWorksScreen } from '../screens/HowItWorksScreen';
import { RecapScreen } from '../screens/RecapScreen';
import { SuccessScreen } from '../screens/SuccessScreen';

const CreateAdditionalBackupStack =
    createNativeStackNavigator<CreateAdditionalBackupStackParamList>();

const useInitialRouteName = () => {
    const { isDeviceConnectionGuardVisible } = useDeviceConnectionGuard();
    const isAlreadyInBackupMode = useSelector(selectIsAdditionalShamirBackupInProgress);

    if (isDeviceConnectionGuardVisible) {
        return CreateAdditionalBackupStackRoutes.DeviceConnectionGuard;
    }

    if (isAlreadyInBackupMode) {
        return CreateAdditionalBackupStackRoutes.FollowInstructions;
    }

    return undefined;
};

export const CreateAdditionalBackupStackNavigator = () => {
    const { isDeviceConnectionGuardVisible } = useDeviceConnectionGuard();
    const initialRouteName = useInitialRouteName();

    return (
        <CreateAdditionalBackupStack.Navigator
            screenOptions={stackNavigationOptionsConfig}
            initialRouteName={initialRouteName}
        >
            {isDeviceConnectionGuardVisible && (
                <CreateAdditionalBackupStack.Screen
                    name={CreateAdditionalBackupStackRoutes.DeviceConnectionGuard}
                    component={DeviceConnectionGuardScreen}
                />
            )}
            <CreateAdditionalBackupStack.Screen
                name={CreateAdditionalBackupStackRoutes.Disclaimer}
                component={DisclaimerScreen}
            />
            <CreateAdditionalBackupStack.Screen
                name={CreateAdditionalBackupStackRoutes.HowItWorks}
                component={HowItWorksScreen}
            />
            <CreateAdditionalBackupStack.Screen
                name={CreateAdditionalBackupStackRoutes.FollowInstructions}
                component={FollowInstructionsScreen}
            />
            <CreateAdditionalBackupStack.Screen
                name={CreateAdditionalBackupStackRoutes.Success}
                component={SuccessScreen}
            />
            <CreateAdditionalBackupStack.Screen
                name={CreateAdditionalBackupStackRoutes.Recap}
                component={RecapScreen}
            />
            <CreateAdditionalBackupStack.Screen
                name={CreateAdditionalBackupStackRoutes.Error}
                component={ErrorScreen}
            />
        </CreateAdditionalBackupStack.Navigator>
    );
};
