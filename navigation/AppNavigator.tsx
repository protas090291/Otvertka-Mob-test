import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { UserRole } from '../types';
import { UserProfile } from '../lib/authApi';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import ProjectsScreen from '../screens/ProjectsScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import BudgetScreen from '../screens/BudgetScreen';
import MaterialsScreen from '../screens/MaterialsScreen';
import DefectsScreen from '../screens/DefectsScreen';
import DefectDetailScreen from '../screens/DefectDetailScreen';
// import ReportsScreen from '../screens/ReportsScreen'; // Отключено - не используется в мобильном приложении
import ProfileScreen from '../screens/ProfileScreen';
import ApartmentPlanScreen from '../screens/ApartmentPlanScreen';
import BuildingSelectionScreen from '../screens/BuildingSelectionScreen';
import ProjectApartmentsScreen from '../screens/ProjectApartmentsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

interface AppNavigatorProps {
  userRole: UserRole;
  currentUser: UserProfile;
  onLogout?: () => void;
}

const AppNavigator: React.FC<AppNavigatorProps> = ({ userRole, currentUser, onLogout }) => {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 16) : insets.bottom;
  const tabBarBaseHeight = 60;

  // Определяем доступные вкладки в зависимости от роли
  const getTabsForRole = () => {
    const commonTabs = [
      { name: 'Dashboard', component: DashboardScreen, icon: 'home-outline', label: 'Главная' },
      { name: 'Projects', component: ProjectsScreen, icon: 'business-outline', label: 'Проекты' },
    ];

    switch (userRole) {
      case 'admin':
      case 'management':
        return [
          ...commonTabs,
          { name: 'Defects', component: DefectsScreen, icon: 'warning-outline', label: 'Дефекты' },
        ];
      case 'user':
        return [
          ...commonTabs,
          { name: 'Defects', component: DefectsScreen, icon: 'warning-outline', label: 'Дефекты' },
        ];
      case 'client':
        return [
          ...commonTabs,
          { name: 'Schedule', component: ScheduleScreen, icon: 'calendar-outline', label: 'График' },
          { name: 'Budget', component: BudgetScreen, icon: 'cash-outline', label: 'Бюджет' },
          { name: 'Defects', component: DefectsScreen, icon: 'warning-outline', label: 'Дефекты' },
        ];
      case 'foreman':
      case 'contractor':
        return [
          ...commonTabs,
          { name: 'Schedule', component: ScheduleScreen, icon: 'calendar-outline', label: 'График' },
          { name: 'Materials', component: MaterialsScreen, icon: 'cube-outline', label: 'Материалы' },
          { name: 'Defects', component: DefectsScreen, icon: 'warning-outline', label: 'Дефекты' },
        ];
      case 'worker':
        return [
          ...commonTabs,
          { name: 'Schedule', component: ScheduleScreen, icon: 'calendar-outline', label: 'Задачи' },
          { name: 'Defects', component: DefectsScreen, icon: 'warning-outline', label: 'Дефекты' },
        ];
      case 'storekeeper':
        return [
          ...commonTabs,
          { name: 'Materials', component: MaterialsScreen, icon: 'cube-outline', label: 'Материалы' },
          { name: 'Defects', component: DefectsScreen, icon: 'warning-outline', label: 'Дефекты' },
        ];
      case 'technadzor':
        return [
          ...commonTabs,
          { name: 'Schedule', component: ScheduleScreen, icon: 'calendar-outline', label: 'Задачи' },
          { name: 'Defects', component: DefectsScreen, icon: 'warning-outline', label: 'Дефекты' },
        ];
      default:
        // Для неизвестных ролей показываем базовые вкладки + Дефекты (общий раздел)
        return [
          ...commonTabs,
          { name: 'Defects', component: DefectsScreen, icon: 'warning-outline', label: 'Дефекты' },
        ];
    }
  };

  const tabs = getTabsForRole();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main">
          {() => (
            <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textLight,
          tabBarStyle: {
            backgroundColor: Colors.cardBackground,
            borderTopColor: Colors.border,
            borderTopWidth: 1,
            paddingBottom: 8 + bottomInset,
            paddingTop: 8,
            height: tabBarBaseHeight + bottomInset,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}
      >
        {tabs.map((tab) => (
          <Tab.Screen
            key={tab.name}
            name={tab.name}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name={tab.icon as any} size={size} color={color} />
              ),
              tabBarLabel: tab.label,
            }}
          >
            {(props) => (
              <tab.component
                {...props}
                route={{
                  ...props.route,
                  params: {
                    ...props.route.params,
                    userRole,
                    currentUser,
                  },
                }}
              />
            )}
          </Tab.Screen>
        ))}
        <Tab.Screen
          name="Profile"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
            tabBarLabel: 'Профиль',
          }}
        >
          {(props) => <ProfileScreen {...props} route={{ ...props.route, params: { userRole, currentUser, onLogout } }} />}
        </Tab.Screen>
      </Tab.Navigator>
          )}
        </Stack.Screen>
        <Stack.Screen 
          name="BuildingSelection" 
          options={{ 
            presentation: 'modal',
            headerShown: false 
          }}
        >
          {(props) => <BuildingSelectionScreen {...props} route={{ ...props.route, params: { userRole } }} />}
        </Stack.Screen>
        <Stack.Screen 
          name="ApartmentPlan" 
          options={{ 
            presentation: 'modal',
            headerShown: false 
          }}
        >
          {(props) => <ApartmentPlanScreen {...props} route={{ ...props.route, params: { ...props.route.params, userRole } }} />}
        </Stack.Screen>
        <Stack.Screen 
          name="DefectDetail" 
          options={{ 
            presentation: 'card',
            headerShown: false 
          }}
        >
          {(props) => <DefectDetailScreen {...props} />}
        </Stack.Screen>
        <Stack.Screen
          name="Notifications"
          options={{
            presentation: 'card',
            headerShown: false,
          }}
        >
          {(props) => (
            <NotificationsScreen
              {...props}
              route={{
                ...props.route,
                params: {
                  ...props.route.params,
                  userRole,
                  currentUser,
                },
              }}
            />
          )}
        </Stack.Screen>
        <Stack.Screen 
          name="ProjectApartments" 
          options={{ 
            presentation: 'card',
            headerShown: false 
          }}
        >
          {(props) => <ProjectApartmentsScreen {...props} route={{ ...props.route, params: { ...props.route.params, userRole } }} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
