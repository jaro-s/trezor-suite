import { expect as jestExpect } from '@jest/globals';
import { expect as detoxExpect } from 'detox';
import { diff } from 'jest-diff';
import { isEqual, omit } from 'lodash';

import {
    BaseEvoluClient,
    checkEvoluRelayServerRunning,
    createQuery,
    immuneFixtures,
    logToRelayDocker,
    seedQuotaManagerData,
    wipeAndRestartEvoluRelayServer,
} from '@suite-common/e2e-evolu-client';
import { Model, TrezorUserEnvLink } from '@trezor/trezor-user-env-link';

import { btcDiscoveryFinishedStateT3T1 } from '../fixtures/btcDiscoveryFinishedStateT3T1';
import { btcDiscoveryFinishedStateT3W1 } from '../fixtures/btcDiscoveryFinishedStateT3W1';
import { deviceChecksDisabledState } from '../fixtures/deviceChecksDisabledState';
import { onboardingCompletedState } from '../fixtures/onboardingCompletedState';
import { onAccountDetail } from '../pageObjects/accountDetailActions';
import { onAccountDetailSettings } from '../pageObjects/accountDetailSettingsActions';
import { onAccountReceive } from '../pageObjects/accountReceiveActions';
import { onDeviceManager } from '../pageObjects/deviceManagerActions';
import { onMyAssets } from '../pageObjects/myAssetsActions';
import { onSettings } from '../pageObjects/settingsActions';
import { onTabBar } from '../pageObjects/tabBarActions';
import { openApp, preparePreloadedReduxState, prepareTrezorEmulator } from '../support/setup';
import {
    getModelFromEnv,
    scrollUntilVisible,
    waitForVisible,
    waitToHaveText,
} from '../support/utils';

type TableName = Parameters<BaseEvoluClient['readFrom']>[0];

class NativeEvoluClient extends BaseEvoluClient {
    async expectInTable(
        table: TableName,
        expectedData: Record<string, unknown>[],
        options?: { omit?: string[]; timeout?: number },
    ) {
        const omitFields = options?.omit ?? ['createdAt'];
        const timeout = options?.timeout ?? 10_000;

        const ownerId = this.evolu.appOwner.id;
        const query = createQuery(db =>
            db.selectFrom(table).where('ownerId', '=', ownerId).selectAll(),
        );

        return new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
                unsubscribe();
                const rows = this.evolu.getQueryRows(query);
                const actualOmitted = rows.map(item => omit(item, omitFields));
                reject(
                    new Error(
                        `Table "${table}" data does not match.\nDiff:\n${diff(expectedData, actualOmitted)}`,
                    ),
                );
            }, timeout);

            const check = () => {
                const rows = this.evolu.getQueryRows(query);
                const actualOmitted = rows.map(item => omit(item, omitFields));
                console.log(
                    `[EvoluClient] expectInTable table=${table}: ${rows.length} rows`,
                    rows.length > 0 ? JSON.stringify(actualOmitted) : '(empty)',
                );
                if (isEqual(expectedData, actualOmitted)) {
                    clearTimeout(timer);
                    unsubscribe();
                    resolve();
                }
            };

            // subscribeQuery fires reactively whenever rowsByQueryMapStore updates —
            // both on initial DB load and on relay sync arrival. loadQuery seeds the
            // initial load which triggers the first subscription callback.
            const unsubscribe = this.evolu.subscribeQuery(query)(check);
            void this.evolu.loadQuery(query);
        });
    }
}

const FIRST_BTC_RECEIVE_ADDRESS = 'bc1qs9alwrln4e28se4tq2nc8dnnvskg83qexuj7s9';

const preloadedState = preparePreloadedReduxState(
    onboardingCompletedState,
    getModelFromEnv() === Model.T3W1
        ? btcDiscoveryFinishedStateT3W1
        : btcDiscoveryFinishedStateT3T1,
    deviceChecksDisabledState,
);

