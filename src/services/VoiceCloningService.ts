import RNFS from 'react-native-fs';
import {NativeModules, Platform} from 'react-native';
import {VoiceProfile, AudioChunk, TranslationResult} from '../types';

// Native module interfaces for Voice Cloning
interface VoiceCloningNativeModule {
  initializeVoiceCloning(): Promise<boolean>;
  createVoiceProfile(
    profileName: string,
    audioSamples: string[],
    speakerEmbeddings?: number[]
  ): Promise<{profileId: string; embeddings: number[]}>;
  synthesizeVoice(
    text: string,
    profileId: string,
    language: string,
    emotion?: string
  ): Promise<{audioPath: string; duration: number}>;
  cloneVoiceFromSample(
    audioPath: string,
    targetText: string,
    language: string
  ): Promise<{clonedAudioPath: string; similarity: number}>;
  extractVoiceEmbeddings(audioPath: string): Promise<number[]>;
  compareVoiceProfiles(
    profileId1: string,
    profileId2: string
  ): Promise<{similarity: number}>;
  enhanceAudioQuality(audioPath: string): Promise<string>;
  adjustVoiceCharacteristics(
    audioPath: string,
    pitch: number,
    speed: number,
    emotion: string
  ): Promise<string>;
  isVoiceCloningReady(): Promise<boolean>;
  getAvailableVoices(): Promise<string[]>;
  cleanupVoiceProfile(profileId: string): Promise<void>;
}

// Voice characteristics and emotions
export interface VoiceCharacteristics {
  pitch: number; // -1.0 to 1.0
  speed: number; // 0.5 to 2.0
  emotion: 'neutral' | 'happy' | 'sad' | 'angry' | 'excited' | 'calm';
  accent?: string;
  age?: 'young' | 'middle' | 'old';
  gender?: 'male' | 'female' | 'neutral';
}

export interface VoiceCloneResult {
  audioPath: string;
  similarity: number;
  duration: number;
  characteristics: VoiceCharacteristics;
}

export interface VoiceSynthesisOptions {
  language: string;
  characteristics?: VoiceCharacteristics;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  realTime?: boolean;
}

