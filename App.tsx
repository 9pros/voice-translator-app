import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {StatusBar, StyleSheet} from 'react-native';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import DialerScreen from './src/screens/DialerScreen';
import TranslationScreen from './src/screens/TranslationScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import VoiceProfileScreen from './src/screens/VoiceProfileScreen';
import CallScreen from './src/screens/CallScreen';

// Context
import {TranslationProvider} from './src/context/TranslationContext';
import {VoiceProfileProvider} from './src/context/VoiceProfileContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Dialer') {
            iconName = 'dialpad';
          } else if (route.name === 'Translation') {
            iconName = 'translate';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          } else {
            iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Dialer" component={DialerScreen} />
      <Tab.Screen name="Translation" component={TranslationScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

const App = () => {
  return (
    <TranslationProvider>
      <VoiceProfileProvider>
        <NavigationContainer>
          <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
          <Stack.Navigator screenOptions={{headerShown: false}}>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="VoiceProfile" component={VoiceProfileScreen} />
            <Stack.Screen 
              name="Call" 
              component={CallScreen}
              options={{
                presentation: 'fullScreenModal',
                gestureEnabled: false,
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </VoiceProfileProvider>
    </TranslationProvider>
  );
};

export default App;

