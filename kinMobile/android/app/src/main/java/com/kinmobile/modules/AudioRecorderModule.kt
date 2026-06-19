package com.kinmobile.modules

import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class AudioRecorderModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AudioRecorderModule"

    private var mediaRecorder: MediaRecorder? = null
    private var recordingPromise: Promise? = null
    private var filePath: String? = null

    private fun audioDir(): File {
        val dir = File(reactApplicationContext.cacheDir, "kin_audio")
        dir.mkdirs()
        return dir
    }

    @ReactMethod
    fun startRecording(durationSeconds: Int, promise: Promise) {
        if (mediaRecorder != null) {
            promise.reject("ALREADY_RECORDING", "Audio recording already in progress")
            return
        }

        val file = File(audioDir(), "mic_${System.currentTimeMillis()}.m4a")
        filePath = file.absolutePath
        recordingPromise = promise

        try {
            mediaRecorder = (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(reactApplicationContext)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }).apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(44100)
                setAudioEncodingBitRate(128_000)
                setOutputFile(file.absolutePath)
                prepare()
                start()
            }

            if (durationSeconds > 0) {
                Handler(Looper.getMainLooper()).postDelayed({
                    if (mediaRecorder != null) finishRecording()
                }, durationSeconds * 1000L)
            }
        } catch (e: Exception) {
            releaseRecorder()
            recordingPromise = null
            promise.reject("MIC_ERROR", e.message ?: "Failed to start microphone recording", e)
        }
    }

    @ReactMethod
    fun stopRecording(promise: Promise) {
        if (mediaRecorder == null) {
            promise.reject("NOT_RECORDING", "No audio recording in progress")
            return
        }
        recordingPromise = promise
        finishRecording()
    }

    @ReactMethod
    fun isRecording(promise: Promise) {
        promise.resolve(mediaRecorder != null)
    }

    private fun finishRecording() {
        try {
            mediaRecorder?.stop()
        } catch (_: Exception) { }
        releaseRecorder()
        recordingPromise?.resolve(filePath)
        recordingPromise = null
    }

    private fun releaseRecorder() {
        try { mediaRecorder?.release() } catch (_: Exception) { }
        mediaRecorder = null
    }
}
