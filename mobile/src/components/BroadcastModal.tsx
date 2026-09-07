import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Pencil,
  X,
  Send,
  Trash2,
  Bell,
  Calendar,
  TrendingUp,
  Users,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldCheck,
  Megaphone,
  Phone,
  MapPin,
  MessageSquare,
} from 'lucide-react-native';
import { Linking } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface BroadcastItem {
  id: number;
  title: string;
  body: string;
  createdAt: string;
}

export interface UpcomingTaskItem {
  id: string;
  type: 'meeting' | 'follow_up' | 'task';
  title: string;
  leadCode?: string;
  leadId?: number;
  customerName: string;
  mobile?: string;
  location?: string;
  dueDateTime?: string;
  formattedDue: string;
  notes?: string;
  assignedTo?: string;
  isUrgent?: boolean;
}

const FALLBACK_TASKS: UpcomingTaskItem[] = [
  {
    id: 'sample-1',
    type: 'meeting',
    title: 'Site Visit & Solar Assessment',
    leadCode: 'SL-9024',
    leadId: 1,
    customerName: 'Rajesh Sharma',
    mobile: '9876543210',
    location: 'Sector 62, Noida',
    formattedDue: 'Today at 03:30 PM',
    notes: '8kW Rooftop discussion & roof shadow analysis',
    isUrgent: true,
  },
  {
    id: 'sample-2',
    type: 'follow_up',
    title: 'Follow Up Call (Subsidy Discussion)',
    leadCode: 'SL-8841',
    leadId: 2,
    customerName: 'Anil Verma',
    mobile: '9812345678',
    location: 'Lucknow',
    formattedDue: 'Today at 05:00 PM',
    notes: 'Customer requested quotation for 5kW hybrid system',
    isUrgent: true,
  },
  {
    id: 'sample-3',
    type: 'meeting',
    title: 'Site Verification with Engineer',
    leadCode: 'SL-8650',
    leadId: 3,
    customerName: 'Sunil Gupta',
    mobile: '9765432109',
    location: 'Varanasi',
    formattedDue: 'Tomorrow at 11:00 AM',
    notes: 'Commercial meter sanction & loan document collection',
    isUrgent: false,
  },
];

interface BroadcastModalProps {
  visible: boolean;
  onClose: () => void;
  onUnreadChange?: (unreadCount: number) => void;
}

