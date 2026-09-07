import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Platform,
  StatusBar,
  Linking,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { COLORS, GLOBAL_STYLES } from '../theme';
import {
  Search,
  MapPin,
  Phone,
  Building,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  X,
  Users,
  Calendar,
  Zap,
} from 'lucide-react-native';

const PAGE_SIZE = 20;

export const STAGE_NAMES: Record<number, { name: string; short: string; color: string }> = {
  1: { name: 'Fresh Lead', short: 'Fresh', color: '#3b82f6' },
  2: { name: 'DNP (No Answer)', short: 'DNP', color: '#94a3b8' },
  3: { name: 'Follow Up', short: 'Follow Up', color: '#0d9488' },
  4: { name: 'Not Interested', short: 'Not Int.', color: '#ef4444' },
  5: { name: 'Call Later', short: 'Call Later', color: '#06b6d4' },
  6: { name: 'Already Installed', short: 'Installed', color: '#475569' },
  7: { name: 'Decision Pending', short: 'Decision', color: '#6366f1' },
  8: { name: 'Meeting Booked', short: 'Meeting', color: '#2563eb' },
  9: { name: 'Meeting Done', short: 'Done', color: '#10b981' },
  10: { name: 'Disconnected', short: 'Discon.', color: '#64748b' },
  11: { name: 'Switch Off', short: 'Off', color: '#64748b' },
  12: { name: "Can't Fit Solar", short: 'No Fit', color: '#475569' },
  13: { name: 'Sale Done', short: 'Sale Done', color: '#10b981' },
  14: { name: 'Meeting Cancelled', short: 'Cancelled', color: '#ef4444' },
};

