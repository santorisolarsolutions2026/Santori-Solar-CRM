import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { COLORS, GLOBAL_STYLES, FONTS, SIZES } from '../theme';
import { LogOut, Sun, Award, TrendingUp, Calendar, Users, ClipboardCheck } from 'lucide-react-native';

export const DashboardScreen = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalLeads: 12,
    closedDeals: 3,
    rank: 4,
    meetingsToday: 2,
    attendanceStatus: 'Not Checked In',
  });

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch attendance status for today
      const attendanceRes = await api.attendance.getToday();
      let attendanceStatus = 'Not Checked In';
      if (attendanceRes.success && attendanceRes.data) {
        attendanceStatus = attendanceRes.data.status === 'checked_in' ? 'Checked In' : 'Checked Out';
      }

      // 2. Fetch leads to get real counts
      const leadsRes = await api.leads.list({ limit: 100 });
      let totalLeads = 0;
      let closedDeals = 0;
      if (leadsRes.success && Array.isArray(leadsRes.data)) {
        totalLeads = leadsRes.data.length;
        // Status 13 or status 9 are typically closed/won depending on the flow
        closedDeals = leadsRes.data.filter((l: any) => l.status === 13 || l.status === 9).length;
      }

      setStats({
        totalLeads,
        closedDeals,
        rank: stats.rank, // Mock rank
        meetingsToday: stats.meetingsToday, // Mock meetings
        attendanceStatus,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loading && !refreshing) {
    return (
      <View style={[GLOBAL_STYLES.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={GLOBAL_STYLES.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
      }
    >
      {/* Top Banner */}
      <View style={styles.headerBanner}>
        <View style={styles.headerInfo}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Solar Executive'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {(user?.role || 'consultant').toUpperCase().replace('_', ' ')}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <LogOut size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        {/* Quick Status Bar */}
        <View style={[GLOBAL_STYLES.card, styles.statusCard]}>
          <View style={styles.statusRow}>
            <View style={styles.statusCol}>
              <Text style={styles.statusLabel}>ATTENDANCE</Text>
              <Text
                style={[
                  styles.statusValue,
                  {
                    color:
                      stats.attendanceStatus === 'Checked In'
                        ? COLORS.success
                        : stats.attendanceStatus === 'Checked Out'
                        ? COLORS.warning
                        : COLORS.danger,
                  },
                ]}
              >
                {stats.attendanceStatus}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statusCol}>
              <Text style={styles.statusLabel}>RANKING</Text>
              <View style={styles.rankContainer}>
                <Award size={16} color={COLORS.secondary} style={styles.rankIcon} />
                <Text style={styles.statusValue}>#{stats.rank} overall</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Performance Overview</Text>
        <View style={styles.statsGrid}>
          {/* Card 1 */}
          <View style={[GLOBAL_STYLES.card, styles.gridCard]}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <Users size={22} color="#3b82f6" />
            </View>
            <Text style={styles.gridNum}>{stats.totalLeads}</Text>
            <Text style={styles.gridLabel}>Assigned Leads</Text>
          </View>

          {/* Card 2 */}
          <View style={[GLOBAL_STYLES.card, styles.gridCard]}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <TrendingUp size={22} color="#10b981" />
            </View>
            <Text style={styles.gridNum}>{stats.closedDeals}</Text>
            <Text style={styles.gridLabel}>Sales Closed</Text>
          </View>

          {/* Card 3 */}
          <View style={[GLOBAL_STYLES.card, styles.gridCard]}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <Calendar size={22} color="#f59e0b" />
            </View>
            <Text style={styles.gridNum}>{stats.meetingsToday}</Text>
            <Text style={styles.gridLabel}>Meetings Today</Text>
          </View>

          {/* Card 4 */}
          <View style={[GLOBAL_STYLES.card, styles.gridCard]}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(6, 182, 212, 0.1)' }]}>
              <ClipboardCheck size={22} color="#06b6d4" />
            </View>
            <Text style={styles.gridNum}>
              {stats.totalLeads > 0 ? Math.round((stats.closedDeals / stats.totalLeads) * 100) : 0}%
            </Text>
            <Text style={styles.gridLabel}>Conversion Rate</Text>
          </View>
        </View>

        {/* Motivational Banner */}
        <View style={[GLOBAL_STYLES.card, styles.promoCard]}>
          <Sun size={32} color={COLORS.primary} style={styles.promoIcon} />
          <View style={styles.promoTextContainer}>
            <Text style={styles.promoTitle}>Drive Clean Energy Today</Text>
            <Text style={styles.promoDesc}>
              Make sure to follow up on high-priority leads. Connect, brief, and seal the solar deal.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBanner: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginVertical: 4,
  },
  roleBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    padding: 20,
  },
  statusCard: {
    marginTop: -10,
    marginBottom: 24,
    paddingVertical: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statusCol: {
    flex: 1,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.cardBorder,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankIcon: {
    marginRight: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gridCard: {
    width: '48%',
    padding: 16,
    alignItems: 'flex-start',
    minHeight: 110,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gridNum: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  gridLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginTop: 12,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1.5,
  },
  promoIcon: {
    marginRight: 16,
  },
  promoTextContainer: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  promoDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
});
