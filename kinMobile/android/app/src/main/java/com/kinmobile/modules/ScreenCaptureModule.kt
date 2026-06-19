package com.kinmobile.modules

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.MediaRecorder
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.DisplayMetrics
import android.view.WindowManager
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream

class ScreenCaptureModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ScreenCaptureModule"

    companion object {
        private const val REQUEST_CODE_PROJECTION = 9001
    }

    private var projectionManager: MediaProjectionManager? = null
    private var mediaProjection: MediaProjection? = null
    private var projectionPromise: Promise? = null
    private var recordingPromise: Promise? = null
    private var mediaRecorder: MediaRecorder? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var recordingFilePath: String? = null

    private val activityListener = object : BaseActivityEventListener() {
        override fun onActivityResult(
            activity: Activity,
            requestCode: Int,
            resultCode: Int,
            data: Intent?,
        ) {
            if (requestCode != REQUEST_CODE_PROJECTION) return
            if (resultCode == Activity.RESULT_OK && data != null) {
                mediaProjection = projectionManager?.getMediaProjection(resultCode, data)
                projectionPromise?.resolve(true)
            } else {
                projectionPromise?.reject(
                    "PROJECTION_DENIED",
                    "User denied screen capture permission",
                )
            }
            projectionPromise = null
        }
    }

    init {
        reactContext.addActivityEventListener(activityListener)
    }

    @Suppress("DEPRECATION")
    private fun getMetrics(): DisplayMetrics {
        val metrics = DisplayMetrics()
        val wm = reactApplicationContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        wm.defaultDisplay.getRealMetrics(metrics)
        return metrics
    }

    private fun captureDir(): File {
        val dir = File(reactApplicationContext.cacheDir, "kin_captures")
        dir.mkdirs()
        return dir
    }

    @ReactMethod
    fun requestProjection(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No current activity available")
            return
        }
        if (mediaProjection != null) {
            promise.resolve(true)
            return
        }
        projectionManager = reactApplicationContext
            .getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        projectionPromise = promise
        activity.startActivityForResult(
            projectionManager!!.createScreenCaptureIntent(),
            REQUEST_CODE_PROJECTION,
        )
    }

    @ReactMethod
    fun hasProjection(promise: Promise) {
        promise.resolve(mediaProjection != null)
    }

    @ReactMethod
    fun takeScreenshot(promise: Promise) {
        if (mediaProjection == null) {
            promise.reject(
                "NO_PROJECTION",
                "MediaProjection not granted — call requestProjection first",
            )
            return
        }

        val metrics = getMetrics()
        val width = metrics.widthPixels
        val height = metrics.heightPixels
        val density = metrics.densityDpi

        val imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
        val vd = mediaProjection!!.createVirtualDisplay(
            "KinScreenshot",
            width, height, density,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader.surface, null, null,
        )

        imageReader.setOnImageAvailableListener({ reader ->
            var image: Image? = null
            try {
                image = reader.acquireLatestImage()
                if (image != null) {
                    val planes = image.planes
                    val buffer = planes[0].buffer
                    val pixelStride = planes[0].pixelStride
                    val rowStride = planes[0].rowStride
                    val rowPadding = rowStride - pixelStride * width
                    val bitmapWidth = width + rowPadding / pixelStride

                    val bitmap = Bitmap.createBitmap(
                        bitmapWidth, height, Bitmap.Config.ARGB_8888,
                    )
                    bitmap.copyPixelsFromBuffer(buffer)

                    val cropped = Bitmap.createBitmap(bitmap, 0, 0, width, height)
                    if (cropped !== bitmap) bitmap.recycle()

                    val file = File(
                        captureDir(), "screenshot_${System.currentTimeMillis()}.png",
                    )
                    FileOutputStream(file).use { fos ->
                        cropped.compress(Bitmap.CompressFormat.PNG, 90, fos)
                    }
                    cropped.recycle()
                    promise.resolve(file.absolutePath)
                } else {
                    promise.reject("CAPTURE_ERROR", "No image available from ImageReader")
                }
            } catch (e: Exception) {
                promise.reject("CAPTURE_ERROR", e.message ?: "Screenshot failed", e)
            } finally {
                image?.close()
                vd?.release()
                imageReader.close()
            }
        }, Handler(Looper.getMainLooper()))
    }

    @ReactMethod
    fun startRecording(durationMs: Int, promise: Promise) {
        if (mediaProjection == null) {
            promise.reject("NO_PROJECTION", "MediaProjection not granted")
            return
        }
        if (mediaRecorder != null) {
            promise.reject("ALREADY_RECORDING", "Screen recording already in progress")
            return
        }

        val metrics = getMetrics()
        val file = File(captureDir(), "recording_${System.currentTimeMillis()}.mp4")
        recordingFilePath = file.absolutePath
        recordingPromise = promise

        try {
            mediaRecorder = (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(reactApplicationContext)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }).apply {
                setVideoSource(MediaRecorder.VideoSource.SURFACE)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setVideoEncoder(MediaRecorder.VideoEncoder.H264)
                setVideoSize(metrics.widthPixels, metrics.heightPixels)
                setVideoFrameRate(24)
                setVideoEncodingBitRate(2_000_000)
                setOutputFile(file.absolutePath)
                prepare()
            }

            virtualDisplay = mediaProjection!!.createVirtualDisplay(
                "KinRecording",
                metrics.widthPixels, metrics.heightPixels, metrics.densityDpi,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                mediaRecorder!!.surface, null, null,
            )
            mediaRecorder!!.start()

            if (durationMs > 0) {
                Handler(Looper.getMainLooper()).postDelayed({
                    if (mediaRecorder != null) finishRecording()
                }, durationMs.toLong())
            }
        } catch (e: Exception) {
            cleanupRecording()
            recordingPromise = null
            promise.reject("RECORDING_ERROR", e.message ?: "Failed to start recording", e)
        }
    }

    @ReactMethod
    fun stopRecording(promise: Promise) {
        if (mediaRecorder == null) {
            promise.reject("NOT_RECORDING", "No recording in progress")
            return
        }
        recordingPromise = promise
        finishRecording()
    }

    private fun finishRecording() {
        try {
            mediaRecorder?.stop()
        } catch (_: Exception) { }
        cleanupRecording()
        recordingPromise?.resolve(recordingFilePath)
        recordingPromise = null
    }

    private fun cleanupRecording() {
        try { mediaRecorder?.release() } catch (_: Exception) { }
        mediaRecorder = null
        try { virtualDisplay?.release() } catch (_: Exception) { }
        virtualDisplay = null
    }

    @ReactMethod
    fun releaseProjection(promise: Promise) {
        mediaProjection?.stop()
        mediaProjection = null
        promise.resolve(true)
    }
}
