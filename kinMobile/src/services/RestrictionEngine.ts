import { NativeModules, DeviceEventEmitter } from 'react-native'
import { deviceApi } from '@/lib/api'
import { DeviceStorage } from '@/lib/storage'
import type { RestrictionRule } from '@/types/sync'
import type {
  CallBlockerModuleInterface,
  AppBlockerModuleInterface,
  NativeCallBlockedEvent,
  NativeAppBlockedEvent,
} from '@/types/native'

const CallBlockerModule = NativeModules.CallBlockerModule as CallBlockerModuleInterface
const AppBlockerModule = NativeModules.AppBlockerModule as AppBlockerModuleInterface

export type RestrictionState = {
  callBlocking: boolean
  appBlocking: boolean
  blockedNumbers: string[]
  blockedApps: string[]
  moduleToggles: Record<string, boolean>
}

let _state: RestrictionState = {
  callBlocking: false,
  appBlocking: false,
  blockedNumbers: [],
  blockedApps: [],
  moduleToggles: {},
}

let _listeners: Array<ReturnType<typeof DeviceEventEmitter.addListener>> = []

function parseRuleValue(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.map(String)
    if (typeof parsed === 'string') return [parsed]
    return []
  } catch {
    return value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  }
}

function parseModuleToggle(value: string): Record<string, boolean> {
  try {
    return JSON.parse(value) as Record<string, boolean>
  } catch {
    return {}
  }
}

async function applyCallBlocking(rules: RestrictionRule[]): Promise<void> {
  const numbers = rules.flatMap(r => parseRuleValue(r.value))
  _state.blockedNumbers = numbers

  if (numbers.length > 0) {
    await CallBlockerModule.setBlockedNumbers(numbers)
    if (!_state.callBlocking) {
      await CallBlockerModule.startBlocking()
      _state.callBlocking = true
    }
  } else if (_state.callBlocking) {
    await CallBlockerModule.stopBlocking()
    _state.callBlocking = false
  }
}

async function applyAppBlocking(rules: RestrictionRule[]): Promise<void> {
  const packages = rules.flatMap(r => parseRuleValue(r.value))
  _state.blockedApps = packages

  if (packages.length > 0) {
    await AppBlockerModule.setBlockedApps(packages)
    if (!_state.appBlocking) {
      await AppBlockerModule.startMonitoring()
      _state.appBlocking = true
    }
  } else if (_state.appBlocking) {
    await AppBlockerModule.stopMonitoring()
    _state.appBlocking = false
  }
}

function applyModuleToggles(rules: RestrictionRule[]): void {
  for (const rule of rules) {
    const toggles = parseModuleToggle(rule.value)
    _state.moduleToggles = { ..._state.moduleToggles, ...toggles }
  }
}

async function applyRules(rules: RestrictionRule[]): Promise<void> {
  const active = rules.filter(r => r.is_active)

  const callRules = active.filter(r => r.type === 'block_calls')
  const appRules = active.filter(r => r.type === 'app_block')
  const moduleRules = active.filter(r => r.type === 'module_toggle')

  await Promise.all([
    applyCallBlocking(callRules).catch(() => undefined),
    applyAppBlocking(appRules).catch(() => undefined),
  ])
  applyModuleToggles(moduleRules)
}

export const RestrictionEngine = {
  getState(): RestrictionState {
    return { ..._state }
  },

  isModuleEnabled(moduleName: string): boolean {
    return _state.moduleToggles[moduleName] !== false
  },

  async pullAndApply(): Promise<RestrictionState> {
    try {
      const response = await deviceApi.get<{ data: RestrictionRule[] }>('/device/restrictions')
      const raw = response.data?.data ?? (response.data as unknown as RestrictionRule[])
      const rules = Array.isArray(raw) ? raw : []

      DeviceStorage.setRestrictionRules(JSON.stringify(rules))
      await applyRules(rules)

      return { ..._state }
    } catch {
      const cached = DeviceStorage.getRestrictionRulesJson()
      if (cached) {
        try {
          const rules = JSON.parse(cached) as RestrictionRule[]
          await applyRules(rules)
        } catch {
          // Cached rules invalid
        }
      }
      return { ..._state }
    }
  },

  startEventListeners(): void {
    if (_listeners.length > 0) return

    _listeners.push(
      DeviceEventEmitter.addListener(
        'KinCallBlocked',
        (_event: NativeCallBlockedEvent) => {
          // Blocked call event — could extend with SQLite logging
        },
      ),
      DeviceEventEmitter.addListener(
        'KinAppBlocked',
        (_event: NativeAppBlockedEvent) => {
          // Blocked app event — could extend with SQLite logging
        },
      ),
    )
  },

  async stop(): Promise<void> {
    if (_state.callBlocking) {
      await CallBlockerModule.stopBlocking().catch(() => undefined)
      _state.callBlocking = false
    }
    if (_state.appBlocking) {
      await AppBlockerModule.stopMonitoring().catch(() => undefined)
      _state.appBlocking = false
    }
    for (const listener of _listeners) {
      listener.remove()
    }
    _listeners = []
  },
}