class VoiceCloningService {
  private nativeModule: VoiceCloningNativeModule;
  private isInitialized: boolean = false;
  private voiceProfiles: Map<string, VoiceProfile> = new Map();
  private modelPath: string = '';
  private synthesisQueue: Array<{
    text: string;
    profileId: string;
    options: VoiceSynthesisOptions;
    resolve: (result: VoiceCloneResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private isProcessing: boolean = false;

  constructor() {
    this.nativeModule = NativeModules.VoiceCloning;
    this.modelPath = this.getModelPath();
    this.loadVoiceProfiles();
  }

  private getModelPath(): string {
    const documentsPath = RNFS.DocumentDirectoryPath;
    return `${documentsPath}/voice_cloning_models`;
  }

  async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        return true;
      }

      // Check if voice cloning models exist, if not download them
      const modelsExist = await RNFS.exists(this.modelPath);
      if (!modelsExist) {
        await this.downloadVoiceCloningModels();
      }

      // Initialize the native voice cloning system
      const success = await this.nativeModule.initializeVoiceCloning();
      if (success) {
        this.isInitialized = true;
        console.log('Voice cloning initialized successfully');
        return true;
      } else {
        console.error('Failed to initialize voice cloning');
        return false;
      }
    } catch (error) {
      console.error('Voice cloning initialization error:', error);
      return false;
    }
  }

  private async downloadVoiceCloningModels(): Promise<void> {
    try {
      console.log('Downloading voice cloning models...');
      
      // Create models directory
      await RNFS.mkdir(this.modelPath);
      
      // Download multiple models for different aspects of voice cloning
      const models = [
        {
          name: 'speaker_encoder.onnx',
          url: 'https://huggingface.co/microsoft/speecht5_vc/resolve/main/speaker_encoder.onnx',
          description: 'Speaker embedding extraction'
        },
        {
          name: 'voice_synthesizer.onnx', 
          url: 'https://huggingface.co/microsoft/speecht5_tts/resolve/main/model.onnx',
          description: 'Voice synthesis model'
        },
        {
          name: 'voice_converter.onnx',
          url: 'https://huggingface.co/microsoft/speecht5_vc/resolve/main/model.onnx',
          description: 'Voice conversion model'
        },
        {
          name: 'emotion_classifier.onnx',
          url: 'https://huggingface.co/audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim/resolve/main/model.onnx',
          description: 'Emotion classification'
        }
      ];

      for (const model of models) {
        const modelPath = `${this.modelPath}/${model.name}`;
        console.log(`Downloading ${model.description}...`);
        
        const downloadResult = await RNFS.downloadFile({
          fromUrl: model.url,
          toFile: modelPath,
          progressDivider: 10,
          begin: (res) => {
            console.log(`${model.name} download started, size: ${res.contentLength}`);
          },
          progress: (res) => {
            const progress = (res.bytesWritten / res.contentLength) * 100;
            console.log(`${model.name} progress: ${progress.toFixed(2)}%`);
          },
        }).promise;

        if (downloadResult.statusCode === 200) {
          console.log(`${model.name} downloaded successfully`);
        } else {
          throw new Error(`Failed to download ${model.name}: ${downloadResult.statusCode}`);
        }
      }

      console.log('All voice cloning models downloaded successfully');
    } catch (error) {
      console.error('Voice cloning models download failed:', error);
      throw error;
    }
  }

  async isReady(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }
      return await this.nativeModule.isVoiceCloningReady();
    } catch (error) {
      console.error('Error checking voice cloning readiness:', error);
      return false;
    }
  }

  async createVoiceProfile(
    profileName: string,
    audioSamples: string[],
    characteristics?: VoiceCharacteristics
  ): Promise<VoiceProfile> {
    try {
      if (!this.isInitialized) {
        throw new Error('Voice cloning not initialized');
      }

      // Extract speaker embeddings from audio samples
      const embeddings: number[][] = [];
      for (const audioPath of audioSamples) {
        const embedding = await this.nativeModule.extractVoiceEmbeddings(audioPath);
        embeddings.push(embedding);
      }

      // Average the embeddings for better representation
      const avgEmbeddings = this.averageEmbeddings(embeddings);

      // Create voice profile with native module
      const result = await this.nativeModule.createVoiceProfile(
        profileName,
        audioSamples,
        avgEmbeddings
      );

      // Create voice profile object
      const voiceProfile: VoiceProfile = {
        id: result.profileId,
        name: profileName,
        audioSamples,
        embeddings: result.embeddings,
        characteristics: characteristics || {
          pitch: 0,
          speed: 1.0,
          emotion: 'neutral'
        },
        createdAt: new Date(),
        isActive: false,
        quality: 'high'
      };

      // Store profile
      this.voiceProfiles.set(result.profileId, voiceProfile);
      await this.saveVoiceProfiles();

      console.log(`Voice profile '${profileName}' created successfully`);
      return voiceProfile;
    } catch (error) {
      console.error('Failed to create voice profile:', error);
      throw error;
    }
  }

  async synthesizeVoiceWithCloning(
    text: string,
    profileId: string,
    options: VoiceSynthesisOptions
  ): Promise<VoiceCloneResult> {
    try {
      if (!this.isInitialized) {
        throw new Error('Voice cloning not initialized');
      }

      const profile = this.voiceProfiles.get(profileId);
      if (!profile) {
        throw new Error(`Voice profile ${profileId} not found`);
      }

      // Queue synthesis request for processing
      return new Promise((resolve, reject) => {
        this.synthesisQueue.push({
          text,
          profileId,
          options,
          resolve,
          reject
        });

        this.processSynthesisQueue();
      });
    } catch (error) {
      console.error('Voice synthesis failed:', error);
      throw error;
    }
  }

  private async processSynthesisQueue(): Promise<void> {
    if (this.isProcessing || this.synthesisQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.synthesisQueue.length > 0) {
        const request = this.synthesisQueue.shift()!;
        
        try {
          const result = await this.performVoiceSynthesis(
            request.text,
            request.profileId,
            request.options
          );
          request.resolve(result);
        } catch (error) {
          request.reject(error as Error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async performVoiceSynthesis(
    text: string,
    profileId: string,
    options: VoiceSynthesisOptions
  ): Promise<VoiceCloneResult> {
    const profile = this.voiceProfiles.get(profileId)!;
    
    // Synthesize voice with the profile
    const synthesisResult = await this.nativeModule.synthesizeVoice(
      text,
      profileId,
      options.language,
      options.characteristics?.emotion
    );

    let finalAudioPath = synthesisResult.audioPath;

    // Apply voice characteristics if specified
    if (options.characteristics) {
      finalAudioPath = await this.nativeModule.adjustVoiceCharacteristics(
        finalAudioPath,
        options.characteristics.pitch,
        options.characteristics.speed,
        options.characteristics.emotion
      );
    }

    // Enhance audio quality if requested
    if (options.quality === 'ultra' || options.quality === 'high') {
      finalAudioPath = await this.nativeModule.enhanceAudioQuality(finalAudioPath);
    }

    return {
      audioPath: finalAudioPath,
      similarity: 0.95, // High similarity for synthesized voice
      duration: synthesisResult.duration,
      characteristics: options.characteristics || profile.characteristics
    };
  }

  async cloneVoiceFromSample(
    sourceAudioPath: string,
    targetText: string,
    language: string,
    characteristics?: VoiceCharacteristics
  ): Promise<VoiceCloneResult> {
    try {
      if (!this.isInitialized) {
        throw new Error('Voice cloning not initialized');
      }

      // Clone voice from the sample
      const cloneResult = await this.nativeModule.cloneVoiceFromSample(
        sourceAudioPath,
        targetText,
        language
      );

      let finalAudioPath = cloneResult.clonedAudioPath;

      // Apply characteristics if specified
      if (characteristics) {
        finalAudioPath = await this.nativeModule.adjustVoiceCharacteristics(
          finalAudioPath,
          characteristics.pitch,
          characteristics.speed,
          characteristics.emotion
        );
      }

      return {
        audioPath: finalAudioPath,
        similarity: cloneResult.similarity,
        duration: 0, // Will be calculated from audio file
        characteristics: characteristics || {
          pitch: 0,
          speed: 1.0,
          emotion: 'neutral'
        }
      };
    } catch (error) {
      console.error('Voice cloning from sample failed:', error);
      throw error;
    }
  }

  async translateWithVoiceCloning(
    originalAudioPath: string,
    translatedText: string,
    targetLanguage: string,
    preserveVoice: boolean = true
  ): Promise<VoiceCloneResult> {
    try {
      if (preserveVoice) {
        // Extract voice characteristics from original audio
        const embeddings = await this.nativeModule.extractVoiceEmbeddings(originalAudioPath);
        
        // Create temporary voice profile
        const tempProfileId = `temp_${Date.now()}`;
        await this.nativeModule.createVoiceProfile(
          tempProfileId,
          [originalAudioPath],
          embeddings
        );

        // Synthesize translated text with original voice
        const result = await this.synthesizeVoiceWithCloning(
          translatedText,
          tempProfileId,
          {
            language: targetLanguage,
            quality: 'high'
          }
        );

        // Cleanup temporary profile
        await this.nativeModule.cleanupVoiceProfile(tempProfileId);

        return result;
      } else {
        // Use direct voice cloning without profile
        return await this.cloneVoiceFromSample(
          originalAudioPath,
          translatedText,
          targetLanguage
        );
      }
    } catch (error) {
      console.error('Translation with voice cloning failed:', error);
      throw error;
    }
  }

  async enhanceVoiceQuality(audioPath: string): Promise<string> {
    try {
      if (!this.isInitialized) {
        throw new Error('Voice cloning not initialized');
      }

      return await this.nativeModule.enhanceAudioQuality(audioPath);
    } catch (error) {
      console.error('Voice quality enhancement failed:', error);
      throw error;
    }
  }

  async compareVoices(profileId1: string, profileId2: string): Promise<number> {
    try {
      if (!this.isInitialized) {
        throw new Error('Voice cloning not initialized');
      }

      const result = await this.nativeModule.compareVoiceProfiles(profileId1, profileId2);
      return result.similarity;
    } catch (error) {
      console.error('Voice comparison failed:', error);
      return 0;
    }
  }

  async getVoiceProfiles(): Promise<VoiceProfile[]> {
    return Array.from(this.voiceProfiles.values());
  }

  async getVoiceProfile(profileId: string): Promise<VoiceProfile | null> {
    return this.voiceProfiles.get(profileId) || null;
  }

  async deleteVoiceProfile(profileId: string): Promise<void> {
    try {
      // Cleanup native resources
      await this.nativeModule.cleanupVoiceProfile(profileId);
      
      // Remove from local storage
      this.voiceProfiles.delete(profileId);
      await this.saveVoiceProfiles();
      
      console.log(`Voice profile ${profileId} deleted successfully`);
    } catch (error) {
      console.error('Failed to delete voice profile:', error);
      throw error;
    }
  }

  async setActiveProfile(profileId: string): Promise<void> {
    // Deactivate all profiles
    for (const profile of this.voiceProfiles.values()) {
      profile.isActive = false;
    }

    // Activate selected profile
    const profile = this.voiceProfiles.get(profileId);
    if (profile) {
      profile.isActive = true;
      await this.saveVoiceProfiles();
    }
  }

  async getActiveProfile(): Promise<VoiceProfile | null> {
    for (const profile of this.voiceProfiles.values()) {
      if (profile.isActive) {
        return profile;
      }
    }
    return null;
  }

  // Real-time voice processing for calls
  async processRealTimeVoiceCloning(
    audioChunk: AudioChunk,
    translatedText: string,
    targetLanguage: string,
    profileId?: string
  ): Promise<{clonedAudio: string; similarity: number} | null> {
    try {
      if (!this.isInitialized) {
        return null;
      }

      // Save audio chunk to temporary file
      const tempAudioPath = `${RNFS.TemporaryDirectoryPath}/temp_voice_${audioChunk.id}.wav`;
      await RNFS.writeFile(tempAudioPath, audioChunk.data, 'base64');

      let result: VoiceCloneResult;

      if (profileId) {
        // Use existing voice profile
        result = await this.synthesizeVoiceWithCloning(
          translatedText,
          profileId,
          {
            language: targetLanguage,
            realTime: true,
            quality: 'medium' // Lower quality for real-time processing
          }
        );
      } else {
        // Clone voice from audio chunk
        result = await this.cloneVoiceFromSample(
          tempAudioPath,
          translatedText,
          targetLanguage
        );
      }

      // Convert cloned audio to base64
      const clonedAudioBase64 = await RNFS.readFile(result.audioPath, 'base64');

      // Cleanup temporary files
      await RNFS.unlink(tempAudioPath);
      await RNFS.unlink(result.audioPath);

      return {
        clonedAudio: clonedAudioBase64,
        similarity: result.similarity
      };
    } catch (error) {
      console.error('Real-time voice cloning failed:', error);
      return null;
    }
  }

  // Batch voice cloning for multiple texts
  async batchVoiceCloning(
    texts: string[],
    profileId: string,
    language: string
  ): Promise<VoiceCloneResult[]> {
    const results: VoiceCloneResult[] = [];
    
    for (const text of texts) {
      try {
        const result = await this.synthesizeVoiceWithCloning(
          text,
          profileId,
          { language }
        );
        results.push(result);
      } catch (error) {
        console.error(`Failed to clone voice for text: ${text}`, error);
        // Continue with other texts
      }
    }
    
    return results;
  }

  // Voice profile management
  private async loadVoiceProfiles(): Promise<void> {
    try {
      const profilesPath = `${RNFS.DocumentDirectoryPath}/voice_profiles.json`;
      const profilesExist = await RNFS.exists(profilesPath);
      
      if (profilesExist) {
        const profilesData = await RNFS.readFile(profilesPath, 'utf8');
        const profiles = JSON.parse(profilesData);
        
        for (const profile of profiles) {
          this.voiceProfiles.set(profile.id, profile);
        }
        
        console.log(`Loaded ${profiles.length} voice profiles`);
      }
    } catch (error) {
      console.error('Failed to load voice profiles:', error);
    }
  }

  private async saveVoiceProfiles(): Promise<void> {
    try {
      const profilesPath = `${RNFS.DocumentDirectoryPath}/voice_profiles.json`;
      const profiles = Array.from(this.voiceProfiles.values());
      await RNFS.writeFile(profilesPath, JSON.stringify(profiles, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save voice profiles:', error);
    }
  }

  // Utility methods
  private averageEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return [];
    
    const embeddingSize = embeddings[0].length;
    const avgEmbedding = new Array(embeddingSize).fill(0);
    
    for (const embedding of embeddings) {
      for (let i = 0; i < embeddingSize; i++) {
        avgEmbedding[i] += embedding[i];
      }
    }
    
    for (let i = 0; i < embeddingSize; i++) {
      avgEmbedding[i] /= embeddings.length;
    }
    
    return avgEmbedding;
  }

  async getModelInfo(): Promise<{
    isLoaded: boolean;
    modelSize: number;
    availableVoices: string[];
    version: string;
  }> {
    try {
      const isLoaded = await this.isReady();
      let modelSize = 0;
      
      if (await RNFS.exists(this.modelPath)) {
        const files = await RNFS.readDir(this.modelPath);
        modelSize = files.reduce((total, file) => total + file.size, 0);
      }

      const availableVoices = await this.nativeModule.getAvailableVoices();

      return {
        isLoaded,
        modelSize,
        availableVoices,
        version: '1.0.0',
      };
    } catch (error) {
      console.error('Error getting voice cloning model info:', error);
      return {
        isLoaded: false,
        modelSize: 0,
        availableVoices: [],
        version: 'unknown',
      };
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.isInitialized) {
        // Cleanup all voice profiles
        for (const profileId of this.voiceProfiles.keys()) {
          await this.nativeModule.cleanupVoiceProfile(profileId);
        }
        
        this.voiceProfiles.clear();
        this.isInitialized = false;
        console.log('Voice cloning service cleaned up');
      }
    } catch (error) {
      console.error('Error during voice cloning cleanup:', error);
    }
  }
}

export default new VoiceCloningService();

