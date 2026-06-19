package com.kinmobile.modules

import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingClient
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.LocationServices
import com.kinmobile.services.GeofenceBroadcastReceiver

class GeofenceModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "GeofenceModule"

    private val client: GeofencingClient by lazy {
        LocationServices.getGeofencingClient(reactApplicationContext)
    }

    private fun buildPendingIntent(): PendingIntent {
        val intent = Intent(reactApplicationContext, GeofenceBroadcastReceiver::class.java)
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        return PendingIntent.getBroadcast(reactApplicationContext, 0, intent, flags)
    }

    @ReactMethod
    fun addGeofence(
        id: String,
        latitude: Double,
        longitude: Double,
        radiusMeters: Float,
        promise: Promise,
    ) {
        val geofence = Geofence.Builder()
            .setRequestId(id)
            .setCircularRegion(latitude, longitude, radiusMeters)
            .setExpirationDuration(Geofence.NEVER_EXPIRE)
            .setTransitionTypes(
                Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT,
            )
            .build()

        val request = GeofencingRequest.Builder()
            .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
            .addGeofence(geofence)
            .build()

        client.addGeofences(request, buildPendingIntent())
            .addOnSuccessListener { promise.resolve(true) }
            .addOnFailureListener { e: Exception -> promise.reject("GEOFENCE_ADD_ERROR", e.message ?: "error", e) }
    }

    @ReactMethod
    fun removeGeofence(id: String, promise: Promise) {
        client.removeGeofences(listOf(id))
            .addOnSuccessListener { promise.resolve(true) }
            .addOnFailureListener { e: Exception -> promise.reject("GEOFENCE_REMOVE_ERROR", e.message ?: "error", e) }
    }

    @ReactMethod
    fun removeAllGeofences(promise: Promise) {
        client.removeGeofences(buildPendingIntent())
            .addOnSuccessListener { promise.resolve(true) }
            .addOnFailureListener { e: Exception -> promise.reject("GEOFENCE_REMOVE_ERROR", e.message ?: "error", e) }
    }
}
