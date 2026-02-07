import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  FlatList,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadows, borderRadius, spacing, withOpacity, gradients } from '@/constants/colors';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useVan } from '@/lib/contexts/VanContext';
import { useSession } from '@/lib/contexts/SessionContext';
import { dashboardApi, vanApi } from '@/lib/services/sqlite-api';
import { DashboardMetrics, Van } from '@/lib/types/database';
import { formatCurrency } from '@/lib/utils/format';
import { MetricCard } from '@/components/common/MetricCard';
import { Card } from '@/components/common/Card';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { SessionBanner } from '@/components/common/SessionBanner';
import { Badge } from '@/components/common/Badge';
import {
  Truck,
  DollarSign,
  Users,
  AlertCircle,
  LogOut,
  ChevronDown,
  PackagePlus,
  FileText,
  X,
  Check,
  PackageX,
  PlayCircle,
  TrendingUp,
  UserCog,
  Shield,
} from 'lucide-react-native';

export default function DashboardScreen() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVanSelector, setShowVanSelector] = useState(false);
  const [vans, setVans] = useState<Van[]>([]);
  const [loadingVans, setLoadingVans] = useState(false);
  const { signOut, user, isSalesManager, isSalesman } = useAuth();
  const { selectedVan, setSelectedVan, canChangeVan } = useVan();
  const { activeSession } = useSession();
  const router = useRouter();

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setError(null);
      const data = await dashboardApi.getMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadMetrics();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const loadVans = async () => {
    setLoadingVans(true);
    try {
      const data = await vanApi.getAll();
      setVans(data);
    } catch (err) {
      console.error('Error loading vans:', err);
    } finally {
      setLoadingVans(false);
    }
  };

  const handleVanSelect = async (van: Van) => {
    await setSelectedVan(van);
    setShowVanSelector(false);
  };

  const openVanSelector = () => {
    loadVans();
    setShowVanSelector(true);
  };

  if (loading) {
    return <Loading message="Loading dashboard..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadMetrics} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Welcome back!</Text>
          <Text style={styles.userName}>{user?.user_name}</Text>
          <View style={styles.roleContainer}>
            {isSalesManager() ? (
              <>
                <Shield size={14} color={colors.primary} />
                <Text style={styles.roleText}>Sales Manager</Text>
              </>
            ) : (
              <>
                <Truck size={14} color={colors.success} />
                <Text style={styles.roleText}>Salesman</Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          {isSalesManager() && (
            <TouchableOpacity
              onPress={() => router.push('/admin/users')}
              style={styles.iconButton}
            >
              <UserCog size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleSignOut} style={styles.iconButton}>
            <LogOut size={24} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <SessionBanner />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <TouchableOpacity
          onPress={canChangeVan ? openVanSelector : undefined}
          activeOpacity={canChangeVan ? 0.7 : 1}
          disabled={!canChangeVan}
        >
          <Card style={styles.vanSelector}>
            <View style={styles.vanSelectorContent}>
              <Truck size={20} color={colors.primary} />
              <View style={styles.vanSelectorTextContainer}>
                <Text style={styles.vanSelectorText}>
                  {selectedVan ? selectedVan.code : 'Select Van'}
                </Text>
                {!canChangeVan && selectedVan && (
                  <Text style={styles.vanAssignedText}>Assigned Van</Text>
                )}
              </View>
              {canChangeVan && <ChevronDown size={20} color={colors.textSecondary} />}
            </View>
          </Card>
        </TouchableOpacity>

        {!activeSession && selectedVan && (
          <TouchableOpacity
            onPress={() => router.push('/transactions/session-management')}
            activeOpacity={0.7}
          >
            <Card style={styles.sessionCard}>
              <View style={styles.sessionCardContent}>
                <View style={styles.sessionCardLeft}>
                  <View style={styles.sessionIconContainer}>
                    <PlayCircle size={28} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.sessionCardTitle}>No Active Session</Text>
                    <Text style={styles.sessionCardSubtitle}>
                      Start a session to begin transactions
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricHalf}>
              <MetricCard
                icon={Truck}
                title="Active Vans"
                value={metrics?.activeVans || 0}
                subtitle={`of ${metrics?.totalVans || 0} total`}
                color={colors.primary}
              />
            </View>
            <View style={styles.metricHalf}>
              <MetricCard
                icon={Users}
                title="Customers"
                value={metrics?.totalCustomers || 0}
                color={colors.secondary}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Activity</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricHalf}>
              <MetricCard
                icon={DollarSign}
                title="Sales"
                value={formatCurrency(metrics?.todaySales || 0)}
                color={colors.success}
              />
            </View>
            <View style={styles.metricHalf}>
              <MetricCard
                icon={DollarSign}
                title="Collections"
                value={formatCurrency(metrics?.todayCollections || 0)}
                color={colors.info}
              />
            </View>
          </View>
        </View>

        {metrics && metrics.pendingDayCloses > 0 && (
          <Card style={styles.alertCard}>
            <View style={styles.alertContent}>
              <AlertCircle size={24} color={colors.warning} />
              <View style={styles.alertText}>
                <Text style={styles.alertTitle}>Pending Day Closes</Text>
                <Text style={styles.alertMessage}>
                  You have {metrics.pendingDayCloses} pending day close
                  {metrics.pendingDayCloses > 1 ? 's' : ''} to complete
                </Text>
              </View>
            </View>
          </Card>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/new-load')}
            >
              <View style={styles.actionIconContainer}>
                <PackagePlus size={22} color={colors.primary} />
              </View>
              <Text style={styles.actionText}>New Load</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/new-sale')}
            >
              <View style={styles.actionIconContainer}>
                <FileText size={22} color={colors.primary} />
              </View>
              <Text style={styles.actionText}>New Sale</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/sales-return')}
            >
              <View style={[styles.actionIconContainer, styles.actionIconReturn]}>
                <PackageX size={22} color={colors.error} />
              </View>
              <Text style={styles.actionText}>Sales Return</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showVanSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVanSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Van</Text>
              <TouchableOpacity
                onPress={() => setShowVanSelector(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {loadingVans ? (
              <View style={styles.modalLoading}>
                <Loading message="Loading vans..." />
              </View>
            ) : (
              <FlatList
                data={vans}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.vanItem}
                    onPress={() => handleVanSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.vanItemContent}>
                      <Truck size={20} color={colors.primary} />
                      <View style={styles.vanItemText}>
                        <Text style={styles.vanItemCode}>{item.code}</Text>
                        <Text style={styles.vanItemVehicle}>{item.vehicle_number}</Text>
                      </View>
                    </View>
                    {selectedVan?.id === item.id && (
                      <Check size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={() => (
                  <View style={styles.emptyList}>
                    <Text style={styles.emptyText}>No vans available</Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: withOpacity(colors.primary, 0.1),
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  iconButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: withOpacity(colors.primary, 0.1),
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  vanSelector: {
    marginBottom: spacing.xs,
    ...shadows.md,
  },
  vanSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  vanSelectorTextContainer: {
    flex: 1,
  },
  vanSelectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  vanAssignedText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sessionCard: {
    backgroundColor: withOpacity(colors.primary, 0.08),
    borderColor: withOpacity(colors.primary, 0.2),
    borderWidth: 2,
    ...shadows.md,
  },
  sessionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  sessionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.xl,
    backgroundColor: withOpacity(colors.primary, 0.15),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sessionCardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricHalf: {
    flex: 1,
    height: 120,
  },
  alertCard: {
    backgroundColor: withOpacity(colors.warning, 0.1),
    borderColor: withOpacity(colors.warning, 0.3),
    borderWidth: 2,
    ...shadows.sm,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  alertText: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  alertMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: withOpacity(colors.primary, 0.15),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionIconReturn: {
    backgroundColor: withOpacity(colors.accent, 0.15),
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '80%',
    paddingBottom: spacing.xl,
    ...shadows.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  modalCloseButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray100,
  },
  modalLoading: {
    height: 200,
  },
  vanItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  vanItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  vanItemText: {
    flex: 1,
  },
  vanItemCode: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  vanItemVehicle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xl,
  },
  emptyList: {
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
