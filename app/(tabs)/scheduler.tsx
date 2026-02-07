import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { Card } from '@/components/common/Card';
import { MapPin, Calendar, Route as RouteIcon, Clock } from 'lucide-react-native';

export default function SchedulerTabScreen() {
  const router = useRouter();

  const menuItems = [
    {
      title: 'Route Management',
      description: 'Create and manage delivery routes',
      icon: <RouteIcon size={32} color={colors.primary} />,
      route: '/masters/routes',
      role: 'manager',
    },
    {
      title: 'Schedule Management',
      description: 'View and create customer schedules',
      icon: <Calendar size={32} color={colors.primary} />,
      route: '/scheduler/schedule-management',
      role: 'manager',
    },
    {
      title: 'My Schedule',
      description: 'View today\'s customer visits',
      icon: <Clock size={32} color={colors.success} />,
      route: '/scheduler/my-schedule',
      role: 'salesman',
    },
  ];

  const handleNavigate = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scheduler</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manager Functions</Text>
          <Text style={styles.sectionSubtitle}>
            Create routes and assign customer schedules
          </Text>
          <View style={styles.menuGrid}>
            {menuItems
              .filter((item) => item.role === 'manager')
              .map((item, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleNavigate(item.route)}
                  activeOpacity={0.7}
                >
                  <Card style={styles.menuCard}>
                    <View style={styles.menuIcon}>{item.icon}</View>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuDescription}>{item.description}</Text>
                  </Card>
                </TouchableOpacity>
              ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Salesman Functions</Text>
          <Text style={styles.sectionSubtitle}>
            View and manage daily schedules
          </Text>
          <View style={styles.menuGrid}>
            {menuItems
              .filter((item) => item.role === 'salesman')
              .map((item, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleNavigate(item.route)}
                  activeOpacity={0.7}
                >
                  <Card style={styles.menuCard}>
                    <View style={styles.menuIcon}>{item.icon}</View>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuDescription}>{item.description}</Text>
                  </Card>
                </TouchableOpacity>
              ))}
          </View>
        </View>

        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>About Scheduler</Text>
          <Text style={styles.infoText}>
            The Scheduler module allows managers to create delivery routes and assign customer
            visits to salesmen. Salesmen can view their daily schedules and navigate to customer
            locations.
          </Text>
          <Text style={[styles.infoText, { marginTop: 12 }]}>
            Route Management is accessible through Masters → Routes. Schedule functionality is
            being enhanced with full CRUD operations.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: colors.text },
  content: { flex: 1, padding: 20 },
  section: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  menuGrid: { gap: 16 },
  menuCard: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  menuIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  menuDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: colors.info + '10',
    borderWidth: 1,
    borderColor: colors.info + '30',
    marginBottom: 40,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
