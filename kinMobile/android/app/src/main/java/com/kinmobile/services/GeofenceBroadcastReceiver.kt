package com.kinmobile.services

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingEvent
import com.kinmobile.MainApplication

class GeofenceBroadcastReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val event = GeofencingEvent.fromIntent(intent) ?: return
        if (event.hasError()) return

        val eventType = when (event.geofenceTransition) {
            Geofence.GEOFENCE_TRANSITION_ENTER -> "enter"
            Geofence.GEOFENCE_TRANSITION_EXIT -> "exit"
            else -> return
        }

        // Explicit cast to List<Geofence> resolves the ambiguous iterator()
        @Suppress("UNCHECKED_CAST")
        val triggeringGeofences = (event.triggeringGeofences as? List<Geofence>) ?: return
        val location = event.triggeringLocation ?: return

        try {
            val reactContext = (context.applicationContext as? MainApplication)
                ?.reactHost
                ?.currentReactContext
                ?: return

            val emitter = reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)

            triggeringGeofences.forEach { geofence ->
                val params = Arguments.createMap().apply {
                    putString("geofence_id", geofence.requestId)
                    putString("event_type", eventType)
                    putDouble("latitude", location.latitude)
                    putDouble("longitude", location.longitude)
                    putDouble("timestamp", System.currentTimeMillis().toDouble())
                }
                emitter.emit("KinGeofenceEvent", params)
            }
        } catch (_: Exception) {
            // React Native not ready
        }
    }
}
