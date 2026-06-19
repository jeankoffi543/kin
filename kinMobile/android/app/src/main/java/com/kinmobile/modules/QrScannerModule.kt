package com.kinmobile.modules

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.common.moduleinstall.ModuleInstall
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning

class QrScannerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "QrScannerModule"

    @ReactMethod
    fun scanQrCode(promise: Promise) {
        val options = GmsBarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
            .enableAutoZoom()
            .build()

        val scanner = GmsBarcodeScanning.getClient(reactApplicationContext, options)
        scanner.startScan()
            .addOnSuccessListener { barcode: Barcode ->
                promise.resolve(barcode.rawValue ?: "")
            }
            .addOnCanceledListener {
                promise.resolve(null)
            }
            .addOnFailureListener { e: Exception ->
                promise.reject("SCAN_ERROR", e.message ?: "QR scan failed", e)
            }
    }

    @ReactMethod
    fun isAvailable(promise: Promise) {
        val client = ModuleInstall.getClient(reactApplicationContext)
        val optionalApi = GmsBarcodeScanning.getClient(reactApplicationContext)
        client.areModulesAvailable(optionalApi)
            .addOnSuccessListener { response ->
                promise.resolve(response.areModulesAvailable())
            }
            .addOnFailureListener {
                promise.resolve(false)
            }
    }
}
