import RNFS from 'react-native-fs';
import {NativeModules, Platform} from 'react-native';
import {TranslationResult, Language, AudioChunk} from '../types';

// Native module interfaces for SeamlessM4T
interface SeamlessM4TNativeModule {
  initializeModel(modelPath: string): Promise<boolean>;
  translateSpeechToSpeech(
    audioPath: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<{translatedAudioPath: string; translatedText: string}>;
  translateSpeechToText(
    audioPath: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<{translatedText: string; originalText: string}>;
  translateTextToSpeech(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<{translatedAudioPath: string; translatedText: string}>;
  translateTextToText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<{translatedText: string}>;
  isModelLoaded(): Promise<boolean>;
  unloadModel(): Promise<void>;
  getSupportedLanguages(): Promise<string[]>;
  detectLanguage(audioPath: string): Promise<string>;
}

// Language mapping for SeamlessM4T
const SEAMLESS_LANGUAGE_MAP: {[key: string]: string} = {
  'en': 'eng',
  'es': 'spa',
  'fr': 'fra',
  'de': 'deu',
  'it': 'ita',
  'pt': 'por',
  'ru': 'rus',
  'zh': 'cmn',
  'ja': 'jpn',
  'ko': 'kor',
  'ar': 'arb',
  'hi': 'hin',
  'tr': 'tur',
  'pl': 'pol',
  'nl': 'nld',
  'sv': 'swe',
  'da': 'dan',
  'no': 'nor',
  'fi': 'fin',
  'cs': 'ces',
  'hu': 'hun',
  'ro': 'ron',
  'bg': 'bul',
  'hr': 'hrv',
  'sk': 'slk',
  'sl': 'slv',
  'et': 'est',
  'lv': 'lav',
  'lt': 'lit',
  'mt': 'mlt',
  'ga': 'gle',
  'cy': 'cym',
};

class SeamlessM4TService {
  private nativeModule: SeamlessM4TNativeModule;
  private isInitialized: boolean = false;
  private modelPath: string = '';
  private supportedLanguages: string[] = [];

  constructor() {
    this.nativeModule = NativeModules.SeamlessM4T;
    this.modelPath = this.getModelPath();
  }

  private getModelPath(): string {
    const documentsPath = RNFS.DocumentDirectoryPath;
    return `${documentsPath}/seamless_m4t_mini.bin`;
  }

  async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        return true;
      }

      // Check if model exists, if not download it
      const modelExists = await RNFS.exists(this.modelPath);
      if (!modelExists) {
        await this.downloadModel();
      }

      // Initialize the native model
      const success = await this.nativeModule.initializeModel(this.modelPath);
      if (success) {
        this.isInitialized = true;
        this.supportedLanguages = await this.nativeModule.getSupportedLanguages();
        console.log('SeamlessM4T initialized successfully');
        return true;
      } else {
        console.error('Failed to initialize SeamlessM4T model');
        return false;
      }
    } catch (error) {
      console.error('SeamlessM4T initialization error:', error);
      return false;
    }
  }

  private async downloadModel(): Promise<void> {
    try {
      console.log('Downloading SeamlessM4T model...');
      
      // Model download URL (this would be the actual SeamlessM4T mini model)
      const modelUrl = 'https://huggingface.co/facebook/seamless-m4t-mini/resolve/main/pytorch_model.bin';
      
      const downloadResult = await RNFS.downloadFile({
        fromUrl: modelUrl,
        toFile: this.modelPath,
        progressDivider: 10,
        begin: (res) => {
          console.log('Model download started, total size:', res.contentLength);
        },
        progress: (res) => {
          const progress = (res.bytesWritten / res.contentLength) * 100;
          console.log(`Model download progress: ${progress.toFixed(2)}%`);
        },
      }).promise;

      if (downloadResult.statusCode === 200) {
        console.log('SeamlessM4T model downloaded successfully');
      } else {
        throw new Error(`Failed to download model: ${downloadResult.statusCode}`);
      }
    } catch (error) {
      console.error('Model download failed:', error);
      throw error;
    }
  }

