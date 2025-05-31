import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from '../context/TranslationContext';
import {useVoiceProfile} from '../context/VoiceProfileContext';
import VoiceService from '../services/VoiceService';
import TranslationService from '../services/TranslationService';

const {width, height} = Dimensions.get('window');

interface CallScreenParams {
  phoneNumber: string;
  translationEnabled: boolean;
  contactName?: string;
}

const CallScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as CallScreenParams;
  
  const {state: translationState, addTranslation} = useTranslation();
  const {state: voiceState} = useVoiceProfile();
  
  const [isConnected, setIsConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentTranslation, setCurrentTranslation] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const translateAnim = useRef(new Animated.Value(0)).current;
  const callTimer = useRef<NodeJS.Timeout>();
  const translationTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Simulate call connection
    const connectionTimer = setTimeout(() => {
      setIsConnected(true);
      startCallTimer();
      if (params.translationEnabled) {
        startTranslation();
      }
    }, 2000);

    // Start pulse animation
    startPulseAnimation();

    return () => {
      clearTimeout(connectionTimer);
      if (callTimer.current) {
        clearInterval(callTimer.current);
      }
      if (translationTimer.current) {
        clearInterval(translationTimer.current);
      }
      VoiceService.cleanup();
    };
  }, []);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const startCallTimer = () => {
    callTimer.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const startTranslation = async () => {
    try {
      setIsTranslating(true);
      
      // Start continuous voice recognition and translation
      translationTimer.current = setInterval(async () => {
        if (isRecording) return;
        
        setIsRecording(true);
        
        try {
          // Record a short audio chunk
          const recordingPath = await VoiceService.startRecording();
          
          // Stop recording after 3 seconds
          setTimeout(async () => {
            try {
              await VoiceService.stopRecording();
              
              // Convert audio to base64
              const audioData = await VoiceService.convertAudioToBase64(recordingPath);
              
              // Translate the audio
              const translation = await TranslationService.translateStream(
                audioData,
                translationState.sourceLanguage.code,
                translationState.targetLanguage.code,
                voiceState.activeProfile || undefined,
              );
              
              if (translation) {
                setCurrentTranslation(translation.translatedText);
                addTranslation(translation);
                
                // Speak the translation
                if (translation.translatedText.trim()) {
                  await VoiceService.speak(
                    translation.translatedText,
                    translationState.targetLanguage.code,
                    voiceState.activeProfile || undefined,
                  );
                }
                
                // Animate translation display
                Animated.sequence([
                  Animated.timing(translateAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                  }),
                  Animated.delay(3000),
                  Animated.timing(translateAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                  }),
                ]).start();
              }
            } catch (error) {
              console.error('Translation error:', error);
            } finally {
              setIsRecording(false);
            }
          }, 3000);
        } catch (error) {
          console.error('Recording error:', error);
          setIsRecording(false);
        }
      }, 5000); // Check for new audio every 5 seconds
    } catch (error) {
      console.error('Failed to start translation:', error);
      setIsTranslating(false);
    }
  };

  const stopTranslation = () => {
    setIsTranslating(false);
    if (translationTimer.current) {
      clearInterval(translationTimer.current);
    }
    VoiceService.stopSpeaking();
  };

  const handleEndCall = () => {
    Alert.alert(
      'End Call',
      'Are you sure you want to end this call?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'End Call',
          style: 'destructive',
          onPress: () => {
            if (callTimer.current) {
              clearInterval(callTimer.current);
            }
            if (translationTimer.current) {
              clearInterval(translationTimer.current);
            }
            VoiceService.cleanup();
            navigation.goBack();
          },
        },
      ],
    );
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // In a real app, this would mute/unmute the microphone
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // In a real app, this would toggle speaker/earpiece
  };

  const toggleTranslation = () => {
    if (isTranslating) {
      stopTranslation();
    } else {
      startTranslation();
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getContactName = (): string => {
    return params.contactName || params.phoneNumber;
  };

  const getCallStatus = (): string => {
    if (!isConnected) {
      return 'Connecting...';
    }
    if (isTranslating) {
      return `Translating • ${formatDuration(callDuration)}`;
    }
    return formatDuration(callDuration);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <LinearGradient
        colors={['#1C1C1E', '#2C2C2E']}
        style={styles.background}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.callStatus}>{getCallStatus()}</Text>
          {params.translationEnabled && (
            <View style={styles.translationBadge}>
              <Icon name="translate" size={16} color="white" />
              <Text style={styles.translationBadgeText}>Translation Active</Text>
            </View>
          )}
        </View>

        {/* Contact Info */}
        <View style={styles.contactSection}>
          <Animated.View
            style={[
              styles.avatarContainer,
              {transform: [{scale: pulseAnim}]},
            ]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getContactName().charAt(0).toUpperCase()}
              </Text>
            </View>
          </Animated.View>
          
          <Text style={styles.contactName}>{getContactName()}</Text>
          <Text style={styles.phoneNumber}>{params.phoneNumber}</Text>
          
          {params.translationEnabled && (
            <View style={styles.languageInfo}>
              <Text style={styles.languageText}>
                {translationState.sourceLanguage.flag} {translationState.sourceLanguage.name} → {translationState.targetLanguage.flag} {translationState.targetLanguage.name}
              </Text>
            </View>
          )}
        </View>

        {/* Translation Display */}
        {params.translationEnabled && currentTranslation && (
          <Animated.View
            style={[
              styles.translationDisplay,
              {opacity: translateAnim},
            ]}>
            <Text style={styles.translationText}>{currentTranslation}</Text>
          </Animated.View>
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Listening...</Text>
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.controlsContainer}>
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={toggleMute}>
              <Icon
                name={isMuted ? 'mic-off' : 'mic'}
                size={24}
                color={isMuted ? '#FF3B30' : 'white'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
              onPress={toggleSpeaker}>
              <Icon
                name={isSpeakerOn ? 'volume-up' : 'volume-down'}
                size={24}
                color={isSpeakerOn ? '#007AFF' : 'white'}
              />
            </TouchableOpacity>

            {params.translationEnabled && (
              <TouchableOpacity
                style={[styles.controlButton, isTranslating && styles.controlButtonActive]}
                onPress={toggleTranslation}>
                <Icon
                  name="translate"
                  size={24}
                  color={isTranslating ? '#34C759' : 'white'}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* End Call Button */}
          <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
            <LinearGradient
              colors={['#FF3B30', '#FF6B6B']}
              style={styles.endCallGradient}>
              <Icon name="call-end" size={32} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Voice Profile Info */}
        {params.translationEnabled && voiceState.activeProfile && (
          <View style={styles.voiceProfileInfo}>
            <Icon name="record-voice-over" size={16} color="#34C759" />
            <Text style={styles.voiceProfileText}>
              Using voice profile: {voiceState.activeProfile.name}
            </Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 44,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  callStatus: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
  },
  translationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  translationBadgeText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  contactSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  avatarContainer: {
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  contactName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  phoneNumber: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 20,
  },
  languageInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  languageText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  translationDisplay: {
    marginHorizontal: 20,
    marginVertical: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  translationText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  recordingText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  controlsContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 50,
    paddingHorizontal: 40,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  endCallButton: {
    alignSelf: 'center',
  },
  endCallGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  voiceProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  voiceProfileText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginLeft: 6,
  },
});

export default CallScreen;

