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
import { Search, MapPin, Phone, Building, ArrowRight, EyeOff } from 'lucide-react-native';

export const STAGE_NAMES: Record<number, { name: string; color: string }> = {
  1: { name: 'Fresh Lead', color: '#3B82F6' },
  2: { name: 'DNP (No Answer)', color: '#9CA3AF' },
  3: { name: 'Follow Up', color: '#F59E0B' },
  4: { name: 'Not Interested', color: '#EF4444' }, // Red-500
  5: { name: 'Call Later', color: '#8B5CF6' },
  6: { name: 'Already Installed', color: '#4b5563' },
  7: { name: 'Decision Pending', color: '#EAB308' },
  8: { name: 'Meeting Booked', color: '#0D9488' },
  9: { name: 'Meeting Done', color: '#0EA5E9' },
  10: { name: 'Disconnected', color: '#6B7280' },
  11: { name: 'Switch Off', color: '#4B5563' },
  12: { name: 'Can\'t Fit Solar', color: '#111827' },
  13: { name: 'Sale Done', color: '#16A34A' },
};

export const LeadsListScreen = () => {
  const navigation = useNavigation<any>();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<number | null>(null);

  const fetchLeads = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (selectedStatus !== null) params.status = String(selectedStatus);
      
      const res = await api.leads.list(params);
      if (res.success && Array.isArray(res.data)) {
        setLeads(res.data);
      } else {
        setLeads([]);
      }
    } catch (e) {
      console.error('Fetch leads error:', e);
      setLeads([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [selectedStatus]);

  const handleSearchSubmit = () => {
    fetchLeads();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLeads(true);
  };

  const renderLeadCard = ({ item }: { item: any }) => {
    const stage = STAGE_NAMES[item.status] || { name: `Stage ${item.status}`, color: COLORS.textMuted };
    
    return (
      <TouchableOpacity
        style={[GLOBAL_STYLES.card, styles.cardSpacing]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('LeadDetails', { leadId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.leadCode}>{item.leadCode}</Text>
          <View style={[styles.badge, { backgroundColor: `${stage.color}15`, borderColor: `${stage.color}40` }]}>
            <Text style={[styles.badgeText, { color: stage.color }]}>{stage.name}</Text>
          </View>
        </View>

        <Text style={styles.customerName}>{item.customerName}</Text>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Phone size={14} color={COLORS.textMuted} style={styles.detailIcon} />
            <Text style={styles.detailText}>{item.mobile}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <MapPin size={14} color={COLORS.textMuted} style={styles.detailIcon} />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.city}, {item.state}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.connectionTypeRow}>
            <Building size={14} color={COLORS.primary} style={styles.detailIcon} />
            <Text style={styles.connectionTypeText}>
              {item.connectionType.toUpperCase()} {item.sanctionedLoadKw ? `(${item.sanctionedLoadKw} kW)` : ''}
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
            placeholder="Search leads by name or code..."
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
              All Leads
            </Text>
          </TouchableOpacity>

          {Object.entries(STAGE_NAMES).map(([id, val]) => {
            const statusId = parseInt(id, 10);
            const isSelected = selectedStatus === statusId;
            return (
              <TouchableOpacity
                key={id}
                style={[
                  styles.filterTab,
                  isSelected && { backgroundColor: `${val.color}20`, borderColor: val.color },
                ]}
                onPress={() => setSelectedStatus(isSelected ? null : statusId)}
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

      {/* Leads List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : leads.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
        >
          <EyeOff size={48} color={COLORS.textMuted} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No Leads Found</Text>
          <Text style={styles.emptyText}>
            Try clearing filters or search query, or pull down to check for new leads.
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={leads}
          renderItem={renderLeadCard}
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
  leadCode: {
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
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    flex: 1,
  },
  detailIcon: {
    marginRight: 6,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  connectionTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionTypeText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
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
