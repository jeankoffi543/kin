package com.kinmobile.modules

import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class PackageModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "PackageModule"

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val packages = pm.getInstalledPackages(PackageManager.GET_META_DATA)
            val results = WritableNativeArray()

            for (pkg in packages) {
                val appInfo = pkg.applicationInfo ?: continue
                // Skip system apps
                if (appInfo.flags and ApplicationInfo.FLAG_SYSTEM != 0) continue

                val appName = try {
                    pm.getApplicationLabel(appInfo).toString()
                } catch (_: Exception) {
                    pkg.packageName
                }

                val map = WritableNativeMap().apply {
                    putString("app_name", appName)
                    putString("package_name", pkg.packageName)
                    putString("installed_at", isoFormat.format(Date(pkg.firstInstallTime)))
                }
                results.pushMap(map)
            }
            promise.resolve(results)
        } catch (e: Exception) {
            promise.reject("PACKAGE_ERROR", e.message ?: "Unknown error", e)
        }
    }
}
