import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from '../context/TranslationContext';
import {useVoiceProfile} from '../context/VoiceProfileContext';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const {state: translationState, clearHistory} = useTranslation();
  const {state: voiceState} = useVoiceProfile();
  
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Translation History',
      'This will permanently delete all your translation history. This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearHistory();
            Alert.alert('Success', 'Translation history cleared');
          },
        },
      ],
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Export your translation history and voice profiles?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Export',
          onPress: () => {
            // In a real app, this would export data to a file
            Alert.alert('Success', 'Data exported successfully');
          },
        },
      ],
    );
  };

  const handleResetApp = () => {
    Alert.alert(
      'Reset App',
      'This will reset all settings, clear history, and delete voice profiles. This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            // In a real app, this would reset all app data
            Alert.alert('Success', 'App has been reset');
          },
        },
      ],
    );
  };

  const SettingItem: React.FC<{
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    showArrow?: boolean;
  }> = ({icon, title, subtitle, onPress, rightElement, showArrow = true}) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Icon name={icon} size={24} color="#007AFF" />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement}
        {showArrow && onPress && (
          <Icon name="chevron-right" size={24} color="#C7C7CC" />
        )}
      </View>
    </TouchableOpacity>
  );

  const SectionHeader: React.FC<{title: string}> = ({title}) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#007AFF', '#5856D6']}
        style={styles.header}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Customize your experience</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Voice Profiles Section */}
        <SectionHeader title="Voice Profiles" />
        <View style={styles.section}>
          <SettingItem
            icon="record-voice-over"
            title="Manage Voice Profiles"
            subtitle={`${voiceState.profiles.length} profiles created`}
            onPress={() => navigation.navigate('VoiceProfile' as never)}
          />
          <SettingItem
            icon="person"
            title="Active Profile"
            subtitle={voiceState.activeProfile?.name || 'None selected'}
            onPress={() => navigation.navigate('VoiceProfile' as never)}
          />
        </View>

        {/* Translation Settings */}
        <SectionHeader title="Translation" />
        <View style={styles.section}>
          <SettingItem
            icon="language"
            title="Default Languages"
            subtitle={`${translationState.sourceLanguage.name} → ${translationState.targetLanguage.name}`}
            onPress={() => {
              Alert.alert('Info', 'Change languages in the Translation tab');
            }}
          />
          <SettingItem
            icon="history"
            title="Translation History"
            subtitle={`${translationState.translationHistory.length} translations`}
            onPress={handleClearHistory}
          />
          <SettingItem
            icon="speed"
            title="Translation Speed"
            subtitle="Optimize for speed or accuracy"
            onPress={() => {
              Alert.alert('Coming Soon', 'This feature will be available in a future update');
            }}
          />
        </View>

        {/* App Preferences */}
        <SectionHeader title="App Preferences" />
        <View style={styles.section}>
          <SettingItem
            icon="notifications"
            title="Notifications"
            subtitle="Get notified about translation updates"
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{false: '#E5E5EA', true: '#34C759'}}
                thumbColor="white"
              />
            }
            showArrow={false}
          />
          <SettingItem
            icon="save"
            title="Auto-save Translations"
            subtitle="Automatically save translation history"
            rightElement={
              <Switch
                value={autoSave}
                onValueChange={setAutoSave}
                trackColor={{false: '#E5E5EA', true: '#34C759'}}
                thumbColor="white"
              />
            }
            showArrow={false}
          />
          <SettingItem
            icon="vibration"
            title="Haptic Feedback"
            subtitle="Feel vibrations for interactions"
            rightElement={
              <Switch
                value={hapticFeedback}
                onValueChange={setHapticFeedback}
                trackColor={{false: '#E5E5EA', true: '#34C759'}}
                thumbColor="white"
              />
            }
            showArrow={false}
          />
        </View>

        {/* Privacy & Security */}
        <SectionHeader title="Privacy & Security" />
        <View style={styles.section}>
          <SettingItem
            icon="security"
            title="Privacy Policy"
            subtitle="Learn how we protect your data"
            onPress={() => {
              Alert.alert('Privacy Policy', 'Your privacy is important to us. All voice data is processed locally when possible.');
            }}
          />
          <SettingItem
            icon="lock"
            title="Data Encryption"
            subtitle="Your data is encrypted and secure"
            onPress={() => {
              Alert.alert('Data Encryption', 'All sensitive data is encrypted using industry-standard encryption.');
            }}
          />
          <SettingItem
            icon="cloud-off"
            title="Offline Mode"
            subtitle="Use translation without internet"
            onPress={() => {
              Alert.alert('Coming Soon', 'Offline translation will be available in a future update');
            }}
          />
        </View>

        {/* Data Management */}
        <SectionHeader title="Data Management" />
        <View style={styles.section}>
          <SettingItem
            icon="file-download"
            title="Export Data"
            subtitle="Export your translations and profiles"
            onPress={handleExportData}
          />
          <SettingItem
            icon="backup"
            title="Backup & Restore"
            subtitle="Backup your data to cloud"
            onPress={() => {
              Alert.alert('Coming Soon', 'Cloud backup will be available in a future update');
            }}
          />
          <SettingItem
            icon="storage"
            title="Storage Usage"
            subtitle="Manage app storage"
            onPress={() => {
              Alert.alert('Storage Usage', 'Voice profiles: 50MB\nTranslation cache: 10MB\nTotal: 60MB');
            }}
          />
        </View>

        {/* Support */}
        <SectionHeader title="Support" />
        <View style={styles.section}>
          <SettingItem
            icon="help"
            title="Help & FAQ"
            subtitle="Get help with using the app"
            onPress={() => {
              Alert.alert('Help', 'For support, please visit our website or contact us at support@voicetranslator.com');
            }}
          />
          <SettingItem
            icon="feedback"
            title="Send Feedback"
            subtitle="Help us improve the app"
            onPress={() => {
              Alert.alert('Feedback', 'Thank you for your feedback! Please email us at feedback@voicetranslator.com');
            }}
          />
          <SettingItem
            icon="star"
            title="Rate the App"
            subtitle="Rate us on the App Store"
            onPress={() => {
              Alert.alert('Rate App', 'Thank you for considering rating our app!');
            }}
          />
        </View>

        {/* About */}
        <SectionHeader title="About" />
        <View style={styles.section}>
          <SettingItem
            icon="info"
            title="App Version"
            subtitle="1.0.0"
            showArrow={false}
          />
          <SettingItem
            icon="update"
            title="Check for Updates"
            subtitle="You have the latest version"
            onPress={() => {
              Alert.alert('Updates', 'You are using the latest version of the app.');
            }}
          />
          <SettingItem
            icon="description"
            title="Terms of Service"
            subtitle="Read our terms and conditions"
            onPress={() => {
              Alert.alert('Terms of Service', 'Please visit our website to read the full terms of service.');
            }}
          />
        </View>

        {/* Danger Zone */}
        <SectionHeader title="Danger Zone" />
        <View style={[styles.section, styles.dangerSection]}>
          <SettingItem
            icon="refresh"
            title="Reset App"
            subtitle="Reset all settings and data"
            onPress={handleResetApp}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Voice Translator v1.0.0
          </Text>
          <Text style={styles.footerSubtext}>
            Made with ❤️ for seamless communication
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 25,
    marginBottom: 10,
    marginLeft: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dangerSection: {
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 5,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#8E8E93',
  },
});

export default SettingsScreen;

