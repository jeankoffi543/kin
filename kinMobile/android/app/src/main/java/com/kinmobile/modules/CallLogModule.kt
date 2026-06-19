package com.kinmobile.modules

import android.provider.CallLog
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap

class CallLogModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "CallLogModule"

    @ReactMethod
    fun getCallLogs(limit: Int, sinceTimestamp: Double, promise: Promise) {
        try {
            val cursor = reactApplicationContext.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(
                    CallLog.Calls.NUMBER,
                    CallLog.Calls.CACHED_NAME,
                    CallLog.Calls.TYPE,
                    CallLog.Calls.DURATION,
                    CallLog.Calls.DATE,
                ),
                "${CallLog.Calls.DATE} > ?",
                arrayOf(sinceTimestamp.toLong().toString()),
                "${CallLog.Calls.DATE} ASC",
            )

            val results = WritableNativeArray()
            cursor?.use { c ->
                val numberIdx = c.getColumnIndexOrThrow(CallLog.Calls.NUMBER)
                val nameIdx = c.getColumnIndex(CallLog.Calls.CACHED_NAME)
                val typeIdx = c.getColumnIndexOrThrow(CallLog.Calls.TYPE)
                val durationIdx = c.getColumnIndexOrThrow(CallLog.Calls.DURATION)
                val dateIdx = c.getColumnIndexOrThrow(CallLog.Calls.DATE)

                var count = 0
                while (c.moveToNext() && count < limit) {
                    val callType = when (c.getInt(typeIdx)) {
                        CallLog.Calls.INCOMING_TYPE -> "incoming"
                        CallLog.Calls.OUTGOING_TYPE -> "outgoing"
                        else -> "missed"
                    }
                    val map = WritableNativeMap().apply {
                        putString("phone_number", c.getString(numberIdx) ?: "")
                        if (nameIdx >= 0 && !c.isNull(nameIdx)) {
                            putString("contact_name", c.getString(nameIdx))
                        } else {
                            putNull("contact_name")
                        }
                        putString("call_type", callType)
                        putInt("duration", c.getInt(durationIdx))
                        putDouble("date", c.getLong(dateIdx).toDouble())
                    }
                    results.pushMap(map)
                    count++
                }
            }
            promise.resolve(results)
        } catch (e: Exception) {
            promise.reject("CALL_LOG_ERROR", e.message ?: "Unknown error", e)
        }
    }
}
