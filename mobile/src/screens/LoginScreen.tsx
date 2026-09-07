import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Check, ArrowRight, ShieldAlert } from 'lucide-react-native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export const LoginScreen = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await login(email.trim(), password);
      if (!result.success) {
        setError(result.message);
      }
    } catch (e: any) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

        <View style={styles.innerContainer}>
          {/* Main Content Area */}
          <View style={styles.mainBody}>
            {/* Logo / Header Section */}
            <View style={styles.headerSection}>
              <Image
                source={require('../../assets/logo_transparent.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.mainTitle}>CRM Mobile Portal</Text>
              <Text style={styles.subTitle}>Welcome back! Please sign in to continue.</Text>
            </View>

            {/* Form Card */}
            <View style={styles.card}>
              {error && (
                <View style={styles.errorAlert}>
                  <ShieldAlert size={18} color="#dc2626" style={styles.errorIcon} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Email Field */}
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.iconBadge}>
                  <Mail size={18} color="#2563eb" />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your email"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading}
                />
              </View>

              {/* Password Field */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Password</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.iconBadge}>
                  <Lock size={18} color="#2563eb" />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={19} color="#64748b" />
                  ) : (
                    <Eye size={19} color="#64748b" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Remember Me & Forgot Password Row */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.rememberMeContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Check size={12} color="#ffffff" strokeWidth={3} />}
                  </View>
                  <Text style={styles.rememberMeText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  loading && styles.disabledButton,
                ]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>LOGIN</Text>
                    <View style={styles.arrowIconWrapper}>
                      <ArrowRight size={20} color="#ffffff" strokeWidth={2.5} />
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Pushed to Bottom */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              © 2026 Santori Solar Solutions. All rights reserved.
            </Text>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#f8fafc',
  },
  innerContainer: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 24,
  },
  mainBody: {
    flex: 1,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 140,
    height: 85,
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '400',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 22,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 8,
    height: 54,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    height: '100%',
  },
  eyeButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 22,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  rememberMeText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#FF9800',
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.6,
  },
  arrowIconWrapper: {
    position: 'absolute',
    right: 18,
  },
  footerContainer: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
  },
});
