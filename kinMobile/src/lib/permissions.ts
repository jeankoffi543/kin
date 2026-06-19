import { PermissionsAndroid, Platform } from 'react-native'
import Geolocation from 'react-native-geolocation-service'

export const Permissions = {
  async requestAllCollectors(): Promise<{
    callLog: boolean
    sms: boolean
    contacts: boolean
    location: boolean
  }> {
    if (Platform.OS !== 'android') {
      return { callLog: false, sms: false, contacts: false, location: false }
    }

    try {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.ANSWER_PHONE_CALLS,
      ])

      const g = PermissionsAndroid.RESULTS.GRANTED
      return {
        callLog: results[PermissionsAndroid.PERMISSIONS.READ_CALL_LOG] === g,
        sms: results[PermissionsAndroid.PERMISSIONS.READ_SMS] === g,
        contacts: results[PermissionsAndroid.PERMISSIONS.READ_CONTACTS] === g,
        location: results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === g,
      }
    } catch {
      return { callLog: false, sms: false, contacts: false, location: false }
    }
  },

  async requestLocationForGps(): Promise<boolean> {
    try {
      const status = await Geolocation.requestAuthorization('whenInUse')
      return status === 'granted'
    } catch {
      return false
    }
  },

  async requestMediaPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return false
    if (Platform.Version >= 33) {
      try {
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
        ])
        const g = PermissionsAndroid.RESULTS.GRANTED
        return (
          results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] === g ||
          results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO] === g ||
          results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO] === g
        )
      } catch {
        return false
      }
    }
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      )
      return result === PermissionsAndroid.RESULTS.GRANTED
    } catch {
      return false
    }
  },

  async requestBackgroundLocation(): Promise<boolean> {
    if (Platform.OS !== 'android' || Platform.Version < 29) return true
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      )
      return result === PermissionsAndroid.RESULTS.GRANTED
    } catch {
      return false
    }
  },
}
