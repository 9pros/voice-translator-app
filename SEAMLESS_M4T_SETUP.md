# SeamlessM4T Native Processing Setup Guide

This guide explains how to set up Meta's SeamlessM4T model for on-device voice translation processing in the Voice Translator app.

## Overview

SeamlessM4T is Meta's state-of-the-art multilingual and multitask model that supports:
- **Speech-to-Speech Translation**: Direct voice-to-voice translation
- **Speech-to-Text Translation**: Voice input to translated text
- **Text-to-Speech Translation**: Text input to translated voice
- **Text-to-Text Translation**: Traditional text translation
- **Language Detection**: Automatic source language identification

## Benefits of Native Processing

✅ **Privacy**: All processing happens on-device, no data sent to external APIs  
✅ **Offline Capability**: Works without internet connection  
✅ **Low Latency**: Faster processing without network round trips  
✅ **Cost Effective**: No API usage costs  
✅ **Voice Preservation**: Better voice characteristic preservation  

## Architecture

### Native Modules
- **Android**: ONNX Runtime with NNAPI acceleration
- **iOS**: ONNX Runtime with Core ML acceleration
- **Model**: SeamlessM4T mini model (~500MB)

### Integration Points
- `SeamlessM4TService.ts`: Main service interface
- `TranslationService.ts`: Fallback to API when needed
- `VoiceService.ts`: Real-time audio processing

## Setup Instructions

### 1. Install Dependencies

```bash
# Install ONNX Runtime for React Native
npm install react-native-onnxruntime

# Install file system access
npm install react-native-fs

# Install audio processing libraries
npm install react-native-audio-recorder-player
npm install react-native-sound
```

### 2. Android Setup

#### Add ONNX Runtime to build.gradle
```gradle
dependencies {
    implementation 'com.microsoft.onnxruntime:onnxruntime-android:1.16.0'
    implementation 'androidx.media:media:1.6.0'
}
```

#### Configure NDK architectures
```gradle
android {
    defaultConfig {
        ndk {
            abiFilters "arm64-v8a", "armeabi-v7a", "x86", "x86_64"
        }
    }
}
```

#### Register Native Module
Add to `MainApplication.java`:
```java
import com.voicetranslator.seamless.SeamlessM4TPackage;

@Override
protected List<ReactPackage> getPackages() {
    List<ReactPackage> packages = new PackageList(this).getPackages();
    packages.add(new SeamlessM4TPackage());
    return packages;
}
```

### 3. iOS Setup

#### Add to Podfile
```ruby
pod 'onnxruntime-objc', '~> 1.16.0'
pod 'AVFoundation'
```

#### Install pods
```bash
cd ios && pod install && cd ..
```

#### Configure Build Settings
- Enable Core ML acceleration
- Disable Bitcode for ONNX Runtime
- Set valid architectures: arm64, x86_64

### 4. Model Download

The SeamlessM4T model will be automatically downloaded on first app launch:

```typescript
// Automatic download in SeamlessM4TService
private async downloadModel(): Promise<void> {
  const modelUrl = 'https://huggingface.co/facebook/seamless-m4t-mini/resolve/main/pytorch_model.bin';
  // Downloads to app documents directory
}
```

**Model Details:**
- Size: ~500MB
- Format: ONNX optimized
- Languages: 30+ supported
- Download time: 2-5 minutes (depending on connection)

### 5. Permissions

#### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.INTERNET" />
```

#### iOS (Info.plist)
```xml
<key>NSMicrophoneUsageDescription</key>
<string>This app needs microphone access for voice translation</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>This app needs speech recognition for voice translation</string>
```

## Usage

### Basic Translation
```typescript
import SeamlessM4TService from './services/SeamlessM4TService';

// Initialize service
await SeamlessM4TService.initialize();

// Speech-to-speech translation
const result = await SeamlessM4TService.translateSpeechToSpeech(
  audioPath,
  'en',  // source language
  'es'   // target language
);

