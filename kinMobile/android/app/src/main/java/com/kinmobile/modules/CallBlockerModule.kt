package com.kinmobile.modules

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.telecom.TelecomManager
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.modules.core.DeviceEventManagerModule

class CallBlockerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "CallBlockerModule"

    private var blockedNumbers: Set<String> = emptySet()
    private var receiver: BroadcastReceiver? = null

    @ReactMethod
    fun setBlockedNumbers(numbers: ReadableArray, promise: Promise) {
        val list = mutableSetOf<String>()
        for (i in 0 until numbers.size()) {
            val num = numbers.getString(i)
            if (!num.isNullOrBlank()) {
                list.add(normalizeNumber(num))
            }
        }
        blockedNumbers = list
        promise.resolve(list.size)
    }

    @ReactMethod
    fun startBlocking(promise: Promise) {
        if (receiver != null) {
            promise.resolve(true)
            return
        }
        receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return
                val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
                if (state != TelephonyManager.EXTRA_STATE_RINGING) return

                @Suppress("DEPRECATION")
                val number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)
                    ?: return

                if (shouldBlock(number)) {
                    endCall(context)
                    emitBlockedEvent(number)
                }
            }
        }
        val filter = IntentFilter(TelephonyManager.ACTION_PHONE_STATE_CHANGED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactApplicationContext.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            reactApplicationContext.registerReceiver(receiver, filter)
        }
        promise.resolve(true)
    }

    @ReactMethod
    fun stopBlocking(promise: Promise) {
        if (receiver != null) {
            try {
                reactApplicationContext.unregisterReceiver(receiver)
            } catch (_: Exception) { }
            receiver = null
        }
        promise.resolve(true)
    }

    @ReactMethod
    fun isBlocking(promise: Promise) {
        promise.resolve(receiver != null)
    }

    private fun shouldBlock(incoming: String): Boolean {
        val normalized = normalizeNumber(incoming)
        return blockedNumbers.any { blocked ->
            normalized.endsWith(blocked) || blocked.endsWith(normalized)
        }
    }

    @Suppress("DEPRECATION")
    private fun endCall(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val telecomManager = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.ANSWER_PHONE_CALLS)
                == PackageManager.PERMISSION_GRANTED
            ) {
                telecomManager.endCall()
            }
        } else {
            try {
                val telephony = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
                val clazz = Class.forName(telephony.javaClass.name)
                val method = clazz.getDeclaredMethod("getITelephony")
                method.isAccessible = true
                val iTelephony = method.invoke(telephony)
                iTelephony.javaClass.getDeclaredMethod("endCall").invoke(iTelephony)
            } catch (_: Exception) { }
        }
    }

    private fun emitBlockedEvent(number: String) {
        val params = Arguments.createMap().apply {
            putString("phone_number", number)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("KinCallBlocked", params)
        } catch (_: Exception) { }
    }

    private fun normalizeNumber(number: String): String {
        return number.replace(Regex("[^0-9+]"), "")
    }
}
