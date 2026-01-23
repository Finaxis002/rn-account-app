import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import {
  Provider as PaperProvider,
  MD3LightTheme as DefaultTheme,
} from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef } from './src/navigation/RootNavigation';

import { CompanyProvider } from './src/contexts/company-context';
import { PermissionProvider } from './src/contexts/permission-context';
import { UserPermissionsProvider } from './src/contexts/user-permissions-context';
import { SupportProvider } from './src/contexts/support-context';
import AppSocketWrapper from './src/components/AppSocketWrapper';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0A66C2',
    secondary: '#FF4081',
  },
};

export default function App() {
  const [role, setRole] = useState(null);

  useEffect(() => {
    const pingServer = async () => {
      try {
        await fetch(
          'https://accountapp-backend-shardaassociates.onrender.com/ping',
        );
        console.log('✅ Server pinged to stay awake');
      } catch (error) {
        console.log('⚠️ Ping failed:', error.message);
      }
    };

    // 🔹 Ping immediately when app starts
    pingServer();

    // 🔹 Repeat every 5 minutes (300,000 ms)
    const interval = setInterval(pingServer, 5 * 60 * 1000);

    // 🔹 Clear interval when app closes/unmounts
    return () => clearInterval(interval);
  }, []);

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <CompanyProvider>
          <PermissionProvider>
            <UserPermissionsProvider>
              <SupportProvider>
                {/* 🆕 Socket Manager - Mounts all socket listeners */}
                <AppSocketWrapper>
                  <NavigationContainer ref={navigationRef}>
                    <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                    <AppNavigator role={role} setRole={setRole} />
                  </NavigationContainer>
                </AppSocketWrapper>
              </SupportProvider>
            </UserPermissionsProvider>
          </PermissionProvider>
        </CompanyProvider>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
