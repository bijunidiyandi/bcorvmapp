import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { Card } from '@/components/common/Card';
import {
  Truck,
  Users,
  MapPin,
  Warehouse,
  Package,
  FolderOpen,
  Tag,
} from 'lucide-react-native';

export default function MastersScreen() {
  const router = useRouter();

  const masterTypes = [
    {
      id: 'routes',
      title: 'Routes',
      description: 'Manage delivery routes',
      icon: MapPin,
      color: colors.secondary,
      route: '/masters/routes',
    },
    {
      id: 'warehouses',
      title: 'Warehouses',
      description: 'Manage warehouse locations',
      icon: Warehouse,
      color: colors.primary,
      route: '/masters/warehouses',
    },
    {
      id: 'vans',
      title: 'Vans',
      description: 'Manage van fleet',
      icon: Truck,
      color: colors.primary,
      route: '/masters/vans',
    },
    {
      id: 'item-categories',
      title: 'Item Categories',
      description: 'Manage product categories',
      icon: FolderOpen,
      color: colors.warning,
      route: '/masters/item-categories',
    },
    {
      id: 'customer-categories',
      title: 'Customer Categories',
      description: 'Manage customer segments',
      icon: Tag,
      color: colors.secondary,
      route: '/masters/customer-categories',
    },
    {
      id: 'items',
      title: 'Items',
      description: 'Manage product catalog',
      icon: Package,
      color: colors.accent,
      route: '/masters/items',
    },
    {
      id: 'customers',
      title: 'Customers',
      description: 'Manage customer database',
      icon: Users,
      color: colors.success,
      route: '/masters/customers',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Master Data</Text>
        <Text style={styles.subtitle}>Manage system configuration</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {masterTypes.map((type) => (
            <View key={type.id} style={styles.gridItem}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push(type.route as any)}
              >
                <Card style={styles.card}>
                  <View
                    style={[styles.iconContainer, { backgroundColor: type.color + '20' }]}
                  >
                    <type.icon size={28} color={type.color} />
                  </View>
                  <Text style={styles.cardTitle}>{type.title}</Text>
                  <Text style={styles.cardDescription}>{type.description}</Text>
                </Card>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 24,
    height: 150,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
