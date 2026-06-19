package com.kinmobile.modules

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NotificationModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "NotificationModule"

    @ReactMethod
    fun isNotificationListenerEnabled(promise: Promise) {
        try {
            val flat = Settings.Secure.getString(
                reactApplicationContext.contentResolver,
                "enabled_notification_listeners",
            ) ?: ""
            val cn = ComponentName(
                reactApplicationContext,
                "com.kinmobile.services.NotificationCollectorService",
            )
            val enabled = flat.contains(cn.flattenToString()) ||
                flat.contains(cn.flattenToShortString())
            promise.resolve(enabled)
        } catch (e: Exception) {
            promise.reject("NOTIFICATION_PERMISSION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun openNotificationListenerSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SETTINGS_ERROR", e.message, e)
        }
    }
}
