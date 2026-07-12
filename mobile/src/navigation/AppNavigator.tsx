import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme';

// Import Screens
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { LeadsListScreen } from '../screens/LeadsListScreen';
import { LeadDetailsScreen } from '../screens/LeadDetailsScreen';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { OrdersListScreen } from '../screens/OrdersListScreen';
import { OrderDetailScreen } from '../screens/OrderDetailScreen';

// Import Icons
import { LayoutDashboard, Users, Clock, Receipt } from 'lucide-react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const LeadsStack = createNativeStackNavigator();
const OrdersStack = createNativeStackNavigator();

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
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.cardBackground,
          borderTopColor: COLORS.cardBorder,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="LeadsTab"
        component={LeadsStackNavigator}
        options={{
          tabBarLabel: 'Leads',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersStackNavigator}
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }) => <Receipt color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color, size }) => <Clock color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Main Root Navigator
export const AppNavigator = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      {isAuthenticated ? (
        <Stack.Screen name="MainApp" component={TabNavigator} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};