describe('Suite Sync - Labelling [@androidOnly @T3T1 @smoke]', () => {
    let evoluClient: NativeEvoluClient;

    beforeEach(async () => {
        await checkEvoluRelayServerRunning();
        logToRelayDocker(`STARTING: ${jestExpect.getState().currentTestName!}`);
        await openApp({ args: { preloadedState } });
        logToRelayDocker(`APP RESTARTED: ${jestExpect.getState().currentTestName!}`);
        await wipeAndRestartEvoluRelayServer();
        logToRelayDocker(`RELAY WIPED: ${jestExpect.getState().currentTestName!}`);
        evoluClient = new NativeEvoluClient();
        await prepareTrezorEmulator({ seed: 'mnemonic_immune' });
        await onDeviceManager.assertDeviceSwitcherState({ title: 'Connected' });
    }, 240_000);

    afterEach(async () => {
        await evoluClient?.dispose();
        logToRelayDocker(`FINISHED: ${jestExpect.getState().currentTestName!}`);
    });

    test('Create new labels', async () => {
        const ACCOUNT_LABEL = 'Evolu write BTC account';
        const ADDRESS_LABEL = 'Evolu write BTC address';
        const OUTPUT_LABEL = 'Evolu write BTC output';
        const expectedAccountData = immuneFixtures.buildExpectedAccount({ label: ACCOUNT_LABEL });
        const expectedAddressData = immuneFixtures.buildExpectedAddress({
            address: FIRST_BTC_RECEIVE_ADDRESS,
            label: ADDRESS_LABEL,
        });
        const expectedOutputData = immuneFixtures.buildExpectedOutput({
            txId: immuneFixtures.defaultTxId,
            outputIndex: '0',
            label: OUTPUT_LABEL,
        });

        await onTabBar.navigateToSettings();
        await onSettings.enableSuiteSync();
        await onTabBar.tapBackButton();

        // Change account label
        await onTabBar.navigateToMyAssets();
        await onMyAssets.openAccountDetail({ accountName: 'Bitcoin #1' });
        const firstBtcAccountLabel = element(by.text('Bitcoin #1')).atIndex(0);
        await waitForVisible(firstBtcAccountLabel);
        await firstBtcAccountLabel.tap();
        await detoxExpect(element(by.id('@screen/AccountDetail'))).toBeVisible();

        await onAccountDetail.openSettings();
        await onAccountDetailSettings.renameAccount({ newAccountName: ACCOUNT_LABEL });
        await onTabBar.tapBackButton();

        // Change address label
        await onAccountDetail.openReceive();
        await onAccountReceive.tapShowAddressButton();
        await TrezorUserEnvLink.pressYes();

        const receiveAddressLabel = element(by.id('@receive/address-label/button'));
        await waitForVisible(receiveAddressLabel);
        await receiveAddressLabel.tap();
        await element(by.id('@label-edit-form/input')).replaceText(ADDRESS_LABEL);
        await element(by.id('@label-edit-form/confirm-button')).tap();

        // Navigate to transaction with outputs
        await onTabBar.tapBackButton();
        const transaction = element(by.id(`@transactions/item/${immuneFixtures.defaultTxId}`));
        await scrollUntilVisible(transaction, { startPositionY: 0.8 });
        await transaction.tap();

        // Change output label
        const outputLabelButton = element(
            by.id(`@transactions/output-label/${immuneFixtures.defaultTxId}/0/button`),
        );
        await waitForVisible(outputLabelButton);
        await outputLabelButton.tap();
        await element(by.id('@label-edit-form/input')).replaceText(OUTPUT_LABEL);
        await element(by.id('@label-edit-form/confirm-button')).tap();

        //Restart app (keep relay intact so labels can sync back)
        await device.terminateApp();
        await openApp({ args: { preloadedState } });
        logToRelayDocker(`APP RESTARTED: ${jestExpect.getState().currentTestName!}`);
        await prepareTrezorEmulator({ seed: 'mnemonic_immune' });
        await onDeviceManager.assertDeviceSwitcherState({ title: 'Connected' });

        //Setup sync again
        await onTabBar.navigateToSettings();
        await onSettings.enableSuiteSync();
        await onTabBar.tapBackButton();

        // Wait for account label to sync and appear in the account list
        await onTabBar.navigateToMyAssets();
        const firstAccountTitle = element(by.id('@accountList/item/title')).atIndex(0);
        await waitToHaveText(firstAccountTitle, expectedAccountData.label, {
            timeout: 30_000,
        });

        // Verify labels were synced to the relay
        await evoluClient.init({ ownerSecret: immuneFixtures.ownerSecret });
        await evoluClient.expectInTable('account', [expectedAccountData], { timeout: 30_000 });
        await evoluClient.expectInTable('address', [expectedAddressData]);
        await evoluClient.expectInTable('output', [expectedOutputData]);
    }, 360_000);

    test('Sync labels from relay', async () => {
        // Seed the relay before enabling SuiteSync so the labels are ready to sync on connect.
        const addressSeed = immuneFixtures.createAddressSeed(FIRST_BTC_RECEIVE_ADDRESS);
        const outputSeed = immuneFixtures.createOutputSeed();
        // Seed quota before init so the relay accepts writes as soon as Evolu connects.
        seedQuotaManagerData({ ownerId: immuneFixtures.ownerId });
        await evoluClient.init({ ownerSecret: immuneFixtures.ownerSecret });
        evoluClient.writeTo('wallet', immuneFixtures.walletSeed);
        evoluClient.writeTo('account', immuneFixtures.accountSeed);
        evoluClient.writeTo('address', addressSeed);
        evoluClient.writeTo('output', outputSeed);

        // Verify relay received the seeded data before the app connects.
        await evoluClient.expectInTable(
            'account',
            [immuneFixtures.buildExpectedAccount({ label: immuneFixtures.accountSeed.label })],
            { timeout: 30_000 },
        );

        await onTabBar.navigateToSettings();
        await onSettings.enableSuiteSync();
        await onTabBar.tapBackButton();

        // Wait for account label to sync and appear in the account list
        await onTabBar.navigateToMyAssets();
        const firstAccountTitle = element(by.id('@accountList/item/title')).atIndex(0);
        await waitToHaveText(firstAccountTitle, immuneFixtures.accountSeed.label, {
            timeout: 30_000,
        });

        // Wait for wallet label to sync and appear in the device switcher
        await onDeviceManager.tapDeviceSwitch();
        await waitToHaveText(by.id('@wallet/label'), immuneFixtures.walletSeed.label);
        await element(by.id('@wallet/label')).tap();

        // Verify address label synced
        await onMyAssets.openAccountDetail({ accountName: immuneFixtures.accountSeed.label });
        await onAccountDetail.openReceive();
        await onAccountReceive.tapShowAddressButton();
        await TrezorUserEnvLink.pressYes();
        await onAccountReceive.verifyReceiveAddressLabel(
            immuneFixtures.createAddressSeed(FIRST_BTC_RECEIVE_ADDRESS).label ?? '',
        );

        // Verify output label synced
        await onTabBar.tapBackButton();
        await onAccountDetail.waitForScreen();
        const transaction = element(by.id(`@transactions/item/${outputSeed.txId}`));
        // Detail page has area that cannot be dragged
        await scrollUntilVisible(transaction, { startPositionY: 0.8 });
        await transaction.tap();
        const outputLabel = element(by.id(`@transactions/output-label/${outputSeed.txId}/0/text`));
        await waitToHaveText(outputLabel, outputSeed.label);
    });
});