export const LeadsListScreen = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 48 : 28) + 10;

  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<number | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch leads with 20 items per page limit
  const fetchLeads = useCallback(
    async (pageNum = 1, isRefresh = false, searchQuery = search, statusFilter = selectedStatus) => {
      if (!isRefresh) setLoading(true);

      try {
        const params: any = {
          page: pageNum,
          limit: PAGE_SIZE,
        };
        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (statusFilter !== null) params.status = String(statusFilter);

        const res = await api.leads.list(params);
        let items: any[] = [];
        let total: number | null = null;
        let calculatedPages = 1;

        if (res.success && res.data) {
          if (Array.isArray(res.data)) {
            items = res.data;
          } else if (Array.isArray(res.data.leads)) {
            items = res.data.leads;
            total = res.data.pagination?.total ?? null;
            calculatedPages = res.data.pagination?.pages || Math.ceil((total || items.length) / PAGE_SIZE) || 1;
          }

          setLeads(items);

          if (total !== null) {
            setTotalCount(total);
            setTotalPages(Math.max(1, calculatedPages));
          } else if (res.pagination) {
            const t = res.pagination.total ?? items.length;
            setTotalCount(t);
            setTotalPages(Math.max(1, res.pagination.pages || Math.ceil(t / PAGE_SIZE) || 1));
          } else {
            setTotalCount(items.length);
            setTotalPages(1);
          }
          setPage(pageNum);
        } else {
          setLeads([]);
          setTotalCount(0);
          setTotalPages(1);
        }
      } catch (e) {
        console.error('Fetch leads error:', e);
        setLeads([]);
        setTotalCount(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, selectedStatus]
  );

  // Initial load
  useEffect(() => {
    fetchLeads(1, false, search, selectedStatus);
  }, [selectedStatus]);

  // Page change handler
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      fetchLeads(newPage, false, search, selectedStatus);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };

  // Debounced search
  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchLeads(1, false, text, selectedStatus);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 350);
  };

  const handleClearSearch = () => {
    setSearch('');
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    fetchLeads(1, false, '', selectedStatus);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLeads(page, true, search, selectedStatus);
  };

  // Calculate pagination label bounds
  const startCount = leads.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endCount = totalCount !== null ? Math.min(page * PAGE_SIZE, totalCount) : (page - 1) * PAGE_SIZE + leads.length;

  // Lead card rendering
  const renderLeadCard = useCallback(
    ({ item }: { item: any }) => {
      const stage = STAGE_NAMES[item.status] || {
        name: `Stage ${item.status}`,
        short: `S${item.status}`,
        color: '#64748b',
      };

      const consultantName = item.consultant?.name || item.assignedConsultant?.name;
      const leadSource = item.leadSource || item.source;

      return (
        <View style={styles.card}>
          {/* Card Header Row: SL Code Badge & Clean Stage Status */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.leadCodeBadge}>
              <Text style={styles.leadCodeText}>{item.leadCode || `SL-${item.id}`}</Text>
            </View>

            {/* Stage Name: Pure colored text without filled box/border */}
            <Text style={[styles.stageStatusText, { color: stage.color }]}>
              {stage.name}
            </Text>
          </View>

          {/* Customer Name & Load Info */}
          <View style={styles.customerNameRow}>
            <Text style={styles.customerName} numberOfLines={1}>
              {item.customerName || 'Unnamed Customer'}
            </Text>
            {item.sanctionedLoadKw ? (
              <View style={styles.capacityPill}>
                <Zap size={11} color="#ffffff" strokeWidth={2.4} />
                <Text style={styles.capacityText}>{item.sanctionedLoadKw} kW</Text>
              </View>
            ) : null}
          </View>

          {/* Contact Details & Location Row */}
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Phone size={13} color="#64748b" style={styles.detailIcon} />
              <Text style={styles.detailText} numberOfLines={1}>
                {item.mobile || 'N/A'}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <MapPin size={13} color="#64748b" style={styles.detailIcon} />
              <Text style={styles.detailText} numberOfLines={1}>
                {item.city ? `${item.city}, ${item.state || ''}` : item.state || 'Location not specified'}
              </Text>
            </View>
          </View>

          {/* Staff & Connection Info Sub-row */}
          <View style={styles.metaRow}>
            {consultantName ? (
              <View style={styles.metaBadge}>
                <Users size={11} color="#475569" />
                <Text style={styles.metaText} numberOfLines={1}>
                  {consultantName}
                </Text>
              </View>
            ) : null}

            {leadSource ? (
              <View style={styles.sourceBadge}>
                <Text style={styles.sourceText} numberOfLines={1}>
                  {leadSource}
                </Text>
              </View>
            ) : null}

            <View style={styles.connectionBadge}>
              <Building size={11} color="#0284c7" />
              <Text style={styles.connectionText} numberOfLines={1}>
                {(item.connectionType || 'Residential').toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Card Footer: Quick Call & View Details */}
          <View style={styles.cardFooter}>
            {item.mobile ? (
              <TouchableOpacity
                style={styles.callShortcutBtn}
                onPress={() => Linking.openURL(`tel:${item.mobile}`)}
                activeOpacity={0.7}
              >
                <Phone size={11} color="#ffffff" strokeWidth={2.4} />
                <Text style={styles.callShortcutText}>Call</Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}

            <TouchableOpacity
              style={styles.viewActionHint}
              onPress={() => navigation.navigate('LeadDetails', { leadId: item.id })}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.viewActionText}>View Lead</Text>
              <ChevronRight size={14} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [navigation]
  );

  return (
    <View style={GLOBAL_STYLES.container}>
      {isFocused && <StatusBar barStyle="light-content" backgroundColor="#3b82f6" />}

      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: topInset }]}>
        <View style={styles.headerContentRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Dashboard');
              }
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={22} color="#ffffff" strokeWidth={2.4} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Lead Pipeline</Text>
              {totalCount !== null && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{totalCount} Leads</Text>
                </View>
              )}
            </View>
            <Text style={styles.headerSubtitle}>
              Showing 20 leads per page
            </Text>
          </View>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={16} color="#64748b" style={styles.searchIcon} strokeWidth={2.2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer, mobile, SL code, city..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={15} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Pipeline Stages Horizontal Filter */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={[
              styles.filterTab,
              selectedStatus === null && styles.activeFilterTab,
            ]}
            onPress={() => {
              setSelectedStatus(null);
              fetchLeads(1, false, search, null);
              flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }}
            activeOpacity={0.75}
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
                key={`stage-filter-${id}`}
                style={[
                  styles.filterTab,
                  isSelected && styles.activeFilterTab,
                ]}
                onPress={() => {
                  const targetStatus = isSelected ? null : statusId;
                  setSelectedStatus(targetStatus);
                  fetchLeads(1, false, search, targetStatus);
                  flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                }}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.stageDot,
                    { backgroundColor: val.color },
                  ]}
                />
                <Text
                  style={[
                    styles.filterTabText,
                    isSelected && styles.activeFilterTabText,
                  ]}
                >
                  {val.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Leads List with Virtualized FlatList */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Fetching leads (Page {page})...</Text>
        </View>
      ) : leads.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2563eb" colors={['#2563eb']} />
          }
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.emptyIconCircle}>
            <Users size={32} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTitle}>
            {search || selectedStatus !== null ? 'No Matching Leads' : 'No Leads Found'}
          </Text>
          <Text style={styles.emptyText}>
            {search || selectedStatus !== null
              ? 'Try changing your search keywords or resetting stage filters.'
              : 'There are no active leads in this pipeline stage right now.'}
          </Text>
          {(search.length > 0 || selectedStatus !== null) && (
            <TouchableOpacity
              style={styles.clearFiltersBtn}
              onPress={() => {
                setSearch('');
                setSelectedStatus(null);
                fetchLeads(1, false, '', null);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.clearFiltersBtnText}>Reset All Filters</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <FlatList
          ref={flatListRef}
          data={leads}
          renderItem={renderLeadCard}
          keyExtractor={(item, index) => (item?.id ? `lead-${item.id}` : `idx-${index}`)}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2563eb" colors={['#2563eb']} />
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.paginationCard}>
                <Text style={styles.paginationSummaryText}>
                  Showing <Text style={styles.paginationBold}>{startCount} - {endCount}</Text> of{' '}
                  <Text style={styles.paginationBold}>{totalCount || leads.length}</Text> leads
                </Text>

                <View style={styles.paginationButtonsRow}>
                  {/* Previous Button */}
                  <TouchableOpacity
                    style={[
                      styles.pageNavBtn,
                      page <= 1 && styles.pageNavBtnDisabled,
                    ]}
                    onPress={() => handlePageChange(page - 1)}
                    disabled={page <= 1 || loading}
                    activeOpacity={0.75}
                  >
                    <ChevronLeft size={16} color={page <= 1 ? '#94a3b8' : '#0f172a'} />
                    <Text
                      style={[
                        styles.pageNavBtnText,
                        page <= 1 && styles.pageNavBtnTextDisabled,
                      ]}
                    >
                      Previous
                    </Text>
                  </TouchableOpacity>

                  {/* Page Indicator Badge */}
                  <View style={styles.pageBadge}>
                    <Text style={styles.pageBadgeText}>
                      Page <Text style={styles.pageCurrentText}>{page}</Text> / {totalPages}
                    </Text>
                  </View>

                  {/* Next Button */}
                  <TouchableOpacity
                    style={[
                      styles.pageNavBtn,
                      page >= totalPages && styles.pageNavBtnDisabled,
                    ]}
                    onPress={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages || loading}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.pageNavBtnText,
                        page >= totalPages && styles.pageNavBtnTextDisabled,
                      ]}
                    >
                      Next
                    </Text>
                    <ChevronRight size={16} color={page >= totalPages ? '#94a3b8' : '#0f172a'} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Outfit-Bold',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Outfit-Medium',
    color: '#e0f2fe',
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#0f172a',
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
  },
  filterSection: {
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  activeFilterTab: {
    backgroundColor: '#0e1d3e',
    borderColor: '#0e1d3e',
  },
  stageDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  filterTabText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Outfit-SemiBold',
  },
  activeFilterTabText: {
    color: '#ffffff',
    fontFamily: 'Outfit-Bold',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leadCodeBadge: {
    backgroundColor: '#87CEEB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  leadCodeText: {
    fontSize: 11.5,
    fontFamily: 'Outfit-Bold',
    color: '#0e1d3e',
    letterSpacing: 0.5,
  },
  stageStatusText: {
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
    letterSpacing: 0.2,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 15.5,
    fontFamily: 'Outfit-Bold',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  capacityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  capacityText: {
    fontSize: 11,
    fontFamily: 'Outfit-Bold',
    color: '#ffffff',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  detailIcon: {
    marginRight: 5,
  },
  detailText: {
    fontSize: 12.5,
    fontFamily: 'Outfit-Medium',
    color: '#64748b',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metaText: {
    fontSize: 10.5,
    fontFamily: 'Outfit-Medium',
    color: '#475569',
  },
  sourceBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  sourceText: {
    fontSize: 10,
    fontFamily: 'Outfit-Bold',
    color: '#64748b',
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  connectionText: {
    fontSize: 9.5,
    fontFamily: 'Outfit-Bold',
    color: '#0284c7',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  callShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#10b981',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 6,
  },
  callShortcutText: {
    fontSize: 11.5,
    fontFamily: 'Outfit-Bold',
    color: '#ffffff',
  },
  viewActionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewActionText: {
    fontSize: 11.5,
    fontFamily: 'Outfit-SemiBold',
    color: '#94a3b8',
  },
  paginationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  paginationSummaryText: {
    fontSize: 12,
    fontFamily: 'Outfit-Medium',
    color: '#64748b',
    marginBottom: 12,
  },
  paginationBold: {
    fontFamily: 'Outfit-Bold',
    color: '#0f172a',
  },
  paginationButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pageNavBtnDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    opacity: 0.6,
  },
  pageNavBtnText: {
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
    color: '#0f172a',
  },
  pageNavBtnTextDisabled: {
    color: '#94a3b8',
  },
  pageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  pageBadgeText: {
    fontSize: 12,
    fontFamily: 'Outfit-Medium',
    color: '#64748b',
  },
  pageCurrentText: {
    fontFamily: 'Outfit-Bold',
    color: '#0f172a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: 'Outfit-Medium',
    color: '#64748b',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'Outfit-Bold',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  clearFiltersBtn: {
    backgroundColor: '#0e1d3e',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  clearFiltersBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
  },
});
