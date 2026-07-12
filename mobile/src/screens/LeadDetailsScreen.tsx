import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api } from '../services/api';
import { COLORS, GLOBAL_STYLES, FONTS, SIZES } from '../theme';
import { STAGE_NAMES } from './LeadsListScreen';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Building,
  User,
  Calendar,
  MessageSquare,
  Clock,
  CheckCircle2,
} from 'lucide-react-native';

export const LeadDetailsScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { leadId } = route.params;

  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'timeline'>('details');

  // Status Change Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<number | null>(null);
  const [remark, setRemark] = useState('');
  const [subStatus, setSubStatus] = useState('');
  const [followupAt, setFollowupAt] = useState('');

  const fetchLeadDetails = async () => {
    try {
      const res = await api.leads.getById(leadId);
      if (res.success && res.data) {
        setLead(res.data);
        setSelectedStatus(res.data.status);
      } else {
        Alert.alert('Error', res.message || 'Failed to load lead details.');
        navigation.goBack();
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'An error occurred fetching lead details.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadDetails();
  }, [leadId]);

  const handleStatusChange = async () => {
    if (selectedStatus === null) return;
    if (!remark.trim()) {
      Alert.alert('Required', 'Please enter a remark explaining the status change.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        to_status: selectedStatus,
        remark: remark.trim(),
      };
      if (subStatus.trim()) payload.sub_status = subStatus.trim();
      if (followupAt.trim()) payload.followup_at = new Date(followupAt).toISOString();

      const res = await api.leads.updateStatus(leadId, payload);
      if (res.success) {
        Alert.alert('Success', 'Lead status updated successfully.');
        setModalVisible(false);
        setRemark('');
        setSubStatus('');
        setFollowupAt('');
        fetchLeadDetails(); // Refresh lead info
      } else {
        Alert.alert('Error', res.message || 'Failed to update status.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to connect to server.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[GLOBAL_STYLES.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const stage = STAGE_NAMES[lead.status] || { name: `Stage ${lead.status}`, color: COLORS.textMuted };

  return (
    <View style={GLOBAL_STYLES.container}>
      {/* Header Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{lead.leadCode}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'details' && styles.activeTab]}
          onPress={() => setActiveTab('details')}
        >
          <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>Details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'timeline' && styles.activeTab]}
          onPress={() => setActiveTab('timeline')}
        >
          <Text style={[styles.tabText, activeTab === 'timeline' && styles.activeTabText]}>Timeline Log</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'details' ? (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {/* Main Info Card */}
          <View style={GLOBAL_STYLES.card}>
            <View style={styles.statusHeader}>
              <Text style={styles.sectionHeading}>Customer Details</Text>
              <View style={[styles.badge, { backgroundColor: `${stage.color}15`, borderColor: `${stage.color}40` }]}>
                <Text style={[styles.badgeText, { color: stage.color }]}>{stage.name}</Text>
              </View>
            </View>

            <Text style={styles.customerName}>{lead.customerName}</Text>

            <View style={styles.metaRow}>
              <Phone size={16} color={COLORS.primary} style={styles.metaIcon} />
              <Text style={styles.metaText}>{lead.mobile} {lead.mobileAlt ? `/ ${lead.mobileAlt}` : ''}</Text>
            </View>

            <View style={styles.metaRow}>
              <MapPin size={16} color={COLORS.primary} style={styles.metaIcon} />
              <Text style={styles.metaText}>{lead.address}, {lead.city}, {lead.state} - {lead.pinCode}</Text>
            </View>
          </View>

          {/* Connection Specs */}
          <View style={GLOBAL_STYLES.card}>
            <Text style={styles.sectionHeading}>Technical & Discom Info</Text>
            
            <View style={styles.specItem}>
              <Building size={16} color={COLORS.textMuted} style={styles.metaIcon} />
              <View>
                <Text style={styles.specLabel}>Connection Type</Text>
                <Text style={styles.specValue}>{lead.connectionType.toUpperCase()}</Text>
              </View>
            </View>

            {lead.sanctionedLoadKw !== null && (
              <View style={styles.specItem}>
                <CheckCircle2 size={16} color={COLORS.textMuted} style={styles.metaIcon} />
                <View>
                  <Text style={styles.specLabel}>Sanctioned Load</Text>
                  <Text style={styles.specValue}>{lead.sanctionedLoadKw} kW</Text>
                </View>
              </View>
            )}

            {lead.discomName && (
              <View style={styles.specItem}>
                <Building size={16} color={COLORS.textMuted} style={styles.metaIcon} />
                <View>
                  <Text style={styles.specLabel}>Electricity Discom Name</Text>
                  <Text style={styles.specValue}>{lead.discomName}</Text>
                </View>
              </View>
            )}

            {lead.connectionNumber && (
              <View style={styles.specItem}>
                <CheckCircle2 size={16} color={COLORS.textMuted} style={styles.metaIcon} />
                <View>
                  <Text style={styles.specLabel}>Connection Account Number</Text>
                  <Text style={styles.specValue}>{lead.connectionNumber}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Assignments */}
          <View style={GLOBAL_STYLES.card}>
            <Text style={styles.sectionHeading}>Executive Assignment</Text>
            
            <View style={styles.assignItem}>
              <User size={16} color={COLORS.textMuted} style={styles.metaIcon} />
              <Text style={styles.assignRole}>Consultant/PSA: </Text>
              <Text style={styles.assignName}>{lead.consultant?.name || 'Unassigned'}</Text>
            </View>

            <View style={styles.assignItem}>
              <User size={16} color={COLORS.textMuted} style={styles.metaIcon} />
              <Text style={styles.assignRole}>Team Leader: </Text>
              <Text style={styles.assignName}>{lead.tl?.name || 'Unassigned'}</Text>
            </View>

            <View style={styles.assignItem}>
              <User size={16} color={COLORS.textMuted} style={styles.metaIcon} />
              <Text style={styles.assignRole}>Manager: </Text>
              <Text style={styles.assignName}>{lead.manager?.name || 'Unassigned'}</Text>
            </View>
          </View>

          {/* Update Status Button */}
          <TouchableOpacity
            style={[GLOBAL_STYLES.button, styles.actionButton]}
            activeOpacity={0.8}
            onPress={() => setModalVisible(true)}
          >
            <Text style={GLOBAL_STYLES.buttonText}>UPDATE LEAD STATUS</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        /* Timeline log */
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.timelineContent}>
          {lead.activityLogs && lead.activityLogs.length > 0 ? (
            lead.activityLogs.map((log: any, index: number) => {
              const toStage = STAGE_NAMES[log.toStatus] || { name: `Stage ${log.toStatus}`, color: COLORS.textMuted };
              const logDate = new Date(log.createdAt).toLocaleString();
              
              return (
                <View key={log.id} style={styles.timelineItem}>
                  <View style={styles.timelinePoint} />
                  {index < lead.activityLogs.length - 1 && <View style={styles.timelineLine} />}
                  
                  <View style={[GLOBAL_STYLES.card, styles.timelineCard]}>
                    <View style={styles.timelineCardHeader}>
                      <Text style={styles.timelineDate}>{logDate}</Text>
                      <View style={[styles.miniBadge, { backgroundColor: `${toStage.color}15`, borderColor: `${toStage.color}30` }]}>
                        <Text style={[styles.miniBadgeText, { color: toStage.color }]}>{toStage.name}</Text>
                      </View>
                    </View>

                    <Text style={styles.timelineUser}>By: {log.user?.name} ({log.user?.role})</Text>
                    {log.remark ? (
                      <View style={styles.remarkContainer}>
                        <MessageSquare size={12} color={COLORS.textMuted} style={styles.remarkIcon} />
                        <Text style={styles.remarkText}>{log.remark}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.centerContainer}>
              <Text style={FONTS.body}>No activity logs recorded yet.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Status Change Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Lead Status</Text>

            {/* Select Status Horizontal Scroll */}
            <Text style={styles.modalLabel}>Select Target Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusModalScroll}>
              {Object.entries(STAGE_NAMES).map(([id, val]) => {
                const statusId = parseInt(id, 10);
                const isSelected = selectedStatus === statusId;
                return (
                  <TouchableOpacity
                    key={id}
                    style={[
                      styles.statusModalBtn,
                      isSelected && { backgroundColor: `${val.color}20`, borderColor: val.color },
                    ]}
                    onPress={() => setSelectedStatus(statusId)}
                  >
                    <Text style={[styles.statusModalText, isSelected && { color: val.color, fontWeight: '700' }]}>
                      {val.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Remark Text Input */}
            <Text style={styles.modalLabel}>Remark / Notes (Required)</Text>
            <TextInput
              style={[GLOBAL_STYLES.input, styles.modalInput]}
              placeholder="Explain the update reason..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={4}
              value={remark}
              onChangeText={setRemark}
            />

            {/* Follow up date field (optional) */}
            <Text style={styles.modalLabel}>Follow-up Date (optional, YYYY-MM-DD)</Text>
            <TextInput
              style={GLOBAL_STYLES.input}
              placeholder="e.g. 2026-07-15"
              placeholderTextColor={COLORS.textMuted}
              value={followupAt}
              onChangeText={setFollowupAt}
            />

            {/* Modal Buttons */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelModalBtn]}
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelModalBtnText}>CANCEL</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalBtn, styles.submitModalBtn, submitting && { opacity: 0.6 }]}
                onPress={handleStatusChange}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#070a13" />
                ) : (
                  <Text style={styles.submitModalBtnText}>SAVE UPDATE</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  headerSpacer: {
    width: 26,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customerName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaIcon: {
    marginRight: 10,
  },
  metaText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.02)',
    paddingTop: 12,
  },
  specLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  specValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  assignItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  assignRole: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  assignName: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  actionButton: {
    marginTop: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  timelineContent: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  timelineItem: {
    flexDirection: 'row',
    position: 'relative',
    paddingLeft: 24,
  },
  timelinePoint: {
    position: 'absolute',
    left: 2,
    top: 14,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    left: 6,
    top: 24,
    bottom: -16,
    width: 2,
    backgroundColor: COLORS.cardBorder,
  },
  timelineCard: {
    flex: 1,
    padding: 12,
    marginBottom: 16,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timelineDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  miniBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  timelineUser: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginBottom: 6,
  },
  remarkContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 6,
    padding: 8,
  },
  remarkIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  remarkText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusModalScroll: {
    marginBottom: 16,
  },
  statusModalBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
    marginRight: 8,
    marginBottom: 4,
  },
  statusModalText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  modalInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginRight: 8,
  },
  cancelModalBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  submitModalBtn: {
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  submitModalBtnText: {
    color: '#070a13',
    fontWeight: '800',
    fontSize: 13,
  },
});
