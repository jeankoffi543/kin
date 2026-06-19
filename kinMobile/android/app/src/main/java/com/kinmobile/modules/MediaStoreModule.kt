package com.kinmobile.modules

import android.net.Uri
import android.provider.MediaStore
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import java.text.SimpleDateFormat
import java.util.Locale

class MediaStoreModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "MediaStoreModule"

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)

    @ReactMethod
    fun getMedia(sinceTimestamp: Double, limit: Int, promise: Promise) {
        try {
            val results = WritableNativeArray()
            // MediaStore DATE_ADDED is in seconds
            val sinceSeconds = (sinceTimestamp / 1000.0).toLong()

            queryUri(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, "image", sinceSeconds, limit, results)
            queryUri(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, "video", sinceSeconds, limit, results)
            queryUri(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, "audio", sinceSeconds, limit, results)

            promise.resolve(results)
        } catch (e: Exception) {
            promise.reject("MEDIASTORE_ERROR", e.message ?: "Unknown error", e)
        }
    }

    private fun queryUri(
        uri: Uri,
        mediaType: String,
        sinceSeconds: Long,
        limit: Int,
        results: WritableNativeArray,
    ) {
        val projection = arrayOf(
            MediaStore.MediaColumns.DISPLAY_NAME,
            MediaStore.MediaColumns.SIZE,
            MediaStore.MediaColumns.DATA,
            MediaStore.MediaColumns.DATE_ADDED,
            MediaStore.MediaColumns.BUCKET_DISPLAY_NAME,
        )
        val cursor = reactApplicationContext.contentResolver.query(
            uri,
            projection,
            "${MediaStore.MediaColumns.DATE_ADDED} > ?",
            arrayOf(sinceSeconds.toString()),
            "${MediaStore.MediaColumns.DATE_ADDED} DESC LIMIT $limit",
        )
        cursor?.use {
            val nameIdx = it.getColumnIndexOrThrow(MediaStore.MediaColumns.DISPLAY_NAME)
            val sizeIdx = it.getColumnIndexOrThrow(MediaStore.MediaColumns.SIZE)
            val dataIdx = it.getColumnIndexOrThrow(MediaStore.MediaColumns.DATA)
            val dateIdx = it.getColumnIndexOrThrow(MediaStore.MediaColumns.DATE_ADDED)
            val bucketIdx = it.getColumnIndex(MediaStore.MediaColumns.BUCKET_DISPLAY_NAME)

            while (it.moveToNext()) {
                val dateMs = it.getLong(dateIdx) * 1000L
                val map = WritableNativeMap().apply {
                    putString("media_type", mediaType)
                    putString("file_name", it.getString(nameIdx) ?: "")
                    putDouble("file_size", it.getLong(sizeIdx).toDouble())
                    putString("path", it.getString(dataIdx) ?: "")
                    putString("origin_app", if (bucketIdx >= 0) it.getString(bucketIdx) ?: "" else "")
                    putString("date_added_iso", isoFormat.format(java.util.Date(dateMs)))
                    putDouble("date_added_ms", dateMs.toDouble())
                }
                results.pushMap(map)
            }
        }
    }
}
