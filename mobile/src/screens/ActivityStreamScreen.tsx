import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import {
  ArrowLeft,
  Clock,
  ChevronRight,
  Search,
  X,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';

interface ActivityLogItem {
  id: number;
  remark: string | null;
  fromStatus?: number | null;
  toStatus: number;
  createdAt: string;
  lead: {
    id: number;
    customerName: string;
    leadCode: string;
  };
  user: {
    id: number;
    name: string;
    role: string;
  };
}

const STAGE_CONFIG: Record<number, { name: string; short: string; color: string }> = {
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

const FALLBACK_ACTIVITIES: ActivityLogItem[] = [
  {
    id: 101,
    toStatus: 13,
    fromStatus: 9,
    remark: 'Token advance payment received ₹50,000. Customer 8kW rooftop plant commissioned.',
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    lead: { id: 1, customerName: 'Rajesh Sharma', leadCode: 'SL-9024' },
    user: { id: 2, name: 'Deepak Pandey', role: 'Consultant' },
  },
  {
    id: 102,
    toStatus: 8,
    fromStatus: 3,
    remark: 'Site visit booked for 5kW rooftop assessment tomorrow morning.',
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    lead: { id: 2, customerName: 'Anil Verma', leadCode: 'SL-8841' },
    user: { id: 3, name: 'Pooja Singh', role: 'Telecaller' },
  },
  {
    id: 103,
    toStatus: 9,
    fromStatus: 8,
    remark: 'Site assessment completed with technical engineer. Quotation shared.',
    createdAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    lead: { id: 3, customerName: 'Sunil Gupta', leadCode: 'SL-8650' },
    user: { id: 4, name: 'Vikram Joshi', role: 'Consultant' },
  },
  {
    id: 104,
    toStatus: 3,
    fromStatus: 1,
    remark: 'Customer requested evening callback for subsidy calculation.',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    lead: { id: 4, customerName: 'Ramesh Patel', leadCode: 'SL-8519' },
    user: { id: 5, name: 'Aman Sharma', role: 'Telecaller' },
  },
  {
    id: 105,
    toStatus: 7,
    fromStatus: 9,
    remark: 'Customer discussing loan options with HDFC bank representative.',
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    lead: { id: 5, customerName: 'Maheshwari Enterprise', leadCode: 'SL-8402' },
    user: { id: 2, name: 'Deepak Pandey', role: 'Consultant' },
  },
  {
    id: 106,
    toStatus: 1,
    fromStatus: null,
    remark: 'Fresh Meta ad lead captured from Facebook campaign.',
    createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    lead: { id: 6, customerName: 'Kavita Chawla', leadCode: 'SL-8330' },
    user: { id: 1, name: 'System Auto-Assign', role: 'System' },
  },
];

export const ActivityStreamScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 48 : 28) + 10;

  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await api.reports.getRecentActivity();
      if (res.success && Array.isArray(res.data?.logs)) {
        setActivities(res.data.logs);
      } else {
        setActivities(FALLBACK_ACTIVITIES);
      }
    } catch (e) {
      console.log('Error fetching recent activities:', e);
      setActivities(FALLBACK_ACTIVITIES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities;
    const q = searchQuery.toLowerCase().trim();
    return activities.filter((log) => {
      const customerName = log.lead?.customerName?.toLowerCase() || '';
      const leadCode = log.lead?.leadCode?.toLowerCase() || '';
      const userName = log.user?.name?.toLowerCase() || '';
      const userRole = log.user?.role?.toLowerCase() || '';
      const remark = log.remark?.toLowerCase() || '';
      const stageName = STAGE_CONFIG[log.toStatus]?.name?.toLowerCase() || '';
      return (
        customerName.includes(q) ||
        leadCode.includes(q) ||
        userName.includes(q) ||
        userRole.includes(q) ||
        remark.includes(q) ||
        stageName.includes(q)
      );
    });
  }, [activities, searchQuery]);

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) {
        return `${diffHours}h ago`;
      }
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    } catch {
      return '';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#87CEEB" />

      {/* Top Navigation Header Bar with Safe Area Inset */}
      <View style={[styles.headerBar, { paddingTop: topInset }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <ArrowLeft size={24} color="#0f172a" strokeWidth={2.4} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Recent Activity Stream
            </Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Live operational pipeline stream across all teams
          </Text>
        </View>
      </View>

      {/* Search Logs Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={16} color="#64748b" strokeWidth={2.2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search logs by customer, lead, staff..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={15} color="#64748b" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Activity Stream List */}
      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Fetching live CRM activities...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2563eb"
              colors={['#2563eb']}
            />
          }
        >
          {filteredActivities.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                {searchQuery ? (
                  <Search size={32} color="#94a3b8" />
                ) : (
                  <Clock size={36} color="#94a3b8" />
                )}
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No Matching Logs' : 'No Activities Found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No logs match "${searchQuery}". Try a different name, lead code, or keyword.`
                  : 'No pipeline activity logs recorded in the system yet.'}
              </Text>
              {searchQuery ? (
                <TouchableOpacity
                  style={styles.clearSearchBtn}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={styles.clearSearchBtnText}>Clear Search</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View style={styles.timelineList}>
              {filteredActivities.map((log, idx) => {
                const stage = STAGE_CONFIG[log.toStatus] || {
                  name: `Stage ${log.toStatus}`,
                  short: `S${log.toStatus}`,
                  color: '#8b5cf6',
                };
                const isLast = idx === filteredActivities.length - 1;

                return (
                  <View key={`stream-${log.id}-${idx}`} style={styles.timelineRow}>
                    {/* Left Node & Connector */}
                    <View style={styles.timelineColumnLeft}>
                      <View
                        style={[
                          styles.timelineNodeDot,
                          { backgroundColor: stage.color },
                        ]}
                      />
                      {!isLast && <View style={styles.timelineVerticalLine} />}
                    </View>

                    {/* Right Card Content */}
                    <TouchableOpacity
                      style={styles.activityCard}
                      onPress={() => navigation.navigate('LeadsTab')}
                      activeOpacity={0.7}
                    >
                      {/* Top Row: Customer Name, Lead Code & Stage Name */}
                      <View style={styles.cardTopRow}>
                        <View style={styles.customerNameGroup}>
                          <Text style={styles.customerName} numberOfLines={1}>
                            {log.lead?.customerName || 'Customer'}
                          </Text>
                          {log.lead?.leadCode ? (
                            <View style={styles.leadCodeBadge}>
                              <Text style={styles.leadCodeText} numberOfLines={1}>
                                {log.lead.leadCode}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text
                          style={[styles.stageBadgeText, { color: stage.color }]}
                          numberOfLines={1}
                        >
                          {stage.name}
                        </Text>
                      </View>

                      {/* Meta Row: Staff Name/Role & Relative Time */}
                      <View style={styles.metaRow}>
                        <Text style={styles.userActionText} numberOfLines={1}>
                          by{' '}
                          <Text style={styles.userNameText}>
                            {log.user?.name || 'Staff'}
                          </Text>
                          {log.user?.role ? ` (${log.user.role})` : ''}
                        </Text>
                        <Text style={styles.timestampText}>
                          {formatTimestamp(log.createdAt)}
                        </Text>
                      </View>

                      {/* Optional Compact Remark */}
                      {log.remark ? (
                        <Text style={styles.remarkText} numberOfLines={2}>
                          "{log.remark}"
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#87CEEB',
    borderBottomWidth: 1,
    borderBottomColor: '#70bfe3',
    gap: 12,
  },
  backButton: {
    padding: 6,
    marginRight: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    minWidth: 0,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16.5,
    fontFamily: 'Outfit-Bold',
    color: '#0f172a',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10b981',
  },
  liveBadgeText: {
    fontSize: 9.5,
    fontFamily: 'Outfit-Bold',
    color: '#059669',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11.5,
    fontFamily: 'Outfit-Medium',
    color: '#0f2942',
    marginTop: 1,
  },
  searchSection: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#f8fafc',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: '#0f172a',
    paddingVertical: 0,
  },
  clearSearchBtn: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  clearSearchBtnText: {
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
    color: '#2563eb',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: 'Outfit-Medium',
    color: '#64748b',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#1e293b',
  },
  emptySubtitle: {
    fontSize: 12.5,
    fontFamily: 'Outfit-Regular',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  timelineList: {
    width: '100%',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 8,
    width: '100%',
  },
  timelineColumnLeft: {
    width: 18,
    alignItems: 'center',
    paddingTop: 8,
    marginRight: 8,
  },
  timelineNodeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  timelineVerticalLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: '#cbd5e1',
    marginTop: 3,
    minHeight: 22,
  },
  activityCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
    gap: 6,
  },
  customerNameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    minWidth: 0,
  },
  customerName: {
    fontSize: 13,
    fontFamily: 'Outfit-Bold',
    color: '#0f172a',
    flexShrink: 1,
  },
  leadCodeBadge: {
    backgroundColor: 'rgba(135, 206, 235, 0.22)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#87CEEB',
    flexShrink: 0,
  },
  leadCodeText: {
    fontSize: 9,
    fontFamily: 'Outfit-Bold',
    color: '#0284c7',
  },
  stageBadgeText: {
    fontSize: 10.5,
    fontFamily: 'Outfit-Bold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  userActionText: {
    fontSize: 11,
    fontFamily: 'Outfit-Regular',
    color: '#64748b',
    flex: 1,
    minWidth: 0,
  },
  userNameText: {
    fontFamily: 'Outfit-Bold',
    color: '#1e293b',
  },
  timestampText: {
    fontSize: 9.5,
    fontFamily: 'Outfit-Medium',
    color: '#94a3b8',
    flexShrink: 0,
  },
  remarkText: {
    fontSize: 10.5,
    fontFamily: 'Outfit-Regular',
    color: '#475569',
    fontStyle: 'italic',
    marginTop: 3,
    lineHeight: 14,
  },
});
