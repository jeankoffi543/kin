package com.kinmobile.modules

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import java.text.SimpleDateFormat
import java.util.Locale

class UsageStatsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "UsageStatsModule"

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)

    @ReactMethod
    fun hasPermission(promise: Promise) {
        try {
            val appOps = reactApplicationContext
                .getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode = appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                reactApplicationContext.packageName,
            )
            promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
        } catch (e: Exception) {
            promise.reject("USAGE_STATS_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun openUsageAccessSettings(promise: Promise) {
        try {
            val intent = android.content.Intent(
                android.provider.Settings.ACTION_USAGE_ACCESS_SETTINGS,
            ).apply { addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK) }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SETTINGS_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getAppUsage(sinceTimestamp: Double, promise: Promise) {
        try {
            val usm = reactApplicationContext
                .getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

            val endTime = System.currentTimeMillis()
            // Cap lookback to 7 days maximum
            val startTime = sinceTimestamp.toLong()
                .coerceAtLeast(endTime - 7 * 24 * 60 * 60 * 1000L)

            val stats = usm.queryUsageStats(
                UsageStatsManager.INTERVAL_BEST, startTime, endTime,
            )

            val results = WritableNativeArray()
            for (s in stats ?: emptyList()) {
                if (s.totalTimeInForeground <= 0) continue
                val map = WritableNativeMap().apply {
                    putString("package_name", s.packageName)
                    putDouble("total_time_ms", s.totalTimeInForeground.toDouble())
                    putString("last_time_used", isoFormat.format(java.util.Date(s.lastTimeUsed)))
                    putString("first_time_stamp", isoFormat.format(java.util.Date(s.firstTimeStamp)))
                }
                results.pushMap(map)
            }
            promise.resolve(results)
        } catch (e: Exception) {
            promise.reject("USAGE_STATS_ERROR", e.message ?: "Unknown error", e)
        }
    }
}
