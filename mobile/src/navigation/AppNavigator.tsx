import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme';

// Import Screens
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { LeadsListScreen } from '../screens/LeadsListScreen';
import { LeadDetailsScreen } from '../screens/LeadDetailsScreen';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { OrdersListScreen } from '../screens/OrdersListScreen';
import { OrderDetailScreen } from '../screens/OrderDetailScreen';
import { ActivityStreamScreen } from '../screens/ActivityStreamScreen';

// Import Icons
import { Home, Users, Clock, FileText } from 'lucide-react-native';
import { View, Text } from 'react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const LeadsStack = createNativeStackNavigator();
const OrdersStack = createNativeStackNavigator();

function TabBarItem({
  focused,
  icon: Icon,
  label,
}: {
  focused: boolean;
  icon: any;
  label: string;
}) {
  if (focused) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#eff6ff',
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
        }}
      >
        <Icon size={18} color="#2563eb" fill="#2563eb" />
        <Text
          style={{
            fontFamily: 'Outfit-Bold',
            marginLeft: 6,
            color: '#2563eb',
            fontWeight: '700',
            fontSize: 13,
          }}
        >
          {label}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={20} color="#94a3b8" />
      <Text
        style={{
          fontFamily: 'Outfit-Medium',
          marginTop: 4,
          color: '#94a3b8',
          fontWeight: '500',
          fontSize: 11,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// Nested Stack Navigator for Leads (List -> Details)
function LeadsStackNavigator() {
  return (
    <LeadsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <LeadsStack.Screen name="LeadsList" component={LeadsListScreen} />
      <LeadsStack.Screen name="LeadDetails" component={LeadDetailsScreen} />
    </LeadsStack.Navigator>
  );
}

// Nested Stack Navigator for Orders (List -> Details)
function OrdersStackNavigator() {
  return (
    <OrdersStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <OrdersStack.Screen name="OrdersList" component={OrdersListScreen} />
      <OrdersStack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </OrdersStack.Navigator>
  );
}

// Bottom Tab Navigator for Authenticated Session
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f1f5f9',
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 10,
          paddingTop: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 6,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarItem focused={focused} icon={Home} label="Home" />
          ),
        }}
      />
      <Tab.Screen
        name="LeadsTab"
        component={LeadsStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarItem focused={focused} icon={Users} label="Leads" />
          ),
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarItem focused={focused} icon={FileText} label="Orders" />
          ),
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarItem focused={focused} icon={Clock} label="Attendance" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Main Root Navigator
export const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isSplashDone, setIsSplashDone] = useState(false);

  // Show Animated Splash screen for at least 2 seconds (and until auth check completes)
  if (!isSplashDone || isLoading) {
    return <SplashScreen onFinish={() => setIsSplashDone(true)} />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name="MainApp" component={TabNavigator} />
          <Stack.Screen name="ActivityStream" component={ActivityStreamScreen} />
        </>
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ contentStyle: { backgroundColor: '#f8fafc' } }}
        />
      )}
    </Stack.Navigator>
  );
};
