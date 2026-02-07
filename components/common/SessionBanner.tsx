import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { X, MapPin, Clock, AlertTriangle } from 'lucide-react-native';
import { useSession } from '@/lib/contexts/SessionContext';
import { salesSessionApi } from '@/lib/services/sqlite-api';
import { getCurrentPosition, calculateDistance } from '@/lib/utils/geo';
import { colors, spacing, borderRadius } from '@/constants/colors';
import { useToast } from '@/hooks/useToast';
import { Button } from './Button';

export function SessionBanner() {
  const { activeSession, clearActiveSession, refreshSession } = useSession();
  const { showToast } = useToast();
  const [elapsed, setElapsed] = useState<string>('00:00');
  const [distance, setDistance] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [endingSession, setEndingSession] = useState(false);

  useEffect(() => {
    if (!activeSession) return;

    const startTime = new Date(activeSession.start_time).getTime();

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = now - startTime;
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsed(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession?.customer) return;

    const updateDistance = async () => {
      try {
        const position = await getCurrentPosition();
        if (activeSession.customer.latitude && activeSession.customer.longitude) {
          const dist = calculateDistance(
            position.latitude,
            position.longitude,
            activeSession.customer.latitude,
            activeSession.customer.longitude
          );
          setDistance(Math.round(dist));
        }
      } catch (error) {
        setDistance(null);
      }
    };

    updateDistance();
    const interval = setInterval(updateDistance, 30000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const handleEndSession = () => {
    setShowConfirmModal(true);
  };

  const confirmEndSession = async () => {
    if (!activeSession) return;

    setEndingSession(true);
    try {
      let position = { latitude: 0, longitude: 0 };
      try {
        position = await getCurrentPosition();
      } catch (err) {
        console.warn('GPS not available:', err);
      }

      await salesSessionApi.endSession(
        activeSession.id,
        position.latitude,
        position.longitude
      );

      clearActiveSession();
      await refreshSession();

      setShowConfirmModal(false);
      showToast('Session ended successfully', 'success');
    } catch (error) {
      showToast('Failed to end session. Please try again.', 'error');
    } finally {
      setEndingSession(false);
    }
  };

  if (!activeSession?.customer) return null;

  return (
    <>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.leftSection}>
            <View style={styles.badge}>
              <View style={styles.pulseDot} />
              <Text style={styles.badgeText}>ACTIVE</Text>
            </View>

            <View style={styles.info}>
              <Text style={styles.customerName} numberOfLines={1}>
                {activeSession.customer.name}
              </Text>
              <View style={styles.meta}>
                <Clock size={12} color={colors.textSecondary} />
                <Text style={styles.metaText}>{elapsed}</Text>
                {distance !== null && (
                  <>
                    <View style={styles.metaDivider} />
                    <MapPin size={12} color={colors.textSecondary} />
                    <Text style={styles.metaText}>{distance}m away</Text>
                  </>
                )}
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.endButton}
            onPress={handleEndSession}
            activeOpacity={0.7}
          >
            <X size={16} color={colors.error} />
            <Text style={styles.endButtonText}>End</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showConfirmModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => !endingSession && setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <AlertTriangle size={48} color={colors.warning} />
            </View>

            <Text style={styles.modalTitle}>End Session</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to end the session with {activeSession?.customer?.name}?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowConfirmModal(false)}
                disabled={endingSession}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <Button
                title={endingSession ? 'Ending...' : 'End Session'}
                onPress={confirmEndSession}
                disabled={endingSession}
                variant="danger"
                style={styles.confirmButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: borderRadius.full,
    backgroundColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  customerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 12,
    fontWeight: '500',
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: spacing.xs,
  },
  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  endButtonText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalIcon: {
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  confirmButton: {
    flex: 1,
    marginBottom: 0,
  },
});
