import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { api } from '../services/api';
import { COLORS, GLOBAL_STYLES, FONTS, SIZES } from '../theme';
import { Calendar, Clock, MapPin, CheckCircle, HelpCircle } from 'lucide-react-native';

export const AttendanceScreen = () => {
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Tick the clock every second
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAttendanceStatus = async () => {
    setLoading(true);
    try {
      const res = await api.attendance.getToday();
      if (res.success) {
        setAttendance(res.data);
      } else {
        setAttendance(null);
      }
    } catch (e) {
      console.error(e);
      setAttendance(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceStatus();
  }, []);

  const handleCheckIn = async () => {
    const resolvedLoc = customLocation.trim() || 'Mobile GPS Location';
    setActionLoading(true);
    try {
      const res = await api.attendance.checkIn(resolvedLoc, notes.trim());
      if (res.success) {
        Alert.alert('Success', res.message || 'Checked in successfully.');
        setNotes('');
        setCustomLocation('');
        fetchAttendanceStatus();
      } else {
        Alert.alert('Error', res.message || 'Failed to check in.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Server connection error.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    const resolvedLoc = customLocation.trim() || 'Mobile GPS Location';
    setActionLoading(true);
    try {
      const res = await api.attendance.checkOut(resolvedLoc, notes.trim());
      if (res.success) {
        Alert.alert('Success', res.message || 'Checked out successfully.');
        setNotes('');
        setCustomLocation('');
        fetchAttendanceStatus();
      } else {
        Alert.alert('Error', res.message || 'Failed to check out.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Server connection error.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getStatusDisplay = () => {
    if (!attendance) return { label: 'Not Checked In', color: COLORS.danger };
    if (attendance.status === 'checked_in') return { label: 'Checked In (Active)', color: COLORS.success };
    return { label: 'Checked Out (Shift Ended)', color: COLORS.warning };
  };

  const statusInfo = getStatusDisplay();

  if (loading) {
    return (
      <View style={[GLOBAL_STYLES.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={GLOBAL_STYLES.container} contentContainerStyle={styles.scrollContent}>
      {/* Date-Time Hero Card */}
      <View style={[GLOBAL_STYLES.card, styles.heroCard]}>
        <Calendar size={28} color={COLORS.primary} style={styles.calendarIcon} />
        <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>

        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Today's Status:</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}15`, borderColor: `${statusInfo.color}40` }]}>
            <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Check In / Out Log Details */}
      {attendance && (
        <View style={GLOBAL_STYLES.card}>
          <Text style={styles.sectionHeading}>Today's Log</Text>
          
          <View style={styles.logItem}>
            <Clock size={16} color={COLORS.success} style={styles.logIcon} />
            <View>
              <Text style={styles.logLabel}>Clock In Time</Text>
              <Text style={styles.logValue}>
                {attendance.checkIn ? new Date(attendance.checkIn).toLocaleTimeString() : '--'}
              </Text>
              <Text style={styles.logLocation}>Loc: {attendance.checkInLocation || 'N/A'}</Text>
            </View>
          </View>

          {attendance.checkOut && (
            <View style={[styles.logItem, styles.checkoutLogItem]}>
              <Clock size={16} color={COLORS.warning} style={styles.logIcon} />
              <View>
                <Text style={styles.logLabel}>Clock Out Time</Text>
                <Text style={styles.logValue}>
                  {new Date(attendance.checkOut).toLocaleTimeString()}
                </Text>
                <Text style={styles.logLocation}>Loc: {attendance.checkOutLocation || 'N/A'}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Clock In/Out Form Panel */}
      {(!attendance || attendance.status === 'checked_in') ? (
        <View style={[GLOBAL_STYLES.card, styles.formCard]}>
          <Text style={styles.sectionHeading}>
            {!attendance ? 'Clock In Verification' : 'Clock Out Verification'}
          </Text>

          {/* Location field */}
          <Text style={styles.fieldLabel}>Current Location (e.g. site address, office)</Text>
          <View style={styles.inputContainer}>
            <MapPin size={16} color={COLORS.textMuted} style={styles.fieldIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Prayagraj Solar Plant A"
              placeholderTextColor={COLORS.textMuted}
              value={customLocation}
              onChangeText={setCustomLocation}
              editable={!actionLoading}
            />
          </View>

          {/* Notes field */}
          <Text style={styles.fieldLabel}>Attendance Note (Optional)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              placeholder="Add work notes for today..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
              editable={!actionLoading}
            />
          </View>

          {/* Large Action Trigger */}
          <TouchableOpacity
            style={[
              GLOBAL_STYLES.button,
              !attendance ? styles.checkInButton : styles.checkOutButton,
              actionLoading && { opacity: 0.6 },
            ]}
            onPress={!attendance ? handleCheckIn : handleCheckOut}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            {actionLoading ? (
              <ActivityIndicator color="#070a13" size="small" />
            ) : (
              <Text style={GLOBAL_STYLES.buttonText}>
                {!attendance ? 'CLOCK IN NOW' : 'CLOCK OUT NOW'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        /* Day Ended info */
        <View style={[GLOBAL_STYLES.card, styles.completedCard]}>
          <CheckCircle size={44} color={COLORS.success} style={styles.successIcon} />
          <Text style={styles.completedTitle}>Shift Completed!</Text>
          <Text style={styles.completedText}>
            You have successfully checked in and checked out for today. Your records have been updated in the CRM database.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 32,
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  calendarIcon: {
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkoutLogItem: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.02)',
    paddingTop: 12,
    marginTop: 12,
  },
  logIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  logLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  logValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  logLocation: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  formCard: {
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 10, 19, 0.4)',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  fieldIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  multilineInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  checkInButton: {
    backgroundColor: COLORS.primary,
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  checkOutButton: {
    backgroundColor: COLORS.warning,
    marginTop: 8,
    shadowColor: COLORS.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  completedCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
  },
  successIcon: {
    marginBottom: 16,
  },
  completedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  completedText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
