import Voice from '@react-native-voice/voice';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import Tts from 'react-native-tts';
import RNFS from 'react-native-fs';
import {VoiceProfile, AudioChunk, TranslationResult} from '../types';
import SeamlessM4TService from './SeamlessM4TService';

class VoiceService {
  private audioRecorderPlayer: AudioRecorderPlayer;
  private isRecording: boolean = false;
  private isPlaying: boolean = false;
  private recordingPath: string = '';
  private audioChunks: AudioChunk[] = [];
  private currentRecordingId: string = '';
  private useNativeProcessing: boolean = true;

  constructor() {
    this.audioRecorderPlayer = new AudioRecorderPlayer();
    this.initializeVoice();
    this.initializeTts();
    this.initializeNativeProcessing();
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
    name: string,
    language: string,
    sampleTexts: string[],
  ): Promise<VoiceProfile> {
    try {
      const profileId = `profile_${Date.now()}`;
      const audioSamples: string[] = [];

      // Record audio samples for each text
      for (let i = 0; i < sampleTexts.length; i++) {
        const samplePath = `${RNFS.DocumentDirectoryPath}/${profileId}_sample_${i}.m4a`;
        
        // In a real implementation, you would:
        // 1. Display the text to the user
        // 2. Record their voice saying the text
        // 3. Save the audio file
        // 4. Process the audio to extract voice characteristics
        
        audioSamples.push(samplePath);
      }

      const voiceProfile: VoiceProfile = {
        id: profileId,
        name,
        language,
        audioSamples,
        createdAt: new Date(),
        isActive: false,
      };

      return voiceProfile;
    } catch (error) {
      console.error('Failed to create voice profile:', error);
      throw error;
    }
  }

  async trainVoiceProfile(voiceProfile: VoiceProfile): Promise<VoiceProfile> {
    try {
      // In a real implementation, this would:
      // 1. Process all audio samples
      // 2. Extract voice characteristics (pitch, tone, speed, etc.)
      // 3. Create a voice model
      // 4. Save the trained model
      
      // Mock training process
      await new Promise(resolve => setTimeout(resolve, 3000));

      return {
        ...voiceProfile,
        isActive: true,
      };
    } catch (error) {
      console.error('Failed to train voice profile:', error);
      throw error;
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
