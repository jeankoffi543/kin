package com.kinmobile.services

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.kinmobile.MainApplication

class NotificationCollectorService : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return
        val notification = sbn.notification ?: return

        // Skip our own app's notifications
        if (sbn.packageName == applicationContext.packageName) return

        val extras = notification.extras
        val title = extras.getString("android.title") ?: ""
        val body = extras.getCharSequence("android.text")?.toString() ?: ""
        val packageName = sbn.packageName

        emitToRN(packageName, title, body, sbn.postTime)
    }

    private fun emitToRN(packageName: String, title: String, body: String, timestamp: Long) {
        try {
            val reactContext = (applicationContext as? MainApplication)
                ?.reactHost
                ?.currentReactContext
                ?: return

            val params = Arguments.createMap().apply {
                putString("package_name", packageName)
                putString("title", title)
                putString("body", body)
                putDouble("timestamp", timestamp.toDouble())
            }

            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("KinNotification", params)
        } catch (_: Exception) {
            // React Native not ready — notification silently dropped
        }
    }
}