  async isReady(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }
      return await this.nativeModule.isModelLoaded();
    } catch (error) {
      console.error('Error checking model readiness:', error);
      return false;
    }
  }

  private mapLanguageCode(languageCode: string): string {
    return SEAMLESS_LANGUAGE_MAP[languageCode] || languageCode;
  }

  async translateSpeechToSpeech(
    audioPath: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<{translatedAudioPath: string; translationResult: TranslationResult}> {
    try {
      if (!this.isInitialized) {
        throw new Error('SeamlessM4T not initialized');
      }

      const sourceLang = this.mapLanguageCode(sourceLanguage);
      const targetLang = this.mapLanguageCode(targetLanguage);

      const result = await this.nativeModule.translateSpeechToSpeech(
        audioPath,
        sourceLang,
        targetLang,
      );

      const translationResult: TranslationResult = {
        originalText: '', // Will be extracted from speech
        translatedText: result.translatedText,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
        confidence: 0.95, // SeamlessM4T typically has high confidence
        timestamp: new Date(),
      };

      return {
        translatedAudioPath: result.translatedAudioPath,
        translationResult,
      };
    } catch (error) {
      console.error('Speech-to-speech translation failed:', error);
      throw error;
    }
  }

  async translateSpeechToText(
    audioPath: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<TranslationResult> {
    try {
      if (!this.isInitialized) {
        throw new Error('SeamlessM4T not initialized');
      }

      const sourceLang = this.mapLanguageCode(sourceLanguage);
      const targetLang = this.mapLanguageCode(targetLanguage);

      const result = await this.nativeModule.translateSpeechToText(
        audioPath,
        sourceLang,
        targetLang,
      );

      return {
        originalText: result.originalText,
        translatedText: result.translatedText,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
        confidence: 0.95,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Speech-to-text translation failed:', error);
      throw error;
    }
  }

  async translateTextToSpeech(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<{translatedAudioPath: string; translationResult: TranslationResult}> {
    try {
      if (!this.isInitialized) {
        throw new Error('SeamlessM4T not initialized');
      }

      const sourceLang = this.mapLanguageCode(sourceLanguage);
      const targetLang = this.mapLanguageCode(targetLanguage);

      const result = await this.nativeModule.translateTextToSpeech(
        text,
        sourceLang,
        targetLang,
      );

      const translationResult: TranslationResult = {
        originalText: text,
        translatedText: result.translatedText,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
        confidence: 0.95,
        timestamp: new Date(),
      };

      return {
        translatedAudioPath: result.translatedAudioPath,
        translationResult,
      };
    } catch (error) {
      console.error('Text-to-speech translation failed:', error);
      throw error;
    }
  }

  async translateTextToText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<TranslationResult> {
    try {
      if (!this.isInitialized) {
        throw new Error('SeamlessM4T not initialized');
      }

      const sourceLang = this.mapLanguageCode(sourceLanguage);
      const targetLang = this.mapLanguageCode(targetLanguage);

      const result = await this.nativeModule.translateTextToText(
        text,
        sourceLang,
        targetLang,
      );

      return {
        originalText: text,
        translatedText: result.translatedText,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
        confidence: 0.95,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Text-to-text translation failed:', error);
      throw error;
    }
  }

  async detectLanguage(audioPath: string): Promise<string> {
    try {
      if (!this.isInitialized) {
        throw new Error('SeamlessM4T not initialized');
      }

      const detectedLang = await this.nativeModule.detectLanguage(audioPath);
      
      // Map back from SeamlessM4T language code to our standard codes
      for (const [standardCode, seamlessCode] of Object.entries(SEAMLESS_LANGUAGE_MAP)) {
        if (seamlessCode === detectedLang) {
          return standardCode;
        }
      }
      
      return detectedLang;
    } catch (error) {
      console.error('Language detection failed:', error);
      return 'en'; // Default to English
    }
  }

  async processRealTimeAudio(
    audioChunk: AudioChunk,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<{translatedAudio: string; translationResult: TranslationResult} | null> {
    try {
      // Save audio chunk to temporary file
      const tempAudioPath = `${RNFS.TemporaryDirectoryPath}/temp_audio_${audioChunk.id}.wav`;
      await RNFS.writeFile(tempAudioPath, audioChunk.data, 'base64');

      // Perform speech-to-speech translation
      const result = await this.translateSpeechToSpeech(
        tempAudioPath,
        sourceLanguage,
        targetLanguage,
      );

      // Clean up temporary file
      await RNFS.unlink(tempAudioPath);

      // Convert translated audio to base64
      const translatedAudioBase64 = await RNFS.readFile(
        result.translatedAudioPath,
        'base64',
      );

      return {
        translatedAudio: translatedAudioBase64,
        translationResult: result.translationResult,
      };
    } catch (error) {
      console.error('Real-time audio processing failed:', error);
      return null;
    }
  }

  getSupportedLanguages(): string[] {
    return Object.keys(SEAMLESS_LANGUAGE_MAP);
  }

  async getModelInfo(): Promise<{
    isLoaded: boolean;
    modelSize: number;
    supportedLanguages: number;
    version: string;
  }> {
    try {
      const isLoaded = await this.isReady();
      let modelSize = 0;
      
      if (await RNFS.exists(this.modelPath)) {
        const stat = await RNFS.stat(this.modelPath);
        modelSize = stat.size;
      }

      return {
        isLoaded,
        modelSize,
        supportedLanguages: this.supportedLanguages.length,
        version: '1.0.0',
      };
    } catch (error) {
      console.error('Error getting model info:', error);
      return {
        isLoaded: false,
        modelSize: 0,
        supportedLanguages: 0,
        version: 'unknown',
      };
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.isInitialized) {
        await this.nativeModule.unloadModel();
        this.isInitialized = false;
        console.log('SeamlessM4T model unloaded');
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  // Batch processing for multiple audio files
  async batchTranslate(
    audioPaths: string[],
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<TranslationResult[]> {
    const results: TranslationResult[] = [];
    
    for (const audioPath of audioPaths) {
      try {
        const result = await this.translateSpeechToText(
          audioPath,
          sourceLanguage,
          targetLanguage,
        );
        results.push(result);
      } catch (error) {
        console.error(`Failed to translate ${audioPath}:`, error);
        // Continue with other files
      }
    }
    
    return results;
  }

  // Performance monitoring
  async benchmarkTranslation(
    audioPath: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<{
    translationResult: TranslationResult;
    processingTime: number;
    audioLength: number;
  }> {
    const startTime = Date.now();
    
    try {
      const translationResult = await this.translateSpeechToText(
        audioPath,
        sourceLanguage,
        targetLanguage,
      );
      
      const processingTime = Date.now() - startTime;
      
      // Get audio length (mock implementation)
      const audioLength = 5000; // Would be calculated from actual audio file
      
      return {
        translationResult,
        processingTime,
        audioLength,
      };
    } catch (error) {
      console.error('Benchmark failed:', error);
      throw error;
    }
  }
}

export default new SeamlessM4TService();

