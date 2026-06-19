package com.kinmobile.modules

import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.modules.core.DeviceEventManagerModule

class AppBlockerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AppBlockerModule"

    private var blockedPackages: Set<String> = emptySet()
    private var monitoring = false
    private val handler = Handler(Looper.getMainLooper())
    private val pollIntervalMs = 2000L

    private val pollRunnable = object : Runnable {
        override fun run() {
            if (!monitoring) return
            checkForegroundApp()
            handler.postDelayed(this, pollIntervalMs)
        }
    }

    @ReactMethod
    fun setBlockedApps(packages: ReadableArray, promise: Promise) {
        val list = mutableSetOf<String>()
        for (i in 0 until packages.size()) {
            packages.getString(i)?.let { list.add(it) }
        }
        blockedPackages = list
        promise.resolve(list.size)
    }

    @ReactMethod
    fun startMonitoring(promise: Promise) {
        if (monitoring) {
            promise.resolve(true)
            return
        }
        monitoring = true
        handler.post(pollRunnable)
        promise.resolve(true)
    }

    @ReactMethod
    fun stopMonitoring(promise: Promise) {
        monitoring = false
        handler.removeCallbacks(pollRunnable)
        promise.resolve(true)
    }

    @ReactMethod
    fun isMonitoring(promise: Promise) {
        promise.resolve(monitoring)
    }

    @ReactMethod
    fun getForegroundApp(promise: Promise) {
        promise.resolve(getCurrentForegroundPackage())
    }

    private fun checkForegroundApp() {
        val foreground = getCurrentForegroundPackage() ?: return
        if (foreground in blockedPackages && foreground != reactApplicationContext.packageName) {
            bringOwnAppToFront()
            emitBlockedEvent(foreground)
        }
    }

    private fun getCurrentForegroundPackage(): String? {
        val usm = reactApplicationContext
            .getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return null

        val end = System.currentTimeMillis()
        val start = end - 5000
        val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_BEST, start, end)
        return stats?.maxByOrNull { it.lastTimeUsed }?.packageName
    }

    private fun bringOwnAppToFront() {
        try {
            val intent = reactApplicationContext.packageManager
                .getLaunchIntentForPackage(reactApplicationContext.packageName) ?: return
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            reactApplicationContext.startActivity(intent)
        } catch (_: Exception) { }
    }

    private fun emitBlockedEvent(packageName: String) {
        val params = Arguments.createMap().apply {
            putString("package_name", packageName)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("KinAppBlocked", params)
        } catch (_: Exception) { }
    }
}
