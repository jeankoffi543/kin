package com.kinmobile.modules

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.kinmobile.services.KinForegroundService

class ForegroundServiceModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ForegroundServiceModule"

    @ReactMethod
    fun start(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, KinForegroundService::class.java).apply {
                action = KinForegroundService.ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("FOREGROUND_SERVICE_ERROR", e.message ?: "Unknown error", e)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, KinForegroundService::class.java).apply {
                action = KinForegroundService.ACTION_STOP
            }
            reactApplicationContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("FOREGROUND_SERVICE_ERROR", e.message ?: "Unknown error", e)
        }
    }
}
