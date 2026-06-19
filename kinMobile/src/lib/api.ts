import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { Platform } from 'react-native'
import { DeviceStorage } from './storage'

const DEV_LAN_IP = '192.168.1.4'

const API_BASE_URL = __DEV__
  ? Platform.OS === 'android'
    ? `http://${DEV_LAN_IP}:8000/api`
    : 'http://localhost:8000/api'
  : 'https://api.kinapp.fr/api'

export const deviceApi: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Inject X-Device-UUID header on every request
deviceApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const uuid = DeviceStorage.getUuid()
  if (uuid) {
    config.headers['X-Device-UUID'] = uuid
  }
  return config
})

deviceApi.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      DeviceStorage.clearRegistration()
    }
    return Promise.reject(error)
  },
)

// One-shot verification call with an explicit UUID (before it is stored in MMKV)
export async function verifyDeviceUuid(uuid: string): Promise<boolean> {
  try {
    await axios.get(`${API_BASE_URL}/device/restrictions`, {
      timeout: 10_000,
      headers: {
        'X-Device-UUID': uuid,
        Accept: 'application/json',
      },
    })
    return true
  } catch {
    return false
  }
}
