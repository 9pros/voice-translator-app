import Voice from '@react-native-voice/voice';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import Tts from 'react-native-tts';
import RNFS from 'react-native-fs';
import {VoiceProfile, AudioChunk, TranslationResult} from '../types';
import SeamlessM4TService from './SeamlessM4TService';
import VoiceCloningService from './VoiceCloningService';

class VoiceService {
  private audioRecorderPlayer: AudioRecorderPlayer;
  private isRecording: boolean = false;
  private isPlaying: boolean = false;
  private recordingPath: string = '';
  private audioChunks: AudioChunk[] = [];
  private currentRecordingId: string = '';
  private useNativeProcessing: boolean = true;
  private voiceCloningEnabled: boolean = true;

  constructor() {
    this.audioRecorderPlayer = new AudioRecorderPlayer();
    this.initializeVoice();
    this.initializeTts();
    this.initializeNativeProcessing();
    this.initializeVoiceCloning();
  }

  private initializeVoice() {
    Voice.onSpeechStart = this.onSpeechStart;
    Voice.onSpeechRecognized = this.onSpeechRecognized;
    Voice.onSpeechEnd = this.onSpeechEnd;
    Voice.onSpeechError = this.onSpeechError;
    Voice.onSpeechResults = this.onSpeechResults;
    Voice.onSpeechPartialResults = this.onSpeechPartialResults;
    Voice.onSpeechVolumeChanged = this.onSpeechVolumeChanged;
  }

  private initializeTts() {
    Tts.setDefaultLanguage('en-US');
    Tts.setDefaultRate(0.5);
    Tts.setDefaultPitch(1.0);
  }

  private async initializeNativeProcessing() {
    try {
      const isReady = await SeamlessM4TService.isReady();
      this.useNativeProcessing = isReady;
      console.log(`Voice processing mode: ${isReady ? 'Native SeamlessM4T' : 'API-based'}`);
    } catch (error) {
      console.error('Failed to initialize native voice processing:', error);
      this.useNativeProcessing = false;
    }
  }

  private async initializeVoiceCloning() {
    try {
      const isReady = await VoiceCloningService.isReady();
      this.voiceCloningEnabled = isReady;
      console.log(`Voice cloning mode: ${isReady ? 'Enabled' : 'Disabled'}`);
    } catch (error) {
      console.error('Failed to initialize voice cloning:', error);
      this.voiceCloningEnabled = false;
    }
  }

  // Voice Recognition Event Handlers
  private onSpeechStart = (e: any) => {
    console.log('Speech recognition started', e);
  };

  private onSpeechRecognized = (e: any) => {
    console.log('Speech recognized', e);
  };

  private onSpeechEnd = (e: any) => {
    console.log('Speech recognition ended', e);
  };

  private onSpeechError = (e: any) => {
    console.log('Speech recognition error', e);
  };

  private onSpeechResults = (e: any) => {
    console.log('Speech results', e);
  };

  private onSpeechPartialResults = (e: any) => {
    console.log('Speech partial results', e);
  };

  private onSpeechVolumeChanged = (e: any) => {
    console.log('Speech volume changed', e);
  };

