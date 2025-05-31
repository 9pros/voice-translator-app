import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import {useTranslation} from '../context/TranslationContext';
import {useVoiceProfile} from '../context/VoiceProfileContext';
import VoiceService from '../services/VoiceService';
import TranslationService from '../services/TranslationService';
import {Language} from '../types';

const SUPPORTED_LANGUAGES: Language[] = [
  {code: 'en', name: 'English', flag: '🇺🇸'},
  {code: 'es', name: 'Spanish', flag: '🇪🇸'},
  {code: 'fr', name: 'French', flag: '🇫🇷'},
  {code: 'de', name: 'German', flag: '🇩🇪'},
  {code: 'it', name: 'Italian', flag: '🇮🇹'},
  {code: 'pt', name: 'Portuguese', flag: '🇵🇹'},
  {code: 'ru', name: 'Russian', flag: '🇷🇺'},
  {code: 'zh', name: 'Chinese', flag: '🇨🇳'},
  {code: 'ja', name: 'Japanese', flag: '🇯🇵'},
  {code: 'ko', name: 'Korean', flag: '🇰🇷'},
];

const TranslationScreen: React.FC = () => {
  const {
    state,
    setSourceLanguage,
    setTargetLanguage,
    addTranslation,
    swapLanguages,
    toggleRealTimeMode,
    toggleVoiceProfile,
  } = useTranslation();
  const {state: voiceState} = useVoiceProfile();

  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState<'source' | 'target' | null>(null);
  const [recordingAnimation] = useState(new Animated.Value(1));

  useEffect(() => {
    if (isRecording) {
      startRecordingAnimation();
    } else {
      stopRecordingAnimation();
    }
  }, [isRecording]);

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

  const handleTranslate = async () => {
    if (!inputText.trim()) {
      Alert.alert('Error', 'Please enter text to translate');
      return;
    }

    setIsTranslating(true);
    try {
      const translation = await TranslationService.translateText(
        inputText,
        state.sourceLanguage.code,
        state.targetLanguage.code,
        voiceState.activeProfile || undefined,
      );

      setTranslatedText(translation.translatedText);
      addTranslation(translation);

      // Speak the translation if voice profile is enabled
      if (state.useVoiceProfile && voiceState.activeProfile) {
        await VoiceService.speak(
          translation.translatedText,
          state.targetLanguage.code,
          voiceState.activeProfile,
        );
      }
    } catch (error) {
      console.error('Translation failed:', error);
      Alert.alert('Error', 'Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleVoiceInput = async () => {
    if (isRecording) {
      // Stop recording
      try {
        setIsRecording(false);
        const recordingPath = await VoiceService.stopRecording();
        
        if (recordingPath) {
          setIsTranslating(true);
          
          // Convert audio to base64
          const audioData = await VoiceService.convertAudioToBase64(recordingPath);
          
          // Translate the audio
          const translation = await TranslationService.translateStream(
            audioData,
            state.sourceLanguage.code,
            state.targetLanguage.code,
            voiceState.activeProfile || undefined,
          );
          
          if (translation) {
            setInputText(translation.originalText);
            setTranslatedText(translation.translatedText);
            addTranslation(translation);
            
            // Speak the translation
            if (state.useVoiceProfile && voiceState.activeProfile) {
              await VoiceService.speak(
                translation.translatedText,
                state.targetLanguage.code,
                voiceState.activeProfile,
              );
            }
          }
        }
      } catch (error) {
        console.error('Voice input failed:', error);
        Alert.alert('Error', 'Voice input failed. Please try again.');
      } finally {
        setIsTranslating(false);
      }
    } else {
      // Start recording
      try {
        setIsRecording(true);
        await VoiceService.startRecording();
      } catch (error) {
        console.error('Failed to start recording:', error);
        setIsRecording(false);
        Alert.alert('Error', 'Failed to start voice recording.');
      }
    }
  };

  const handleLanguageSelect = (language: Language) => {
    if (showLanguageSelector === 'source') {
      setSourceLanguage(language);
    } else if (showLanguageSelector === 'target') {
      setTargetLanguage(language);
    }
    setShowLanguageSelector(null);
  };

  const handleSpeakTranslation = async () => {
    if (!translatedText.trim()) {
      Alert.alert('Error', 'No translation to speak');
      return;
    }

    try {
      await VoiceService.speak(
        translatedText,
        state.targetLanguage.code,
        voiceState.activeProfile || undefined,
      );
    } catch (error) {
      console.error('Failed to speak translation:', error);
      Alert.alert('Error', 'Failed to speak translation');
    }
  };

  const LanguageSelector: React.FC = () => (
    <View style={styles.languageSelectorModal}>
      <View style={styles.languageSelectorContent}>
        <Text style={styles.languageSelectorTitle}>Select Language</Text>
        <ScrollView style={styles.languageList}>
          {SUPPORTED_LANGUAGES.map(language => (
            <TouchableOpacity
              key={language.code}
              style={styles.languageItem}
              onPress={() => handleLanguageSelect(language)}>
              <Text style={styles.languageFlag}>{language.flag}</Text>
              <Text style={styles.languageName}>{language.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => setShowLanguageSelector(null)}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#007AFF', '#5856D6']}
        style={styles.header}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}>
        <Text style={styles.headerTitle}>Translation</Text>
        <Text style={styles.headerSubtitle}>Text and voice translation</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Language Selection */}
        <View style={styles.languageSection}>
          <TouchableOpacity
            style={styles.languageButton}
            onPress={() => setShowLanguageSelector('source')}>
            <Text style={styles.languageFlag}>{state.sourceLanguage.flag}</Text>
            <Text style={styles.languageText}>{state.sourceLanguage.name}</Text>
            <Icon name="arrow-drop-down" size={24} color="#007AFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.swapButton} onPress={swapLanguages}>
            <Icon name="swap-horiz" size={24} color="#007AFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.languageButton}
            onPress={() => setShowLanguageSelector('target')}>
            <Text style={styles.languageFlag}>{state.targetLanguage.flag}</Text>
            <Text style={styles.languageText}>{state.targetLanguage.name}</Text>
            <Icon name="arrow-drop-down" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Enter Text</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder={`Type in ${state.sourceLanguage.name}...`}
              value={inputText}
              onChangeText={setInputText}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.inputActions}>
              <Animated.View style={{transform: [{scale: recordingAnimation}]}}>
                <TouchableOpacity
                  style={[
                    styles.voiceButton,
                    isRecording && styles.voiceButtonActive,
                  ]}
                  onPress={handleVoiceInput}>
                  <Icon
                    name={isRecording ? 'stop' : 'mic'}
                    size={24}
                    color={isRecording ? '#FF3B30' : '#007AFF'}
                  />
                </TouchableOpacity>
              </Animated.View>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setInputText('');
                  setTranslatedText('');
                }}>
                <Icon name="clear" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Translation Button */}
        <TouchableOpacity
          style={styles.translateButton}
          onPress={handleTranslate}
          disabled={isTranslating || !inputText.trim()}>
          <LinearGradient
            colors={
              isTranslating || !inputText.trim()
                ? ['#C7C7CC', '#C7C7CC']
                : ['#007AFF', '#5856D6']
            }
            style={styles.translateButtonGradient}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}>
            {isTranslating ? (
              <Text style={styles.translateButtonText}>Translating...</Text>
            ) : (
              <>
                <Icon name="translate" size={24} color="white" />
                <Text style={styles.translateButtonText}>Translate</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Output Section */}
        {translatedText && (
          <View style={styles.outputSection}>
            <Text style={styles.sectionTitle}>Translation</Text>
            <View style={styles.outputContainer}>
              <Text style={styles.translatedText}>{translatedText}</Text>
              <View style={styles.outputActions}>
                <TouchableOpacity
                  style={styles.speakButton}
                  onPress={handleSpeakTranslation}>
                  <Icon name="volume-up" size={24} color="#34C759" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => {
                    // Copy to clipboard functionality would go here
                    Alert.alert('Copied', 'Translation copied to clipboard');
                  }}>
                  <Icon name="content-copy" size={20} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.settingsContainer}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={toggleRealTimeMode}>
              <View style={styles.settingInfo}>
                <Icon
                  name={state.realTimeMode ? 'flash-on' : 'flash-off'}
                  size={24}
                  color={state.realTimeMode ? '#34C759' : '#8E8E93'}
                />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Real-time Mode</Text>
                  <Text style={styles.settingDescription}>
                    Translate speech as you speak
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.toggle,
                  state.realTimeMode && styles.toggleActive,
                ]}>
                <View
                  style={[
                    styles.toggleThumb,
                    state.realTimeMode && styles.toggleThumbActive,
                  ]}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={toggleVoiceProfile}>
              <View style={styles.settingInfo}>
                <Icon
                  name={state.useVoiceProfile ? 'record-voice-over' : 'voice-over-off'}
                  size={24}
                  color={state.useVoiceProfile ? '#34C759' : '#8E8E93'}
                />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Voice Profile</Text>
                  <Text style={styles.settingDescription}>
                    Use custom voice for better translation
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.toggle,
                  state.useVoiceProfile && styles.toggleActive,
                ]}>
                <View
                  style={[
                    styles.toggleThumb,
                    state.useVoiceProfile && styles.toggleThumbActive,
                  ]}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Language Selector Modal */}
      {showLanguageSelector && <LanguageSelector />}
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
  languageSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  languageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 10,
  },
  languageText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  swapButton: {
    marginHorizontal: 15,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 15,
  },
  inputSection: {
    marginBottom: 25,
  },
  inputContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textInput: {
    padding: 20,
    fontSize: 16,
    color: '#1C1C1E',
    minHeight: 120,
    maxHeight: 200,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  voiceButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  voiceButtonActive: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  clearButton: {
    padding: 10,
  },
  translateButton: {
    marginBottom: 25,
  },
  translateButtonGradient: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  translateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  outputSection: {
    marginBottom: 25,
  },
  outputContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  translatedText: {
    padding: 20,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    minHeight: 80,
  },
  outputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  speakButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#34C759',
  },
  copyButton: {
    padding: 10,
  },
  settingsSection: {
    marginBottom: 25,
  },
  settingsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 15,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  settingDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#34C759',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  languageSelectorModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageSelectorContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    margin: 20,
    maxHeight: '70%',
    width: '90%',
  },
  languageSelectorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  languageList: {
    maxHeight: 400,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  languageName: {
    fontSize: 16,
    color: '#1C1C1E',
    marginLeft: 15,
  },
  cancelButton: {
    padding: 20,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});

export default TranslationScreen;

