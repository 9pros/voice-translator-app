export interface Language {
  code: string;
  name: string;
  flag: string;
}

export interface VoiceProfile {
  id: string;
  name: string;
  language: string;
  audioSamples: string[];
  createdAt: Date;
  isActive: boolean;
}

export interface TranslationConfig {
  sourceLanguage: string;
  targetLanguage: string;
  useVoiceProfile: boolean;
  voiceProfileId?: string;
  realTimeMode: boolean;
}

export interface CallSession {
  id: string;
  contactNumber: string;
  contactName?: string;
  startTime: Date;
  endTime?: Date;
  translationConfig: TranslationConfig;
  isActive: boolean;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  timestamp: Date;
}

export interface AudioChunk {
  id: string;
  data: string; // base64 encoded audio
  timestamp: Date;
  duration: number;
}

export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  preferredLanguage?: string;
}

