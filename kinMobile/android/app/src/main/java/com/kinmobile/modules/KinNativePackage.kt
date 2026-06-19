package com.kinmobile.modules

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class KinNativePackage : ReactPackage {
    override fun createNativeModules(
        reactContext: ReactApplicationContext,
    ): List<NativeModule> = listOf(
        CallLogModule(reactContext),
        SmsModule(reactContext),
        PackageModule(reactContext),
        ForegroundServiceModule(reactContext),
        NotificationModule(reactContext),
        UsageStatsModule(reactContext),
        MediaStoreModule(reactContext),
        GeofenceModule(reactContext),
        ScreenCaptureModule(reactContext),
        AudioRecorderModule(reactContext),
        CallBlockerModule(reactContext),
        AppBlockerModule(reactContext),
        QrScannerModule(reactContext),
    )

    override fun createViewManagers(
        reactContext: ReactApplicationContext,
    ): List<ViewManager<*, *>> = emptyList()
}
