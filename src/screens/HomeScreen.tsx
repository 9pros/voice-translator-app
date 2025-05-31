import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import {useTranslation} from '../context/TranslationContext';
import {useVoiceProfile} from '../context/VoiceProfileContext';
import {TranslationResult} from '../types';

const {width} = Dimensions.get('window');

const HomeScreen: React.FC = () => {
  const {state: translationState, clearHistory} = useTranslation();
  const {state: voiceState} = useVoiceProfile();
  const [recentTranslations, setRecentTranslations] = useState<TranslationResult[]>([]);

  useEffect(() => {
    // Get the 5 most recent translations
    setRecentTranslations(translationState.translationHistory.slice(0, 5));
  }, [translationState.translationHistory]);

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all translation history?',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Clear', style: 'destructive', onPress: clearHistory},
      ],
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  };

  const StatCard: React.FC<{title: string; value: string; icon: string; color: string}> = ({
    title,
    value,
    icon,
    color,
  }) => (
    <View style={[styles.statCard, {borderLeftColor: color}]}>
      <View style={styles.statContent}>
        <Icon name={icon} size={24} color={color} />
        <View style={styles.statText}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#007AFF', '#5856D6']}
        style={styles.header}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}>
        <Text style={styles.headerTitle}>Voice Translator</Text>
        <Text style={styles.headerSubtitle}>Real-time voice translation</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Translations Today"
            value={translationState.translationHistory.length.toString()}
            icon="translate"
            color="#007AFF"
          />
          <StatCard
            title="Voice Profiles"
            value={voiceState.profiles.length.toString()}
            icon="record-voice-over"
            color="#34C759"
          />
          <StatCard
            title="Active Profile"
            value={voiceState.activeProfile ? '1' : '0'}
            icon="person"
            color="#FF9500"
          />
        </View>

        {/* Current Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Settings</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <Icon name="language" size={20} color="#007AFF" />
              <Text style={styles.settingText}>
                {translationState.sourceLanguage.flag} {translationState.sourceLanguage.name} → {translationState.targetLanguage.flag} {translationState.targetLanguage.name}
              </Text>
            </View>
            <View style={styles.settingRow}>
              <Icon 
                name={translationState.realTimeMode ? 'flash-on' : 'flash-off'} 
                size={20} 
                color={translationState.realTimeMode ? '#34C759' : '#8E8E93'} 
              />
              <Text style={styles.settingText}>
                Real-time Mode: {translationState.realTimeMode ? 'On' : 'Off'}
              </Text>
            </View>
            <View style={styles.settingRow}>
              <Icon 
                name={translationState.useVoiceProfile ? 'record-voice-over' : 'voice-over-off'} 
                size={20} 
                color={translationState.useVoiceProfile ? '#34C759' : '#8E8E93'} 
              />
              <Text style={styles.settingText}>
                Voice Profile: {translationState.useVoiceProfile ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Translations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Translations</Text>
            {recentTranslations.length > 0 && (
              <TouchableOpacity onPress={handleClearHistory}>
                <Text style={styles.clearButton}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {recentTranslations.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="translate" size={48} color="#C7C7CC" />
              <Text style={styles.emptyStateText}>No translations yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Start a call or use the translation feature to see your history here
              </Text>
            </View>
          ) : (
            <View style={styles.translationsList}>
              {recentTranslations.map((translation, index) => (
                <View key={index} style={styles.translationCard}>
                  <View style={styles.translationHeader}>
                    <Text style={styles.translationTime}>
                      {formatTime(translation.timestamp)}
                    </Text>
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>
                        {Math.round(translation.confidence * 100)}%
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.originalText}>{translation.originalText}</Text>
                  <View style={styles.translationArrow}>
                    <Icon name="arrow-downward" size={16} color="#8E8E93" />
                  </View>
                  <Text style={styles.translatedText}>{translation.translatedText}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton}>
              <LinearGradient
                colors={['#007AFF', '#5856D6']}
                style={styles.actionGradient}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}>
                <Icon name="call" size={24} color="white" />
                <Text style={styles.actionText}>Start Call</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <LinearGradient
                colors={['#34C759', '#30D158']}
                style={styles.actionGradient}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}>
                <Icon name="mic" size={24} color="white" />
                <Text style={styles.actionText}>Quick Translate</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    padding: 20,
  },
  statsContainer: {
    marginBottom: 25,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 12,
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  statTitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  clearButton: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '500',
  },
  settingsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1C1C1E',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  translationsList: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  translationCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  translationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  translationTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  confidenceBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  confidenceText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '500',
  },
  originalText: {
    fontSize: 16,
    color: '#1C1C1E',
    marginBottom: 8,
  },
  translationArrow: {
    alignItems: 'center',
    marginVertical: 4,
  },
  translatedText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    marginTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 6,
  },
  actionGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default HomeScreen;

