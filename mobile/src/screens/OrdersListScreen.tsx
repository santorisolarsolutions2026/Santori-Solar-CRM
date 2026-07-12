import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../services/api';
import { COLORS, GLOBAL_STYLES, FONTS, SIZES } from '../theme';
import { Search, Receipt, ArrowRight, EyeOff, IndianRupee } from 'lucide-react-native';

export const ORDER_STATUSES: Record<string, { name: string; color: string }> = {
  draft: { name: 'Draft', color: '#94a3b8' },
  submitted: { name: 'Pending Verification', color: '#f59e0b' },
  finance_verified: { name: 'Finance Verified', color: '#3b82f6' },
  ops_assigned: { name: 'Ops Assigned', color: '#a855f7' },
  completed: { name: 'Completed', color: '#10b981' },
};

export const OrdersListScreen = () => {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const fetchOrders = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (selectedStatus !== null) params.status = selectedStatus;
      
      const res = await api.orders.list(params);
      if (res.success && Array.isArray(res.data)) {
        setOrders(res.data);
      } else {
        setOrders([]);
      }
    } catch (e) {
      console.error('Fetch orders error:', e);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus]);

  const handleSearchSubmit = () => {
    fetchOrders();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders(true);
  };

  const renderOrderCard = ({ item }: { item: any }) => {
    const statusInfo = ORDER_STATUSES[item.status] || { name: item.status.toUpperCase(), color: COLORS.textMuted };
    
    // Calculate financial details
    const totalPaid = Array.isArray(item.payments)
      ? item.payments.reduce((sum: number, p: any) => sum + p.amount, 0)
      : 0;
    const balance = Math.max(0, item.totalValue - totalPaid);

    return (
      <TouchableOpacity
        style={[GLOBAL_STYLES.card, styles.cardSpacing]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderCode}>{item.orderCode}</Text>
          <View style={[styles.badge, { backgroundColor: `${statusInfo.color}15`, borderColor: `${statusInfo.color}40` }]}>
            <Text style={[styles.badgeText, { color: statusInfo.color }]}>{statusInfo.name}</Text>
          </View>
        </View>

        <Text style={styles.customerName}>{item.lead?.customerName || 'N/A'}</Text>

        <View style={styles.ledgerRow}>
          <View style={styles.ledgerBlock}>
            <Text style={styles.ledgerLabel}>Contract Value</Text>
            <Text style={styles.ledgerValue}>₹{item.totalValue.toLocaleString()}</Text>
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.ledgerBlock}>
            <Text style={styles.ledgerLabel}>Total Paid</Text>
            <Text style={[styles.ledgerValue, { color: COLORS.success }]}>₹{totalPaid.toLocaleString()}</Text>
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.ledgerBlock}>
            <Text style={styles.ledgerLabel}>Balance Due</Text>
            <Text style={[styles.ledgerValue, { color: balance > 0 ? COLORS.danger : COLORS.success }]}>
              ₹{balance.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.detailRow}>
            <Receipt size={14} color={COLORS.primary} style={styles.detailIcon} />
            <Text style={styles.detailText}>
              {item.clientType.toUpperCase()} • Connection: {item.connectionNumber || 'Pending'}
            </Text>
          </View>
          <ArrowRight size={16} color={COLORS.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={GLOBAL_STYLES.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchContainer}>
          <Search size={18} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders by name, code..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Horizontal Status Filter */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[
              styles.filterTab,
              selectedStatus === null && styles.activeFilterTab,
            ]}
            onPress={() => setSelectedStatus(null)}
          >
            <Text
              style={[
                styles.filterTabText,
                selectedStatus === null && styles.activeFilterTabText,
              ]}
            >
              All Orders
            </Text>
          </TouchableOpacity>

          {Object.entries(ORDER_STATUSES).map(([id, val]) => {
            const isSelected = selectedStatus === id;
            return (
              <TouchableOpacity
                key={id}
                style={[
                  styles.filterTab,
                  isSelected && { backgroundColor: `${val.color}20`, borderColor: val.color },
                ]}
                onPress={() => setSelectedStatus(isSelected ? null : id)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    isSelected && { color: val.color, fontWeight: '700' },
                  ]}
                >
                  {val.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Orders List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : orders.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
        >
          <EyeOff size={48} color={COLORS.textMuted} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No Orders Found</Text>
          <Text style={styles.emptyText}>
            Try changing the filter tabs, adjusting search, or pull down to refresh.
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderCard}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  searchHeader: {
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    paddingVertical: 10,
    fontSize: 14,
  },
  filterSection: {
    paddingVertical: 12,
    backgroundColor: COLORS.background,
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.cardBackground,
    marginRight: 8,
  },
  activeFilterTab: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  activeFilterTabText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  cardSpacing: {
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderCode: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  customerName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  ledgerRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    paddingVertical: 10,
    marginBottom: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  ledgerBlock: {
    alignItems: 'center',
    flex: 1,
  },
  ledgerLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  ledgerValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.cardBorder,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 6,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
