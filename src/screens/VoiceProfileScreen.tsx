import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {useVoiceProfile} from '../context/VoiceProfileContext';
import VoiceService from '../services/VoiceService';
import {VoiceProfile} from '../types';

const SAMPLE_TEXTS = [
  'Hello, how are you today?',
  'Thank you for calling, how can I help you?',
  'I would like to schedule an appointment for next week.',
  'The weather is beautiful today, isn\'t it?',
  'Please hold on while I transfer your call.',
];

const VoiceProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const {
    state,
    addProfile,
    updateProfile,
    deleteProfile,
    setActiveProfile,
    setRecording,
    setTraining,
  } = useVoiceProfile();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [currentSampleIndex, setCurrentSampleIndex] = useState(0);
  const [recordedSamples, setRecordedSamples] = useState<string[]>([]);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [recordingAnimation] = useState(new Animated.Value(1));

  useEffect(() => {
    if (state.isRecording) {
      startRecordingAnimation();
    } else {
      stopRecordingAnimation();
    }
  }, [state.isRecording]);

  const startRecordingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(recordingAnimation, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(recordingAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const stopRecordingAnimation = () => {
    recordingAnimation.stopAnimation();
    recordingAnimation.setValue(1);
  };

  const handleCreateProfile = () => {
    setShowCreateModal(true);
    setProfileName('');
    setSelectedLanguage('en-US');
    setCurrentSampleIndex(0);
    setRecordedSamples([]);
  };

  const handleStartRecording = async () => {
    try {
      setRecording(true);
      await VoiceService.startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      setRecording(false);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      const recordingPath = await VoiceService.stopRecording();
      setRecording(false);

      if (recordingPath) {
        const newSamples = [...recordedSamples, recordingPath];
        setRecordedSamples(newSamples);

        if (currentSampleIndex < SAMPLE_TEXTS.length - 1) {
          setCurrentSampleIndex(currentSampleIndex + 1);
        } else {
          // All samples recorded, create the profile
          await createVoiceProfile(newSamples);
        }
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setRecording(false);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const createVoiceProfile = async (samples: string[]) => {
    if (!profileName.trim()) {
      Alert.alert('Error', 'Please enter a profile name');
      return;
    }

    setIsCreatingProfile(true);
    setTraining(true);

    try {
      const newProfile: VoiceProfile = {
        id: `profile_${Date.now()}`,
        name: profileName.trim(),
        language: selectedLanguage,
        audioSamples: samples,
        createdAt: new Date(),
        isActive: false,
      };

      // Train the voice profile
      const trainedProfile = await VoiceService.trainVoiceProfile(newProfile);
      
      addProfile(trainedProfile);
      setShowCreateModal(false);
      
      Alert.alert(
        'Success',
        'Voice profile created successfully!',
        [
          {
            text: 'Set as Active',
            onPress: () => setActiveProfile(trainedProfile),
          },
          {text: 'OK', style: 'cancel'},
        ],
      );
    } catch (error) {
      console.error('Failed to create voice profile:', error);
      Alert.alert('Error', 'Failed to create voice profile');
    } finally {
      setIsCreatingProfile(false);
      setTraining(false);
    }
  };

  const handleDeleteProfile = (profile: VoiceProfile) => {
    Alert.alert(
      'Delete Profile',
      `Are you sure you want to delete "${profile.name}"? This action cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteProfile(profile.id),
        },
      ],
    );
  };

  const handleSetActiveProfile = (profile: VoiceProfile) => {
    setActiveProfile(profile);
    Alert.alert('Success', `"${profile.name}" is now your active voice profile`);
  };

  const ProfileCard: React.FC<{profile: VoiceProfile}> = ({profile}) => (
    <View style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileLanguage}>{profile.language}</Text>
          <Text style={styles.profileDate}>
            Created {profile.createdAt.toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.profileActions}>
          {state.activeProfile?.id === profile.id && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.profileControls}>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => handleSetActiveProfile(profile)}>
          <Icon name="check-circle" size={20} color="#34C759" />
          <Text style={styles.profileButtonText}>Set Active</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => {
            // Test the voice profile
            VoiceService.speak(
              'This is a test of your voice profile',
              profile.language,
              profile,
            );
          }}>
          <Icon name="play-arrow" size={20} color="#007AFF" />
          <Text style={styles.profileButtonText}>Test</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => handleDeleteProfile(profile)}>
          <Icon name="delete" size={20} color="#FF3B30" />
          <Text style={styles.profileButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const CreateProfileModal: React.FC = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={() => setShowCreateModal(false)}
            style={styles.modalCloseButton}>
            <Icon name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Create Voice Profile</Text>
          <View style={styles.modalCloseButton} />
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Profile Setup */}
          {currentSampleIndex === 0 && recordedSamples.length === 0 && (
            <View style={styles.setupSection}>
              <Text style={styles.setupTitle}>Profile Information</Text>
              <TextInput
                style={styles.nameInput}
                placeholder="Enter profile name"
                value={profileName}
                onChangeText={setProfileName}
              />
              
              <Text style={styles.setupDescription}>
                You'll need to record 5 sample phrases to create your voice profile.
                This helps the app learn your voice characteristics for better translation.
              </Text>
              
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => setCurrentSampleIndex(0)}>
                <LinearGradient
                  colors={['#007AFF', '#5856D6']}
                  style={styles.startButtonGradient}>
                  <Icon name="mic" size={24} color="white" />
                  <Text style={styles.startButtonText}>Start Recording</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Recording Section */}
          {(currentSampleIndex >= 0 && currentSampleIndex < SAMPLE_TEXTS.length) && (
            <View style={styles.recordingSection}>
              <Text style={styles.recordingTitle}>
                Sample {currentSampleIndex + 1} of {SAMPLE_TEXTS.length}
              </Text>
              
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {width: `${((currentSampleIndex + 1) / SAMPLE_TEXTS.length) * 100}%`},
                  ]}
                />
              </View>
              
              <View style={styles.sampleTextContainer}>
                <Text style={styles.sampleText}>
                  {SAMPLE_TEXTS[currentSampleIndex]}
                </Text>
              </View>
              
              <Text style={styles.recordingInstructions}>
                Read the text above clearly and naturally
              </Text>
              
              <Animated.View style={{transform: [{scale: recordingAnimation}]}}>
                <TouchableOpacity
                  style={[
                    styles.recordButton,
                    state.isRecording && styles.recordButtonActive,
                  ]}
                  onPress={state.isRecording ? handleStopRecording : handleStartRecording}>
                  <Icon
                    name={state.isRecording ? 'stop' : 'mic'}
                    size={32}
                    color={state.isRecording ? '#FF3B30' : 'white'}
                  />
                </TouchableOpacity>
              </Animated.View>
              
              <Text style={styles.recordingStatus}>
                {state.isRecording ? 'Recording...' : 'Tap to record'}
              </Text>
              
              {recordedSamples.length > 0 && (
                <View style={styles.completedSamples}>
                  <Text style={styles.completedText}>
                    ✓ {recordedSamples.length} sample(s) recorded
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Training Section */}
          {state.isTraining && (
            <View style={styles.trainingSection}>
              <Text style={styles.trainingTitle}>Training Voice Profile</Text>
              <Text style={styles.trainingDescription}>
                Please wait while we process your voice samples...
              </Text>
              <View style={styles.trainingIndicator}>
                <Text style={styles.trainingText}>Training in progress...</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#007AFF', '#5856D6']}
        style={styles.header}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Voice Profiles</Text>
          <Text style={styles.headerSubtitle}>Manage your voice profiles</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Active Profile Info */}
        {state.activeProfile && (
          <View style={styles.activeProfileSection}>
            <Text style={styles.sectionTitle}>Active Profile</Text>
            <View style={styles.activeProfileCard}>
              <Icon name="record-voice-over" size={32} color="#34C759" />
              <View style={styles.activeProfileInfo}>
                <Text style={styles.activeProfileName}>
                  {state.activeProfile.name}
                </Text>
                <Text style={styles.activeProfileLanguage}>
                  {state.activeProfile.language}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deactivateButton}
                onPress={() => setActiveProfile(null)}>
                <Text style={styles.deactivateButtonText}>Deactivate</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Create New Profile */}
        <View style={styles.createSection}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateProfile}>
            <LinearGradient
              colors={['#34C759', '#30D158']}
              style={styles.createButtonGradient}>
              <Icon name="add" size={24} color="white" />
              <Text style={styles.createButtonText}>Create New Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Profiles List */}
        <View style={styles.profilesSection}>
          <Text style={styles.sectionTitle}>
            All Profiles ({state.profiles.length})
          </Text>
          
          {state.profiles.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="record-voice-over" size={64} color="#C7C7CC" />
              <Text style={styles.emptyStateText}>No voice profiles yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Create a voice profile to improve translation accuracy and speed
              </Text>
            </View>
          ) : (
            <View style={styles.profilesList}>
              {state.profiles.map(profile => (
                <ProfileCard key={profile.id} profile={profile} />
              ))}
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>About Voice Profiles</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Voice profiles help improve translation accuracy by learning your unique voice characteristics.
              The more you use a profile, the better it becomes at understanding your speech patterns.
            </Text>
            
            <View style={styles.infoPoints}>
              <View style={styles.infoPoint}>
                <Icon name="speed" size={20} color="#007AFF" />
                <Text style={styles.infoPointText}>Faster translation processing</Text>
              </View>
              <View style={styles.infoPoint}>
                <Icon name="accuracy" size={20} color="#34C759" />
                <Text style={styles.infoPointText}>Improved accuracy</Text>
              </View>
              <View style={styles.infoPoint}>
                <Icon name="security" size={20} color="#FF9500" />
                <Text style={styles.infoPointText}>Stored locally and securely</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <CreateProfileModal />
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
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  backButton: {
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 15,
  },
  activeProfileSection: {
    marginBottom: 25,
  },
  activeProfileCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeProfileInfo: {
    flex: 1,
    marginLeft: 15,
  },
  activeProfileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  activeProfileLanguage: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  deactivateButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
  },
  deactivateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  createSection: {
    marginBottom: 25,
  },
  createButton: {
    borderRadius: 12,
  },
  createButtonGradient: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  profilesSection: {
    marginBottom: 25,
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
  profilesList: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileCard: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  profileLanguage: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 2,
  },
  profileDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  profileActions: {
    alignItems: 'flex-end',
  },
  activeBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  profileControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  profileButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  infoSection: {
    marginBottom: 25,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 16,
    color: '#1C1C1E',
    lineHeight: 24,
    marginBottom: 20,
  },
  infoPoints: {
    gap: 12,
  },
  infoPoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoPointText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#1C1C1E',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  setupSection: {
    alignItems: 'center',
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 20,
  },
  nameInput: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  setupDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  startButton: {
    width: '100%',
  },
  startButtonGradient: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  recordingSection: {
    alignItems: 'center',
  },
  recordingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 20,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    marginBottom: 30,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  sampleTextContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    width: '100%',
  },
  sampleText: {
    fontSize: 18,
    color: '#1C1C1E',
    textAlign: 'center',
    lineHeight: 26,
  },
  recordingInstructions: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 30,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    shadowColor: '#007AFF',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordButtonActive: {
    backgroundColor: '#FF3B30',
    shadowColor: '#FF3B30',
  },
  recordingStatus: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 20,
  },
  completedSamples: {
    backgroundColor: '#34C759',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  completedText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  trainingSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  trainingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 20,
  },
  trainingDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 30,
  },
  trainingIndicator: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  trainingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default VoiceProfileScreen;

