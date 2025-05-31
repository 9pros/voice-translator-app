# Voice Translator App

Real-time voice translation mobile application with advanced voice cloning and synthesis capabilities.

## 🎤 Features

- **Real-time Voice Translation**: Translate speech in real-time during calls
- **Voice Cloning**: Preserve original speaker's voice characteristics
- **On-device Processing**: Privacy-first with local AI models
- **Multi-language Support**: 30+ languages supported
- **Native Performance**: Hardware-accelerated processing

## 🚀 Quick Start

### One-Command Setup (MacBook)
```bash
git clone https://github.com/9pros/voice-translator-app.git
cd voice-translator-app
./install-and-test.sh
```

The installation script automatically:
- ✅ Installs all dependencies (Homebrew, Node.js, React Native CLI)
- ✅ Sets up iOS/Android development environment
- ✅ Downloads AI models (~930MB)
- ✅ Builds and launches the app
- ✅ Provides testing instructions

### Manual Setup
```bash
# Install dependencies
npm install

# Setup AI models
npm run setup-models

# iOS
cd ios && pod install && cd ..
npx react-native run-ios

# Android
npx react-native run-android
```

## 🎯 Core Capabilities

### Voice Translation
- Speech-to-speech translation with voice preservation
- Real-time audio processing during calls
- Automatic language detection
- High-quality voice synthesis

### Voice Cloning
- Create custom voice profiles from samples
- Real-time voice characteristic preservation
- Emotion and accent preservation
- Voice quality enhancement

### Privacy & Performance
- 100% on-device processing
- No cloud dependencies
- Hardware acceleration (NNAPI/Core ML)
- Offline capability

## 🛠️ Development

### Scripts
```bash
npm run setup-models    # Download AI models
npm run test-voice      # Test voice features
npm run clean          # Clean build artifacts
npm run clean-install  # Fresh installation
```

### Testing
```bash
# Run comprehensive voice feature tests
./test-voice-features.sh
```

## 📱 System Requirements

- **iOS**: 12.0+ with 3GB+ RAM
- **Android**: 7.0+ with 3GB+ RAM
- **Storage**: 1GB for models and cache
- **Network**: Required only for initial model download

## 🤖 AI Models

The app uses multiple AI models for voice processing:
- **SeamlessM4T**: Main translation model (~500MB)
- **Speaker Encoder**: Voice embeddings (~50MB)
- **Voice Synthesizer**: Speech generation (~200MB)
- **Voice Converter**: Voice cloning (~150MB)
- **Emotion Classifier**: Emotion analysis (~30MB)

## 🔒 Privacy

- All voice processing happens on-device
- No data transmitted to external servers
- Voice profiles stored locally with encryption
- User consent required for microphone access

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues or questions:
- Create an issue on GitHub
- Check the troubleshooting guide
- Review the setup documentation

---

**Ready for immediate testing and deployment!** 🎤🌍

