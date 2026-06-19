package com.kinmobile.modules

import android.database.ContentObserver
import android.os.Handler
import android.os.Looper
import android.provider.Telephony
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class SmsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SmsModule"

    private var smsObserver: ContentObserver? = null

    @ReactMethod
    fun getMessages(limit: Int, sinceTimestamp: Double, promise: Promise) {
        try {
            val results = WritableNativeArray()
            val since = sinceTimestamp.toLong()

            val cursor = reactApplicationContext.contentResolver.query(
                Telephony.Sms.CONTENT_URI,
                arrayOf("_id", "address", "body", "date", "type"),
                "date > ?",
                arrayOf(since.toString()),
                "date ASC",
            )

            cursor?.use { c ->
                val idIdx = c.getColumnIndexOrThrow("_id")
                val addressIdx = c.getColumnIndexOrThrow("address")
                val bodyIdx = c.getColumnIndexOrThrow("body")
                val dateIdx = c.getColumnIndexOrThrow("date")
                val typeIdx = c.getColumnIndexOrThrow("type")
                var count = 0
                while (c.moveToNext() && count < limit) {
                    val rawType = c.getInt(typeIdx)
                    // Capture ALL types: inbox, sent, outbox, failed, queued, draft
                    val smsType = when (rawType) {
                        Telephony.Sms.MESSAGE_TYPE_INBOX -> "inbox"
                        Telephony.Sms.MESSAGE_TYPE_SENT,
                        Telephony.Sms.MESSAGE_TYPE_DRAFT,
                        Telephony.Sms.MESSAGE_TYPE_OUTBOX,
                        Telephony.Sms.MESSAGE_TYPE_FAILED,
                        Telephony.Sms.MESSAGE_TYPE_QUEUED -> "sent"
                        else -> null
                    }
                    if (smsType == null) continue

                    val addr = c.getString(addressIdx) ?: ""
                    if (addr.isEmpty()) continue

                    val map = WritableNativeMap().apply {
                        putInt("native_id", c.getInt(idIdx))
                        putString("address", addr)
                        putString("body", c.getString(bodyIdx) ?: "")
                        putString("type", smsType)
                        putInt("raw_type", rawType)
                        putDouble("date", c.getLong(dateIdx).toDouble())
                    }
                    results.pushMap(map)
                    count++
                }
            }

            promise.resolve(results)
        } catch (e: Exception) {
            promise.reject("SMS_ERROR", e.message ?: "Unknown error", e)
        }
    }

    @ReactMethod
    fun getCurrentIds(promise: Promise) {
        try {
            val ids = WritableNativeArray()
            val cursor = reactApplicationContext.contentResolver.query(
                Telephony.Sms.CONTENT_URI,
                arrayOf("_id"),
                null, null, null,
            )
            cursor?.use { c ->
                val idIdx = c.getColumnIndexOrThrow("_id")
                while (c.moveToNext()) {
                    ids.pushInt(c.getInt(idIdx))
                }
            }
            promise.resolve(ids)
        } catch (e: Exception) {
            promise.reject("SMS_ERROR", e.message ?: "Unknown error", e)
        }
    }

    @ReactMethod
    fun startObserver(promise: Promise) {
        try {
            stopObserverInternal()
            smsObserver = object : ContentObserver(Handler(Looper.getMainLooper())) {
                override fun onChange(selfChange: Boolean) {
                    super.onChange(selfChange)
                    try {
                        reactApplicationContext
                            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                            .emit("onSmsContentChanged", null)
                    } catch (_: Exception) {}
                }
            }
            reactApplicationContext.contentResolver.registerContentObserver(
                Telephony.Sms.CONTENT_URI, true, smsObserver!!
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SMS_OBSERVER_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopObserver(promise: Promise) {
        stopObserverInternal()
        promise.resolve(true)
    }

    private fun stopObserverInternal() {
        smsObserver?.let {
            reactApplicationContext.contentResolver.unregisterContentObserver(it)
            smsObserver = null
        }
    }

    @ReactMethod
    fun getTypeDistribution(promise: Promise) {
        try {
            val counts = WritableNativeMap()
            val typeNames = mapOf(
                1 to "inbox", 2 to "sent", 3 to "draft",
                4 to "outbox", 5 to "failed", 6 to "queued"
            )
            for ((typeInt, typeName) in typeNames) {
                val cursor = reactApplicationContext.contentResolver.query(
                    Telephony.Sms.CONTENT_URI,
                    arrayOf("count(*) as c"),
                    "type = ?",
                    arrayOf(typeInt.toString()),
                    null,
                )
                var c = 0
                cursor?.use { cur ->
                    if (cur.moveToFirst()) c = cur.getInt(0)
                }
                counts.putInt(typeName, c)
            }
            promise.resolve(counts)
        } catch (e: Exception) {
            promise.reject("SMS_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