export const BroadcastModal: React.FC<BroadcastModalProps> = ({
  visible,
  onClose,
  onUnreadChange,
}) => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const isAdmin =
    user?.role === 'admin' ||
    user?.role?.startsWith('admin:') ||
    user?.role === 'director';

  const [activeTab, setActiveTab] = useState<'broadcasts' | 'reminders'>('broadcasts');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTaskItem[]>([]);

  // Compose State for Admins
  const [isComposing, setIsComposing] = useState(false);
  const [composeTitle, setComposeTitle] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  // Fetch Notifications, Broadcasts & Upcoming Tasks
  const loadData = useCallback(async () => {
    try {
      const res = await api.notifications.list();
      if (res.success && res.data) {
        const notifs: NotificationItem[] = res.data.notifications || [];
        const count: number = res.data.unreadCount || 0;
        setNotifications(notifs);
        setUnreadCount(count);
        onUnreadChange?.(count);

        // Process broadcasts
        if (res.data.recentBroadcasts && res.data.recentBroadcasts.length > 0) {
          setBroadcasts(res.data.recentBroadcasts);
        } else {
          // Fallback: aggregate announcements from notification stream
          const announcementMap = new Map<string, BroadcastItem>();
          notifs
            .filter((n) => n.type === 'announcement' || n.title.includes('📢'))
            .forEach((n) => {
              const key = `${n.title}___${n.body}`;
              if (!announcementMap.has(key)) {
                announcementMap.set(key, {
                  id: n.id,
                  title: n.title,
                  body: n.body,
                  createdAt: n.createdAt,
                });
              }
            });
          setBroadcasts(Array.from(announcementMap.values()));
        }

        // Process upcoming tasks & reminders
        if (res.data.upcomingTasks && res.data.upcomingTasks.length > 0) {
          const sortedTasks = [...res.data.upcomingTasks].sort((a, b) => {
            const timeA = a.dueDateTime ? new Date(a.dueDateTime).getTime() : 0;
            const timeB = b.dueDateTime ? new Date(b.dueDateTime).getTime() : 0;
            return timeA - timeB;
          });
          setUpcomingTasks(sortedTasks);
        } else {
          setUpcomingTasks(FALLBACK_TASKS);
        }
      } else {
        setUpcomingTasks(FALLBACK_TASKS);
      }
    } catch (error) {
      console.error('Error fetching notifications in modal:', error);
      setUpcomingTasks(FALLBACK_TASKS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      loadData();
    } else {
      setIsComposing(false);
    }
  }, [visible, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      const res = await api.notifications.markAsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        onUnreadChange?.(0);
      }
    } catch (e) {
      console.error('Error marking all as read:', e);
    }
  };

  // Mark single notification as read
  const handleMarkSingle = async (notif: NotificationItem) => {
    if (notif.isRead) return;
    try {
      await api.notifications.markAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      const newCount = Math.max(0, unreadCount - 1);
      setUnreadCount(newCount);
      onUnreadChange?.(newCount);
    } catch (e) {
      console.error('Error marking notification read:', e);
    }
  };

  // Broadcast News to Employees (Admin)
  const handleSendBroadcast = async () => {
    if (!composeTitle.trim() || !composeMessage.trim()) {
      Alert.alert('Required Fields', 'Please enter both a title and message.');
      return;
    }

    setBroadcasting(true);
    try {
      const res = await api.notifications.broadcast(
        composeTitle.trim(),
        composeMessage.trim()
      );
      if (res.success) {
        Alert.alert('Broadcast Sent', res.message || 'News broadcast sent to all employees!');
        setComposeTitle('');
        setComposeMessage('');
        setIsComposing(false);
        loadData();
      } else {
        Alert.alert('Failed', res.message || 'Could not send broadcast message.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send broadcast message.');
    } finally {
      setBroadcasting(false);
    }
  };

  // Delete Broadcast announcement across all employees (Admin)
  const handleDeleteBroadcast = (broadcastId: number) => {
    Alert.alert(
      'Delete Broadcast Announcement',
      'Are you sure you want to permanently delete this broadcast message for all employees across the CRM?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.notifications.deleteBroadcast(broadcastId);
              if (res.success) {
                Alert.alert('Deleted', 'Broadcast message removed for all employees.');
                loadData();
              } else {
                Alert.alert('Error', res.message || 'Failed to delete broadcast message.');
              }
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete broadcast.');
            }
          },
        },
      ]
    );
  };

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
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return '';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Megaphone size={17} color="#d97706" />;
      case 'meeting_booked':
        return <Calendar size={17} color="#0284c7" />;
      case 'sale_done':
        return <TrendingUp size={17} color="#10b981" />;
      case 'unreachable_lead':
        return <AlertTriangle size={17} color="#ef4444" />;
      case 'lead_assigned':
        return <Users size={17} color="#8b5cf6" />;
      case 'order_submitted':
      case 'order_verified':
        return <FileCheck size={17} color="#10b981" />;
      default:
        return <Bell size={17} color="#3b82f6" />;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
          onClose();
        }}
        accessible={false}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.modalContainer}>
              {/* Top Drag Indicator */}
              <View style={styles.dragIndicatorWrapper}>
                <View style={styles.dragIndicator} />
              </View>

          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconContainer}>
                <Megaphone size={22} color="#0e1d3e" strokeWidth={2.4} />
              </View>
              <View>
                <View style={styles.headerTitleRow}>
                  <Text style={styles.headerTitle}>Broadcasts & Reminders</Text>
                  {unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{unreadCount} New</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.headerSubtitle}>
                  Company notices, meetings & task alerts
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={19} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Quick Actions Bar (Admin Broadcast + Mark All Read) */}
          <View style={styles.actionsBar}>
            {isAdmin && (
              <TouchableOpacity
                style={[
                  styles.broadcastActionBtn,
                  isComposing && styles.broadcastActionBtnActive,
                ]}
                onPress={() => setIsComposing(!isComposing)}
                activeOpacity={0.8}
              >
                {isComposing ? (
                  <>
                    <X size={14} color="#ffffff" strokeWidth={2.4} />
                    <Text style={styles.broadcastActionBtnText}>Close Composer</Text>
                  </>
                ) : (
                  <Text style={styles.broadcastActionBtnText}>+ Broadcast Notice</Text>
                )}
              </TouchableOpacity>
            )}

            {unreadCount > 0 && (
              <TouchableOpacity
                style={styles.markAllReadBtn}
                onPress={handleMarkAllRead}
                activeOpacity={0.75}
              >
                <CheckCircle2 size={13} color="#059669" strokeWidth={2.2} />
                <Text style={styles.markAllReadText}>Mark all read</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Admin Composer Panel (Expandable) */}
          {isAdmin && isComposing && (
            <View style={styles.composerCard}>
              <View style={styles.composerHeader}>
                <View style={styles.composerHeaderLeft}>
                  <Pencil size={15} color="#0e1d3e" strokeWidth={2.2} />
                  <Text style={styles.composerTitle}>Send Company Broadcast</Text>
                </View>
                <Text style={styles.composerTargetTag}>All Active Employees</Text>
              </View>

              <Text style={styles.composerLabel}>NEWS HEADLINE / TITLE</Text>
              <TextInput
                style={styles.composerInput}
                placeholder="e.g., Office Holiday, Target Incentive, Policy Update..."
                placeholderTextColor="#94a3b8"
                value={composeTitle}
                onChangeText={setComposeTitle}
              />

              <Text style={styles.composerLabel}>DETAILED ANNOUNCEMENT</Text>
              <TextInput
                style={[styles.composerInput, styles.composerTextArea]}
                placeholder="Enter complete news details to notify all employees..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={composeMessage}
                onChangeText={setComposeMessage}
              />

              <View style={styles.composerButtonsRow}>
                <TouchableOpacity
                  style={styles.composerCancelBtn}
                  onPress={() => {
                    setIsComposing(false);
                    setComposeTitle('');
                    setComposeMessage('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.composerCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.composerSubmitBtn}
                  onPress={handleSendBroadcast}
                  disabled={broadcasting}
                  activeOpacity={0.85}
                >
                  {broadcasting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Send size={14} color="#ffffff" strokeWidth={2.4} />
                      <Text style={styles.composerSubmitText}>Send Broadcast</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Filter Tabs: Broadcasts & Task Reminders */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[
                styles.tabPill,
                activeTab === 'broadcasts' && styles.tabPillActive,
              ]}
              onPress={() => setActiveTab('broadcasts')}
              activeOpacity={0.75}
            >
              <Megaphone
                size={13}
                color={activeTab === 'broadcasts' ? '#0e1d3e' : '#64748b'}
              />
              <Text
                style={[
                  styles.tabPillText,
                  activeTab === 'broadcasts' && styles.tabPillTextActive,
                ]}
                numberOfLines={1}
              >
                Broadcasts ({broadcasts.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabPill,
                activeTab === 'reminders' && styles.tabPillActive,
              ]}
              onPress={() => setActiveTab('reminders')}
              activeOpacity={0.75}
            >
              <Clock
                size={13}
                color={activeTab === 'reminders' ? '#0e1d3e' : '#64748b'}
              />
              <Text
                style={[
                  styles.tabPillText,
                  activeTab === 'reminders' && styles.tabPillTextActive,
                ]}
                numberOfLines={1}
              >
                Task Reminders ({upcomingTasks.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable Content List */}
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Loading notifications & reminders...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#2563eb"
                  colors={['#2563eb']}
                />
              }
            >
              {activeTab === 'broadcasts' ? (
                /* Broadcast News View */
                broadcasts.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconCircle}>
                      <Megaphone size={32} color="#94a3b8" />
                    </View>
                    <Text style={styles.emptyTitle}>No Broadcasts Yet</Text>
                    <Text style={styles.emptySubtitle}>
                      Official notices and management broadcasts will appear here in real time.
                    </Text>
                  </View>
                ) : (
                  broadcasts.map((item) => (
                    <View key={`bc-${item.id}`} style={styles.broadcastCard}>
                      <View style={styles.broadcastCardHeader}>
                        <View style={styles.broadcastTagContainer}>
                          <View style={styles.broadcastPillBadge}>
                            <Megaphone size={11} color="#b45309" strokeWidth={2.4} />
                            <Text style={styles.broadcastPillText}>ANNOUNCEMENT</Text>
                          </View>
                          <Text style={styles.broadcastTime}>
                            {formatTimestamp(item.createdAt)}
                          </Text>
                        </View>

                        {isAdmin && (
                          <TouchableOpacity
                            style={styles.deleteBroadcastBtn}
                            onPress={() => handleDeleteBroadcast(item.id)}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Trash2 size={14} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>

                      <Text style={styles.broadcastHeadline}>
                        {item.title.replace(/^📢\s*/, '')}
                      </Text>

                      <Text style={styles.broadcastBody}>{item.body}</Text>

                      <View style={styles.broadcastFooter}>
                        <ShieldCheck size={13} color="#0284c7" strokeWidth={2.2} />
                        <Text style={styles.broadcastFooterText}>
                          Official Company Notice • Distributed to All Employees
                        </Text>
                      </View>
                    </View>
                  ))
                )
              ) : (
                /* Upcoming Task Reminders View */
                upcomingTasks.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconCircle}>
                      <Calendar size={32} color="#94a3b8" />
                    </View>
                    <Text style={styles.emptyTitle}>No Pending Reminders</Text>
                    <Text style={styles.emptySubtitle}>
                      You have no upcoming site visits or scheduled follow-up calls due.
                    </Text>
                  </View>
                ) : (
                  upcomingTasks.map((task) => (
                    <TouchableOpacity
                      key={`task-${task.id}`}
                      style={[
                        styles.taskCard,
                        task.isUrgent && styles.taskCardUrgent,
                      ]}
                      onPress={() => {
                        if (task.leadId) {
                          onClose();
                          navigation.navigate('LeadsTab', {
                            screen: 'LeadDetails',
                            params: { leadId: task.leadId },
                          });
                        }
                      }}
                      activeOpacity={0.85}
                    >
                      {/* Top Row: Type Tag, Urgent Badge & Scheduled Time */}
                      <View style={styles.taskCardTopRow}>
                        <View style={styles.taskTypeGroup}>
                          <View
                            style={[
                              styles.taskTypeBadge,
                              task.type === 'meeting'
                                ? styles.taskTypeBadgeMeeting
                                : styles.taskTypeBadgeFollowup,
                            ]}
                          >
                            {task.type === 'meeting' ? (
                              <Calendar size={11} color="#0284c7" strokeWidth={2.4} />
                            ) : (
                              <Clock size={11} color="#d97706" strokeWidth={2.4} />
                            )}
                            <Text
                              style={[
                                styles.taskTypeBadgeText,
                                task.type === 'meeting'
                                  ? styles.taskTypeTextMeeting
                                  : styles.taskTypeTextFollowup,
                              ]}
                            >
                              {task.type === 'meeting' ? 'SITE VISIT' : 'FOLLOW UP'}
                            </Text>
                          </View>

                          {task.isUrgent ? (
                            <View style={styles.urgentBadge}>
                              <Text style={styles.urgentBadgeText}>TODAY</Text>
                            </View>
                          ) : null}
                        </View>

                        <Text style={styles.taskDueTimeText}>
                          {task.formattedDue}
                        </Text>
                      </View>

                      {/* Customer Name & SL Code */}
                      <View style={styles.taskCustomerRow}>
                        <Text style={styles.taskCustomerName} numberOfLines={1}>
                          {task.customerName}
                        </Text>
                        {task.leadCode ? (
                          <View style={styles.leadCodeBadge}>
                            <Text style={styles.leadCodeText}>{task.leadCode}</Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Location or Description */}
                      {task.location ? (
                        <View style={styles.taskMetaRow}>
                          <MapPin size={12} color="#64748b" />
                          <Text style={styles.taskMetaText} numberOfLines={1}>
                            {task.location}
                          </Text>
                        </View>
                      ) : null}

                      {task.notes ? (
                        <View style={styles.taskNotesBox}>
                          <Text style={styles.taskNotesText} numberOfLines={2}>
                            "{task.notes}"
                          </Text>
                        </View>
                      ) : null}

                      {/* Bottom Actions: Call Button & View Lead */}
                      <View style={styles.taskCardFooter}>
                        {task.mobile ? (
                          <TouchableOpacity
                            style={styles.taskCallBtn}
                            onPress={() => Linking.openURL(`tel:${task.mobile}`)}
                            activeOpacity={0.7}
                          >
                            <Phone size={12} color="#ffffff" strokeWidth={2.2} />
                            <Text style={styles.taskCallBtnText}>Call Customer</Text>
                          </TouchableOpacity>
                        ) : (
                          <View />
                        )}

                        <View style={styles.taskCardActionHint}>
                          <Text style={styles.taskHintText}>View Lead</Text>
                          <ChevronRight size={13} color="#94a3b8" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )
              )}
            </ScrollView>
          )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.68)',
  },
  modalContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.15,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 20,
  },
  dragIndicatorWrapper: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragIndicator: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Outfit-Bold',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'Outfit-Bold',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Outfit-Medium',
    color: '#64748b',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  broadcastActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0e1d3e',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 10,
  },
  broadcastActionBtnActive: {
    backgroundColor: '#475569',
  },
  broadcastActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
  },
  markAllReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginLeft: 'auto',
  },
  markAllReadText: {
    fontSize: 11.5,
    fontFamily: 'Outfit-SemiBold',
    color: '#059669',
  },
  composerCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  composerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  composerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  composerTitle: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: '#0f172a',
  },
  composerTargetTag: {
    fontSize: 10,
    fontFamily: 'Outfit-Medium',
    color: '#475569',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  composerLabel: {
    fontSize: 10,
    fontFamily: 'Outfit-Bold',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 5,
    marginTop: 6,
  },
  composerInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: '#0f172a',
  },
  composerTextArea: {
    minHeight: 70,
  },
  composerButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  composerCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  composerCancelText: {
    fontSize: 12,
    fontFamily: 'Outfit-SemiBold',
    color: '#64748b',
  },
  composerSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  composerSubmitText: {
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
    color: '#ffffff',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 9,
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
  },
  tabPillActive: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#0e1d3e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1.5,
  },
  tabPillText: {
    fontSize: 12.5,
    fontFamily: 'Outfit-Medium',
    color: '#64748b',
  },
  tabPillTextActive: {
    fontFamily: 'Outfit-Bold',
    color: '#0e1d3e',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: 'Outfit-Medium',
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 30,
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
  broadcastCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  broadcastCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  broadcastTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  broadcastPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  broadcastPillText: {
    fontSize: 10,
    fontFamily: 'Outfit-Bold',
    color: '#b45309',
    letterSpacing: 0.3,
  },
  broadcastTime: {
    fontSize: 11,
    fontFamily: 'Outfit-Medium',
    color: '#94a3b8',
  },
  deleteBroadcastBtn: {
    padding: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  broadcastHeadline: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
    color: '#0f172a',
    marginBottom: 6,
    lineHeight: 20,
  },
  broadcastBody: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: '#334155',
    lineHeight: 19,
    marginBottom: 10,
  },
  broadcastFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  broadcastFooterText: {
    fontSize: 10.5,
    fontFamily: 'Outfit-Medium',
    color: '#0284c7',
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notifItemUnread: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  notifIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notifContent: {
    flex: 1,
  },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifTitle: {
    fontSize: 13,
    fontFamily: 'Outfit-Medium',
    color: '#1e293b',
    flex: 1,
  },
  notifTitleBold: {
    fontFamily: 'Outfit-Bold',
    color: '#0f172a',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#ef4444',
    marginLeft: 6,
  },
  notifBody: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: '#475569',
    marginTop: 3,
    lineHeight: 17,
  },
  notifTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  notifTimeText: {
    fontSize: 10,
    fontFamily: 'Outfit-Regular',
    color: '#94a3b8',
  },
  /* Task Reminders Styling */
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1.5,
    borderLeftWidth: 4,
    borderLeftColor: '#0284c7',
  },
  taskCardUrgent: {
    borderLeftColor: '#f59e0b',
    backgroundColor: '#fffdfa',
  },
  taskCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  taskTypeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  taskTypeBadgeMeeting: {
    backgroundColor: '#e0f2fe',
  },
  taskTypeBadgeFollowup: {
    backgroundColor: '#fef3c7',
  },
  taskTypeBadgeText: {
    fontSize: 9.5,
    fontFamily: 'Outfit-Bold',
    letterSpacing: 0.3,
  },
  taskTypeTextMeeting: {
    color: '#0284c7',
  },
  taskTypeTextFollowup: {
    color: '#b45309',
  },
  urgentBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.8,
    borderColor: '#fca5a5',
  },
  urgentBadgeText: {
    fontSize: 9,
    fontFamily: 'Outfit-Bold',
    color: '#dc2626',
    letterSpacing: 0.5,
  },
  taskDueTimeText: {
    fontSize: 11,
    fontFamily: 'Outfit-Bold',
    color: '#0e1d3e',
  },
  taskCustomerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  taskCustomerName: {
    fontSize: 14,
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
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  taskMetaText: {
    fontSize: 11.5,
    fontFamily: 'Outfit-Regular',
    color: '#64748b',
    flex: 1,
  },
  taskNotesBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  taskNotesText: {
    fontSize: 11,
    fontFamily: 'Outfit-Regular',
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 15,
  },
  taskCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  taskCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  taskCallBtnText: {
    fontSize: 11,
    fontFamily: 'Outfit-Bold',
    color: '#ffffff',
  },
  taskCardActionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  taskHintText: {
    fontSize: 11,
    fontFamily: 'Outfit-Medium',
    color: '#94a3b8',
  },
});