  // Recording Methods
  async startRecording(outputPath?: string): Promise<string> {
    try {
      if (this.isRecording) {
        await this.stopRecording();
      }

      const path = outputPath || `${RNFS.DocumentDirectoryPath}/recording_${Date.now()}.m4a`;
      this.recordingPath = path;

      const audioSet = {
        AudioEncoderAndroid: AudioRecorderPlayer.AudioEncoderAndroidType.AAC,
        AudioSourceAndroid: AudioRecorderPlayer.AudioSourceAndroidType.MIC,
        AVEncoderAudioQualityKeyIOS: AudioRecorderPlayer.AVEncoderAudioQualityIOSType.high,
        AVNumberOfChannelsKeyIOS: 1,
        AVFormatIDKeyIOS: AudioRecorderPlayer.AVEncodingOption.aac,
      };

      const result = await this.audioRecorderPlayer.startRecorder(path, audioSet);
      this.isRecording = true;
      console.log('Recording started:', result);
      return result;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<string> {
    try {
      if (!this.isRecording) {
        return '';
      }

      const result = await this.audioRecorderPlayer.stopRecorder();
      this.isRecording = false;
      console.log('Recording stopped:', result);
      return result;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  async pauseRecording(): Promise<void> {
    try {
      await this.audioRecorderPlayer.pauseRecorder();
    } catch (error) {
      console.error('Failed to pause recording:', error);
      throw error;
    }
  }

  async resumeRecording(): Promise<void> {
    try {
      await this.audioRecorderPlayer.resumeRecorder();
    } catch (error) {
      console.error('Failed to resume recording:', error);
      throw error;
    }
  }

  // Playback Methods
  async playAudio(filePath: string): Promise<void> {
    try {
      if (this.isPlaying) {
        await this.stopPlayback();
      }

      const msg = await this.audioRecorderPlayer.startPlayer(filePath);
      this.isPlaying = true;
      console.log('Playback started:', msg);

      this.audioRecorderPlayer.addPlayBackListener((e) => {
        if (e.currentPosition === e.duration) {
          this.stopPlayback();
        }
      });
    } catch (error) {
      console.error('Failed to play audio:', error);
      throw error;
    }
  }

  async stopPlayback(): Promise<void> {
    try {
      await this.audioRecorderPlayer.stopPlayer();
      this.audioRecorderPlayer.removePlayBackListener();
      this.isPlaying = false;
    } catch (error) {
      console.error('Failed to stop playback:', error);
      throw error;
    }
  }

  async pausePlayback(): Promise<void> {
    try {
      await this.audioRecorderPlayer.pausePlayer();
    } catch (error) {
      console.error('Failed to pause playback:', error);
      throw error;
    }
  }

  async resumePlayback(): Promise<void> {
    try {
      await this.audioRecorderPlayer.resumePlayer();
    } catch (error) {
      console.error('Failed to resume playback:', error);
      throw error;
    }
  }

  // Text-to-Speech Methods
  async speak(text: string, language: string = 'en-US', voiceProfile?: VoiceProfile): Promise<void> {
    try {
      await Tts.stop();
      
      if (voiceProfile) {
        // Apply voice profile settings
        await this.applyVoiceProfile(voiceProfile);
      } else {
        // Use default settings
        await Tts.setDefaultLanguage(language);
        await Tts.setDefaultRate(0.5);
        await Tts.setDefaultPitch(1.0);
      }

      await Tts.speak(text);
    } catch (error) {
      console.error('Failed to speak text:', error);
      throw error;
    }
  }

  async stopSpeaking(): Promise<void> {
    try {
      await Tts.stop();
    } catch (error) {
      console.error('Failed to stop speaking:', error);
      throw error;
    }
  }

  private async applyVoiceProfile(voiceProfile: VoiceProfile): Promise<void> {
    try {
      // Apply voice profile specific settings
      await Tts.setDefaultLanguage(voiceProfile.language);
      
      // Extract voice characteristics from profile name or metadata
      if (voiceProfile.name.includes('slow')) {
        await Tts.setDefaultRate(0.3);
      } else if (voiceProfile.name.includes('fast')) {
        await Tts.setDefaultRate(0.7);
      } else {
        await Tts.setDefaultRate(0.5);
      }

      if (voiceProfile.name.includes('high')) {
        await Tts.setDefaultPitch(1.2);
      } else if (voiceProfile.name.includes('low')) {
        await Tts.setDefaultPitch(0.8);
      } else {
        await Tts.setDefaultPitch(1.0);
      }
    } catch (error) {
      console.error('Failed to apply voice profile:', error);
    }
  }

  // Voice Recognition Methods
  async startListening(language: string = 'en-US'): Promise<void> {
    try {
      await Voice.start(language);
    } catch (error) {
      console.error('Failed to start listening:', error);
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    try {
      await Voice.stop();
    } catch (error) {
      console.error('Failed to stop listening:', error);
      throw error;
    }
  }

  async cancelListening(): Promise<void> {
    try {
      await Voice.cancel();
    } catch (error) {
      console.error('Failed to cancel listening:', error);
      throw error;
    }
  }

  async destroyListening(): Promise<void> {
    try {
      await Voice.destroy();
    } catch (error) {
      console.error('Failed to destroy listening:', error);
      throw error;
    }
  }

  // Voice Profile Methods
  async createVoiceProfile(
    profileName: string,
    audioSamples: string[],
    characteristics?: any
  ): Promise<VoiceProfile> {
    try {
      if (!this.voiceCloningEnabled) {
        throw new Error('Voice cloning not available');
      }

      return await VoiceCloningService.createVoiceProfile(
        profileName,
        audioSamples,
        characteristics
      );
    } catch (error) {
      console.error('Voice profile creation failed:', error);
      throw error;
    }
  }

  async getVoiceProfiles(): Promise<VoiceProfile[]> {
    try {
      if (!this.voiceCloningEnabled) {
        return [];
      }

      return await VoiceCloningService.getVoiceProfiles();
    } catch (error) {
      console.error('Failed to get voice profiles:', error);
      return [];
    }
  }

  async setActiveVoiceProfile(profileId: string): Promise<void> {
    try {
      if (!this.voiceCloningEnabled) {
        throw new Error('Voice cloning not available');
      }

      await VoiceCloningService.setActiveProfile(profileId);
    } catch (error) {
      console.error('Failed to set active voice profile:', error);
      throw error;
    }
  }

  async getActiveVoiceProfile(): Promise<VoiceProfile | null> {
    try {
      if (!this.voiceCloningEnabled) {
        return null;
      }

      return await VoiceCloningService.getActiveProfile();
    } catch (error) {
      console.error('Failed to get active voice profile:', error);
      return null;
    }
  }

  // Enhanced translation with voice cloning
  async translateVoiceWithCloning(
    audioPath: string,
    sourceLanguage: string,
    targetLanguage: string,
    preserveVoice: boolean = true,
    voiceProfile?: VoiceProfile,
  ): Promise<{translatedAudioPath: string; translationResult: TranslationResult; similarity?: number}> {
    try {
      // First, get the text translation
      let translationResult: TranslationResult;
      
      if (this.useNativeProcessing && await SeamlessM4TService.isReady()) {
        translationResult = await SeamlessM4TService.translateSpeechToText(
          audioPath,
          sourceLanguage,
          targetLanguage,
        );
      } else {
        // Fallback to API-based translation
        translationResult = await this.translateVoiceWithAPI(
          audioPath,
          sourceLanguage,
          targetLanguage,
          voiceProfile,
        );
      }

      let translatedAudioPath: string;
      let similarity: number | undefined;

      // Apply voice cloning if enabled and requested
      if (this.voiceCloningEnabled && preserveVoice) {
        const voiceCloneResult = await VoiceCloningService.translateWithVoiceCloning(
          audioPath,
          translationResult.translatedText,
          targetLanguage,
          preserveVoice
        );
        
        translatedAudioPath = voiceCloneResult.audioPath;
        similarity = voiceCloneResult.similarity;
      } else if (voiceProfile) {
        // Use existing voice profile for synthesis
        const synthesisResult = await VoiceCloningService.synthesizeVoiceWithCloning(
          translationResult.translatedText,
          voiceProfile.id,
          {
            language: targetLanguage,
            characteristics: voiceProfile.characteristics,
            quality: 'high'
          }
        );
        
        translatedAudioPath = synthesisResult.audioPath;
        similarity = synthesisResult.similarity;
      } else {
        // Standard TTS without voice cloning
        translatedAudioPath = await this.synthesizeTextToSpeech(
          translationResult.translatedText,
          targetLanguage
        );
      }

      return {
        translatedAudioPath,
        translationResult,
        similarity
      };
    } catch (error) {
      console.error('Voice translation with cloning failed:', error);
      throw error;
    }
  }

  // Real-time voice cloning for calls
  async processRealTimeVoiceCloning(
    audioChunk: AudioChunk,
    sourceLanguage: string,
    targetLanguage: string,
    voiceProfile?: VoiceProfile,
  ): Promise<{translatedAudio: string; translationResult: TranslationResult; similarity?: number} | null> {
    try {
      // Process real-time audio with SeamlessM4T
      let translationResult: TranslationResult | null = null;
      
      if (this.useNativeProcessing && await SeamlessM4TService.isReady()) {
        const seamlessResult = await SeamlessM4TService.processRealTimeAudio(
          audioChunk,
          sourceLanguage,
          targetLanguage,
        );
        
        if (seamlessResult) {
          translationResult = seamlessResult.translationResult;
        }
      }

      if (!translationResult) {
        // Fallback to API processing
        const fallbackResult = await this.processRealTimeAudioWithAPI(
          audioChunk,
          sourceLanguage,
          targetLanguage,
          voiceProfile,
        );
        
        if (fallbackResult) {
          translationResult = fallbackResult.translationResult;
        }
      }

      if (!translationResult) {
        return null;
      }

      // Apply voice cloning for real-time processing
      if (this.voiceCloningEnabled) {
        const voiceCloneResult = await VoiceCloningService.processRealTimeVoiceCloning(
          audioChunk,
          translationResult.translatedText,
          targetLanguage,
          voiceProfile?.id
        );

        if (voiceCloneResult) {
          return {
            translatedAudio: voiceCloneResult.clonedAudio,
            translationResult,
            similarity: voiceCloneResult.similarity
          };
        }
      }

      // Fallback to standard TTS
      const audioPath = await this.synthesizeTextToSpeech(
        translationResult.translatedText,
        targetLanguage
      );
      
      const audioBase64 = await RNFS.readFile(audioPath, 'base64');
      
      return {
        translatedAudio: audioBase64,
        translationResult
      };
    } catch (error) {
      console.error('Real-time voice cloning failed:', error);
      return null;
    }
  }

  // Enhanced TTS with voice characteristics
  async synthesizeTextToSpeechWithVoice(
    text: string,
    language: string,
    voiceProfile?: VoiceProfile,
    characteristics?: any
  ): Promise<string> {
    try {
      if (this.voiceCloningEnabled && voiceProfile) {
        const result = await VoiceCloningService.synthesizeVoiceWithCloning(
          text,
          voiceProfile.id,
          {
            language,
            characteristics: characteristics || voiceProfile.characteristics,
            quality: 'high'
          }
        );
        
        return result.audioPath;
      } else {
        // Fallback to standard TTS
        return await this.synthesizeTextToSpeech(text, language);
      }
    } catch (error) {
      console.error('Voice synthesis failed:', error);
      // Fallback to standard TTS
      return await this.synthesizeTextToSpeech(text, language);
    }
  }

  // Voice quality enhancement
  async enhanceVoiceQuality(audioPath: string): Promise<string> {
    try {
      if (this.voiceCloningEnabled) {
        return await VoiceCloningService.enhanceVoiceQuality(audioPath);
      } else {
        // Return original path if enhancement not available
        return audioPath;
      }
    } catch (error) {
      console.error('Voice enhancement failed:', error);
      return audioPath;
    }
  }

  // Voice comparison for profile matching
  async compareVoiceProfiles(profileId1: string, profileId2: string): Promise<number> {
    try {
      if (!this.voiceCloningEnabled) {
        return 0;
      }

      return await VoiceCloningService.compareVoices(profileId1, profileId2);
    } catch (error) {
      console.error('Voice comparison failed:', error);
      return 0;
    }
  }

  // Get voice cloning status and capabilities
  async getVoiceCloningStatus(): Promise<{
    enabled: boolean;
    modelsLoaded: boolean;
    availableProfiles: number;
    capabilities: string[];
  }> {
    try {
      const enabled = this.voiceCloningEnabled;
      const modelsLoaded = enabled && await VoiceCloningService.isReady();
      const profiles = await this.getVoiceProfiles();
      
      const capabilities = [];
      if (enabled) {
        capabilities.push('Voice Profile Creation');
        capabilities.push('Voice Synthesis');
        capabilities.push('Voice Cloning');
        capabilities.push('Real-time Processing');
        capabilities.push('Voice Enhancement');
        capabilities.push('Emotion Synthesis');
      }

      return {
        enabled,
        modelsLoaded,
        availableProfiles: profiles.length,
        capabilities
      };
    } catch (error) {
      console.error('Failed to get voice cloning status:', error);
      return {
        enabled: false,
        modelsLoaded: false,
        availableProfiles: 0,
        capabilities: []
      };
    }
  }

  // API-based Voice Translation Methods
  async translateVoice(
    audioPath: string,
    sourceLanguage: string,
    targetLanguage: string,
    voiceProfile?: VoiceProfile,
  ): Promise<{translatedAudioPath: string; translationResult: TranslationResult}> {
    try {
      // Try native processing first
      if (this.useNativeProcessing && await SeamlessM4TService.isReady()) {
        return await SeamlessM4TService.translateSpeechToSpeech(
          audioPath,
          sourceLanguage,
          targetLanguage,
        );
      }

      // Fallback to API-based processing
      return await this.translateVoiceWithAPI(
        audioPath,
        sourceLanguage,
        targetLanguage,
        voiceProfile,
      );
    } catch (error) {
      console.error('Voice translation failed:', error);
      throw error;
    }
  }

  async translateVoiceWithAPI(
    audioPath: string,
    sourceLanguage: string,
    targetLanguage: string,
    voiceProfile?: VoiceProfile,
  ): Promise<{translatedAudioPath: string; translationResult: TranslationResult}> {
    try {
      const translatedAudioPath = `${RNFS.DocumentDirectoryPath}/translated_${Date.now()}.m4a`;
      const translationResult = await SeamlessM4TService.translateSpeechToSpeech(
        audioPath,
        sourceLanguage,
        targetLanguage,
      );
      await RNFS.copyFile(audioPath, translatedAudioPath);
      return {translatedAudioPath, translationResult};
    } catch (error) {
      console.error('API-based voice translation failed:', error);
      throw error;
    }
  }

  async processRealTimeAudio(
    audioChunk: AudioChunk,
    sourceLanguage: string,
    targetLanguage: string,
    voiceProfile?: VoiceProfile,
  ): Promise<{translatedAudio: string; translationResult: TranslationResult} | null> {
    try {
      // Use native processing for real-time audio
      if (this.useNativeProcessing && await SeamlessM4TService.isReady()) {
        return await SeamlessM4TService.processRealTimeAudio(
          audioChunk,
          sourceLanguage,
          targetLanguage,
        );
      }

      // Fallback to API-based real-time processing
      return await this.processRealTimeAudioWithAPI(
        audioChunk,
        sourceLanguage,
        targetLanguage,
        voiceProfile,
      );
    } catch (error) {
      console.error('Real-time audio processing failed:', error);
      return null;
    }
  }

  async processRealTimeAudioWithAPI(
    audioChunk: AudioChunk,
    sourceLanguage: string,
    targetLanguage: string,
    voiceProfile?: VoiceProfile,
  ): Promise<{translatedAudio: string; translationResult: TranslationResult} | null> {
    try {
      const translatedAudio = await SeamlessM4TService.processRealTimeAudio(
        audioChunk,
        sourceLanguage,
        targetLanguage,
      );
      return {translatedAudio, translationResult: {translatedText: translatedAudio}};
    } catch (error) {
      console.error('API-based real-time audio processing failed:', error);
      return null;
    }
  }

  async detectLanguageFromAudio(audioPath: string): Promise<string> {
    try {
      // Use native language detection
      if (this.useNativeProcessing && await SeamlessM4TService.isReady()) {
        return await SeamlessM4TService.detectLanguage(audioPath);
      }

      // Fallback to API-based detection
      return await this.detectLanguageWithAPI(audioPath);
    } catch (error) {
      console.error('Language detection failed:', error);
      return 'en'; // Default to English
    }
  }

  async detectLanguageWithAPI(audioPath: string): Promise<string> {
    try {
      const detectedLanguage = await SeamlessM4TService.detectLanguage(audioPath);
      return detectedLanguage;
    } catch (error) {
      console.error('API-based language detection failed:', error);
      return 'en'; // Default to English
    }
  }

  // Utility Methods
  async getAudioDuration(filePath: string): Promise<number> {
    try {
      // This would typically use a native module to get audio duration
      // For now, return a mock duration
      return 5000; // 5 seconds
    } catch (error) {
      console.error('Failed to get audio duration:', error);
      return 0;
    }
  }

  async convertAudioToBase64(filePath: string): Promise<string> {
    try {
      const audioData = await RNFS.readFile(filePath, 'base64');
      return audioData;
    } catch (error) {
      console.error('Failed to convert audio to base64:', error);
      throw error;
    }
  }

  async saveBase64Audio(base64Data: string, fileName: string): Promise<string> {
    try {
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      await RNFS.writeFile(filePath, base64Data, 'base64');
      return filePath;
    } catch (error) {
      console.error('Failed to save base64 audio:', error);
      throw error;
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    try {
      if (this.isRecording) {
        await this.stopRecording();
      }
      if (this.isPlaying) {
        await this.stopPlayback();
      }
      await this.destroyListening();
      await Tts.stop();
    } catch (error) {
      console.error('Failed to cleanup voice service:', error);
    }
  }

  // Getters
  get isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  get isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  get currentRecordingPath(): string {
    return this.recordingPath;
  }
}

export default new VoiceService();
