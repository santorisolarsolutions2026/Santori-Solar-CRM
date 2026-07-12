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
import { useAuth } from '../context/AuthContext';
import { COLORS, GLOBAL_STYLES, FONTS, SIZES } from '../theme';
import { ORDER_STATUSES } from './OrdersListScreen';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Building,
  User,
  Calendar,
  MessageSquare,
  IndianRupee,
  FileText,
  CreditCard,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';

export const OrderDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { orderId } = route.params;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'financials' | 'documents'>('financials');

  // Modals visibility
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Record Payment Form State
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('online');
  const [payRef, setPayRef] = useState('');
  const [payRemarks, setPayRemarks] = useState('');

  // Verify Form State
  const [verifyApprove, setVerifyApprove] = useState<boolean | null>(null);
  const [verifyRemark, setVerifyRemark] = useState('');

  const fetchOrderDetails = async () => {
    try {
      const res = await api.orders.getById(orderId);
      if (res.success && res.data) {
        setOrder(res.data);
      } else {
        Alert.alert('Error', res.message || 'Failed to load order details.');
        navigation.goBack();
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'An error occurred fetching order details.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const handleRecordPayment = async () => {
    if (!payAmount.trim() || isNaN(parseFloat(payAmount)) || parseFloat(payAmount) <= 0) {
      Alert.alert('Required', 'Please enter a valid payment amount.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.finance.recordPayment({
        orderId,
        amount: parseFloat(payAmount),
        paymentMethod: payMethod,
        transactionRef: payRef.trim() || undefined,
        remarks: payRemarks.trim() || undefined,
      });

      if (res.success) {
        Alert.alert('Success', 'Payment transaction recorded successfully.');
        setPaymentModalVisible(false);
        setPayAmount('');
        setPayRef('');
        setPayRemarks('');
        fetchOrderDetails();
      } else {
        Alert.alert('Error', res.message || 'Failed to record payment.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to connect to server.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyOrder = async () => {
    if (verifyApprove === null) {
      Alert.alert('Required', 'Please select Approve or Reject.');
      return;
    }
    if (!verifyApprove && !verifyRemark.trim()) {
      Alert.alert('Required', 'Please enter a rejection reason.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.orders.verify(orderId, verifyApprove, verifyRemark.trim());
      if (res.success) {
        Alert.alert('Success', `Order ${verifyApprove ? 'approved' : 'rejected'} successfully.`);
        setVerifyModalVisible(false);
        setVerifyApprove(null);
        setVerifyRemark('');
        fetchOrderDetails();
      } else {
        Alert.alert('Error', res.message || 'Failed to submit verification.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to connect to server.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[GLOBAL_STYLES.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const statusInfo = ORDER_STATUSES[order.status] || { name: order.status.toUpperCase(), color: COLORS.textMuted };
  
  // Calculate payments
  const totalPaid = Array.isArray(order.payments)
    ? order.payments.reduce((sum: number, p: any) => sum + p.amount, 0)
    : 0;
  const balance = Math.max(0, order.totalValue - totalPaid);

  // Role permissions
  const canVerify = user?.role === 'admin' || user?.role === 'finance' || user?.role === 'director';

  return (
    <View style={GLOBAL_STYLES.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{order.orderCode}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'financials' && styles.activeTab]}
          onPress={() => setActiveTab('financials')}
        >
          <Text style={[styles.tabText, activeTab === 'financials' && styles.activeTabText]}>Ledger & Payments</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'documents' && styles.activeTab]}
          onPress={() => setActiveTab('documents')}
        >
          <Text style={[styles.tabText, activeTab === 'documents' && styles.activeTabText]}>Tech Documents</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'financials' ? (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {/* Status & Name Card */}
          <View style={GLOBAL_STYLES.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionHeading}>Order Summary</Text>
              <View style={[styles.badge, { backgroundColor: `${statusInfo.color}15`, borderColor: `${statusInfo.color}40` }]}>
                <Text style={[styles.badgeText, { color: statusInfo.color }]}>{statusInfo.name}</Text>
              </View>
            </View>

            <Text style={styles.customerName}>{order.lead?.customerName || 'N/A'}</Text>
            
            <View style={styles.metaRow}>
              <Phone size={14} color={COLORS.primary} style={styles.metaIcon} />
              <Text style={styles.metaText}>{order.lead?.mobile}</Text>
            </View>
            <View style={styles.metaRow}>
              <MapPin size={14} color={COLORS.primary} style={styles.metaIcon} />
              <Text style={styles.metaText}>{order.lead?.address}, {order.lead?.city}, {order.lead?.state}</Text>
            </View>
          </View>

          {/* Financial Breakdown */}
          <View style={GLOBAL_STYLES.card}>
            <Text style={styles.sectionHeading}>Financial Ledger</Text>
            
            <View style={styles.ledgerDetailItem}>
              <Text style={styles.ledgerDetailLabel}>Contract Total Value</Text>
              <Text style={styles.ledgerDetailValue}>₹{order.totalValue.toLocaleString()}</Text>
            </View>

            <View style={styles.ledgerDetailItem}>
              <Text style={styles.ledgerDetailLabel}>Initial Down Payment</Text>
              <Text style={styles.ledgerDetailValue}>₹{order.downPayment.toLocaleString()}</Text>
            </View>

            <View style={styles.ledgerDetailItem}>
              <Text style={styles.ledgerDetailLabel}>Total Amount Paid</Text>
              <Text style={[styles.ledgerDetailValue, { color: COLORS.success }]}>₹{totalPaid.toLocaleString()}</Text>
            </View>

            <View style={[styles.ledgerDetailItem, styles.lastLedgerItem]}>
              <Text style={styles.ledgerDetailLabel}>Outstanding Balance</Text>
              <Text style={[styles.ledgerDetailValue, { color: balance > 0 ? COLORS.danger : COLORS.success }]}>
                ₹{balance.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Verification Warning Alert (For Pending Verification orders) */}
          {order.status === 'submitted' && (
            <View style={[GLOBAL_STYLES.card, styles.alertCard]}>
              <Building size={20} color={COLORS.warning} style={styles.alertIcon} />
              <View style={styles.alertTextCol}>
                <Text style={styles.alertTitle}>Awaiting Finance Approval</Text>
                <Text style={styles.alertDesc}>
                  This contract is currently locked. An administrator or finance team member must verify the down-payment details.
                </Text>
              </View>
            </View>
          )}

          {/* Rejection Alert */}
          {order.rejectionReason && order.status === 'draft' && (
            <View style={[GLOBAL_STYLES.card, styles.dangerAlertCard]}>
              <XCircle size={20} color={COLORS.danger} style={styles.alertIcon} />
              <View style={styles.alertTextCol}>
                <Text style={styles.dangerAlertTitle}>Order Rejected</Text>
                <Text style={styles.alertDesc}>Reason: {order.rejectionReason}</Text>
              </View>
            </View>
          )}

          {/* Payments Log */}
          <Text style={styles.subTitle}>Transaction Receipts</Text>
          {Array.isArray(order.payments) && order.payments.length > 0 ? (
            order.payments.map((payment: any) => (
              <View key={payment.id} style={[GLOBAL_STYLES.card, styles.paymentCard]}>
                <View style={styles.paymentCardHeader}>
                  <Text style={styles.paymentMethod}>
                    {(payment.paymentMethod || 'Online').toUpperCase()}
                  </Text>
                  <Text style={styles.paymentAmount}>+ ₹{payment.amount.toLocaleString()}</Text>
                </View>
                <Text style={styles.paymentDate}>
                  Recorded: {new Date(payment.paymentDate).toLocaleDateString()}
                </Text>
                {payment.transactionRef ? (
                  <Text style={styles.paymentRef}>Ref: {payment.transactionRef}</Text>
                ) : null}
                {payment.remarks ? (
                  <Text style={styles.paymentRemarks}>Note: {payment.remarks}</Text>
                ) : null}
              </View>
            ))
          ) : (
            <View style={styles.emptyPayments}>
              <CreditCard size={28} color={COLORS.textMuted} style={styles.emptyIcon} />
              <Text style={styles.emptyPaymentsText}>No transactions recorded on this ledger yet.</Text>
            </View>
          )}

          {/* Bottom Actions based on Role/State */}
          <View style={styles.actionsPanel}>
            {/* Record Payment (Consultants, Managers, Admin) */}
            {order.status !== 'draft' && (
              <TouchableOpacity
                style={[GLOBAL_STYLES.button, styles.actionBtn]}
                onPress={() => setPaymentModalVisible(true)}
              >
                <Text style={GLOBAL_STYLES.buttonText}>RECORD TRANSACTION</Text>
              </TouchableOpacity>
            )}

            {/* Finance Verification Button */}
            {order.status === 'submitted' && canVerify && (
              <TouchableOpacity
                style={[GLOBAL_STYLES.button, styles.verifyBtn]}
                onPress={() => setVerifyModalVisible(true)}
              >
                <Text style={styles.verifyBtnText}>PROCESS VERIFICATION</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      ) : (
        /* Technical files / documents */
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionHeading}>Contract attachments</Text>
          {Array.isArray(order.documents) && order.documents.length > 0 ? (
            order.documents.map((doc: any) => (
              <View key={doc.id} style={[GLOBAL_STYLES.card, styles.docCard]}>
                <FileText size={24} color={COLORS.primary} style={styles.docIcon} />
                <View style={styles.docMeta}>
                  <Text style={styles.docName} numberOfLines={1}>{doc.fileName}</Text>
                  <Text style={styles.docType}>
                    Type: {doc.docType.toUpperCase().replace('_', ' ')} • {doc.mimeType}
                  </Text>
                  {doc.fileSizeOctets ? (
                    <Text style={styles.docSize}>
                      Size: {(doc.fileSizeOctets / 1024).toFixed(1)} KB
                    </Text>
                  ) : null}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.centerContainer}>
              <Text style={FONTS.body}>No documents uploaded for this order yet.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Record Payment Modal */}
      <Modal visible={paymentModalVisible} transparent animationType="slide" onRequestClose={() => setPaymentModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Record Customer Payment</Text>

            <Text style={styles.modalLabel}>Receipt Amount (₹)</Text>
            <TextInput
              style={GLOBAL_STYLES.input}
              placeholder="e.g. 15000"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={payAmount}
              onChangeText={setPayAmount}
            />

            <Text style={styles.modalLabel}>Payment Method</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paymentMethodScroll}>
              {['online', 'cash', 'bank_transfer', 'cheque'].map((method) => {
                const isSelected = payMethod === method;
                return (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.methodBtn,
                      isSelected && { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: COLORS.primary },
                    ]}
                    onPress={() => setPayMethod(method)}
                  >
                    <Text style={[styles.methodText, isSelected && { color: COLORS.primary, fontWeight: '700' }]}>
                      {method.toUpperCase().replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.modalLabel}>Reference Number (Cheque # / UTR # / Online Transaction ID)</Text>
            <TextInput
              style={GLOBAL_STYLES.input}
              placeholder="e.g. UTR1234567890"
              placeholderTextColor={COLORS.textMuted}
              value={payRef}
              onChangeText={setPayRef}
            />

            <Text style={styles.modalLabel}>Remarks / Memo (Optional)</Text>
            <TextInput
              style={[GLOBAL_STYLES.input, styles.modalInput]}
              placeholder="Add payment verification notes..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              value={payRemarks}
              onChangeText={setPayRemarks}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelModalBtn]}
                onPress={() => setPaymentModalVisible(false)}
                disabled={actionLoading}
              >
                <Text style={styles.cancelModalBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.submitModalBtn]}
                onPress={handleRecordPayment}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#070a13" />
                ) : (
                  <Text style={styles.submitModalBtnText}>SAVE TRANSACTION</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Verify Order Approval Modal */}
      <Modal visible={verifyModalVisible} transparent animationType="slide" onRequestClose={() => setVerifyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Order Verification Panel</Text>

            <Text style={styles.modalLabel}>Select Decision Action</Text>
            <View style={styles.decisionRow}>
              <TouchableOpacity
                style={[
                  styles.decisionBtn,
                  verifyApprove === true && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: COLORS.success },
                ]}
                onPress={() => setVerifyApprove(true)}
              >
                <CheckCircle size={20} color={verifyApprove === true ? COLORS.success : COLORS.textMuted} style={styles.decisionIcon} />
                <Text style={[styles.decisionText, verifyApprove === true && { color: COLORS.success, fontWeight: '800' }]}>
                  APPROVE ORDER
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.decisionBtn,
                  verifyApprove === false && { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: COLORS.danger },
                ]}
                onPress={() => setVerifyApprove(false)}
              >
                <XCircle size={20} color={verifyApprove === false ? COLORS.danger : COLORS.textMuted} style={styles.decisionIcon} />
                <Text style={[styles.decisionText, verifyApprove === false && { color: COLORS.danger, fontWeight: '800' }]}>
                  REJECT ORDER
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Remarks / Rejection Reason (Required if rejected)</Text>
            <TextInput
              style={[GLOBAL_STYLES.input, styles.modalInput]}
              placeholder="Explain the approval/rejection decision..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              value={verifyRemark}
              onChangeText={setVerifyRemark}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelModalBtn]}
                onPress={() => setVerifyModalVisible(false)}
                disabled={actionLoading}
              >
                <Text style={styles.cancelModalBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, verifyApprove === false ? styles.submitRejectBtn : styles.submitModalBtn]}
                onPress={handleVerifyOrder}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#070a13" />
                ) : (
                  <Text style={styles.submitModalBtnText}>SUBMIT DECISION</Text>
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
  cardHeader: {
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
    fontSize: 12,
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
  ledgerDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.02)',
  },
  lastLedgerItem: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  ledgerDetailLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  ledgerDetailValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  alertCard: {
    flexDirection: 'row',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  dangerAlertCard: {
    flexDirection: 'row',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  alertIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  alertTextCol: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.warning,
  },
  dangerAlertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
  },
  alertDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 18,
    marginBottom: 12,
  },
  paymentCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  paymentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethod: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.success,
  },
  paymentDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  paymentRef: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  paymentRemarks: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyPayments: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyIcon: {
    marginBottom: 8,
    opacity: 0.6,
  },
  emptyPaymentsText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  actionsPanel: {
    marginTop: 20,
  },
  actionBtn: {
    marginBottom: 10,
  },
  verifyBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.warning,
  },
  verifyBtnText: {
    color: COLORS.warning,
    fontWeight: '800',
    fontSize: 14,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  docIcon: {
    marginRight: 16,
  },
  docMeta: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  docType: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  docSize: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
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
  paymentMethodScroll: {
    marginBottom: 16,
  },
  methodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
    marginRight: 8,
    marginBottom: 4,
  },
  methodText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  modalInput: {
    height: 60,
    textAlignVertical: 'top',
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
  submitRejectBtn: {
    backgroundColor: COLORS.danger,
    marginLeft: 8,
  },
  submitModalBtnText: {
    color: '#070a13',
    fontWeight: '800',
    fontSize: 13,
  },
  decisionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  decisionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  decisionIcon: {
    marginRight: 6,
  },
  decisionText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