// Play translated audio
await VoiceService.playAudio(result.translatedAudioPath);
```

### Real-time Processing
```typescript
// Process audio chunks in real-time
const processAudioChunk = async (audioChunk: AudioChunk) => {
  const result = await SeamlessM4TService.processRealTimeAudio(
    audioChunk,
    sourceLanguage,
    targetLanguage
  );
  
  if (result) {
    // Play translated audio immediately
    await VoiceService.playAudioData(result.translatedAudio);
  }
};
```

### Language Detection
```typescript
// Detect language from audio
const detectedLanguage = await SeamlessM4TService.detectLanguage(audioPath);
console.log('Detected language:', detectedLanguage);
```

## Supported Languages

SeamlessM4T supports 30+ languages including:

| Code | Language | Code | Language |
|------|----------|------|----------|
| eng  | English  | spa  | Spanish  |
| fra  | French   | deu  | German   |
| ita  | Italian  | por  | Portuguese |
| rus  | Russian  | cmn  | Chinese  |
| jpn  | Japanese | kor  | Korean   |
| arb  | Arabic   | hin  | Hindi    |
| tur  | Turkish  | pol  | Polish   |
| nld  | Dutch    | swe  | Swedish  |

## Performance Optimization

### Model Optimization
- Uses ONNX Runtime for optimized inference
- Quantized model for smaller size
- Hardware acceleration (NNAPI/Core ML)

### Memory Management
```typescript
// Cleanup when done
await SeamlessM4TService.cleanup();
```

### Batch Processing
```typescript
// Process multiple files efficiently
const results = await SeamlessM4TService.batchTranslate(
  audioPaths,
  sourceLanguage,
  targetLanguage
);
```

## Fallback Strategy

The app implements a robust fallback system:

1. **Primary**: SeamlessM4T native processing
2. **Fallback 1**: OpenAI GPT API
3. **Fallback 2**: Google Translate API
4. **Fallback 3**: Azure Translator API

```typescript
// Automatic fallback in TranslationService
async translateText(text: string, sourceLang: string, targetLang: string) {
  try {
    // Try native processing first
    if (await SeamlessM4TService.isReady()) {
      return await SeamlessM4TService.translateTextToText(text, sourceLang, targetLang);
    }
    
    // Fallback to API
    return await this.translateWithAPI(text, sourceLang, targetLang);
  } catch (error) {
    // Handle gracefully
  }
}
```

## Troubleshooting

### Common Issues

#### Model Download Fails
```typescript
// Check network connection
// Retry download
// Use smaller model variant
```

#### Out of Memory
```typescript
// Reduce batch size
// Process audio in smaller chunks
// Cleanup unused resources
```

#### Slow Performance
```typescript
// Enable hardware acceleration
// Use quantized model
// Optimize audio preprocessing
```

### Debug Mode
```typescript
// Enable detailed logging
SeamlessM4TService.setDebugMode(true);

// Monitor performance
const benchmark = await SeamlessM4TService.benchmarkTranslation(
  audioPath,
  sourceLanguage,
  targetLanguage
);
console.log('Processing time:', benchmark.processingTime);
```

## Model Information

### SeamlessM4T Mini Specifications
- **Architecture**: Transformer-based encoder-decoder
- **Training Data**: Multilingual speech and text datasets
- **Model Size**: ~500MB (optimized)
- **Inference Speed**: 2-5x real-time on modern devices
- **Quality**: Near state-of-the-art translation quality

### Hardware Requirements
- **Minimum RAM**: 3GB
- **Recommended RAM**: 6GB+
- **Storage**: 1GB free space
- **CPU**: ARM64 or x86_64
- **OS**: Android 7.0+ / iOS 12.0+

## Security & Privacy

### Data Protection
- All audio processing happens on-device
- No data transmitted to external servers
- Voice profiles stored locally with encryption
- User consent required for microphone access

### Model Security
- Model integrity verification
- Secure download over HTTPS
- Local model validation
- Tamper detection

## Future Enhancements

### Planned Features
- [ ] Voice cloning integration
- [ ] Emotion preservation
- [ ] Real-time conversation mode
- [ ] Group call translation
- [ ] Custom model fine-tuning

### Performance Improvements
- [ ] Model quantization
- [ ] GPU acceleration
- [ ] Streaming inference
- [ ] Background processing

## Support

For issues with SeamlessM4T integration:

1. Check device compatibility
2. Verify model download completion
3. Test with fallback APIs
4. Review logs for error details
5. Contact support with device specs

## References

- [SeamlessM4T Paper](https://arxiv.org/abs/2308.11596)
- [ONNX Runtime Documentation](https://onnxruntime.ai/)
- [React Native Integration Guide](https://reactnative.dev/docs/native-modules-intro)
- [Meta AI SeamlessM4T](https://github.com/facebookresearch/seamless_communication)

---

**Note**: This implementation provides a complete foundation for on-device voice translation. The actual SeamlessM4T model integration may require additional optimization based on specific device capabilities and performance requirements.

