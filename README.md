# Voice Translator App

A powerful mobile application that provides real-time voice translation with dialer filtering capabilities. The app translates your voice in real-time during phone calls, allowing seamless communication across language barriers while preserving your natural voice characteristics.

## Features

### 🎯 Core Features
- **Real-time Voice Translation**: Translate speech instantly during phone calls
- **Dialer Integration**: Built-in dialer with translation capabilities
- **Voice Profile Management**: Create custom voice profiles for improved translation accuracy
- **Multi-language Support**: Support for 10+ languages including English, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, and Korean
- **Offline Mode**: Basic translation capabilities without internet connection (coming soon)

### 🔧 Technical Features
- **Voice Recognition**: Advanced speech-to-text processing
- **Text-to-Speech**: Natural voice synthesis with custom voice profiles
- **Audio Processing**: Real-time audio streaming and processing
- **Contact Integration**: Access and call contacts with translation enabled
- **Translation History**: Keep track of all translations with confidence scores

### 🎨 User Experience
- **Intuitive Interface**: Clean, modern design with easy navigation
- **Real-time Feedback**: Visual indicators for recording, translating, and speaking
- **Customizable Settings**: Adjust translation speed, voice profiles, and preferences
- **Accessibility**: Support for various accessibility features

## Screenshots

*Screenshots will be added once the app is built and tested*

## Installation

### Prerequisites
- Node.js (v16 or higher)
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/9pros/voice-translator-app.git
   cd voice-translator-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **iOS Setup**
   ```bash
   cd ios && pod install && cd ..
   ```

4. **Android Setup**
   - Ensure Android SDK is installed
   - Create a virtual device or connect a physical device

### Running the App

**For Android:**
```bash
npm run android
```

**For iOS:**
```bash
npm run ios
```

**Start Metro bundler:**
```bash
npm start
```

## Architecture

### Project Structure
```
src/
├── components/          # Reusable UI components
├── context/            # React Context providers
├── screens/            # Main app screens
├── services/           # Business logic and API services
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

### Key Components

#### Translation Engine
- **TranslationService**: Handles text translation using multiple APIs (OpenAI, Google Translate, Azure)
- **VoiceService**: Manages voice recognition, recording, and text-to-speech
- **Real-time Processing**: Streams audio chunks for continuous translation

#### Voice Profiles
- **Profile Creation**: Record voice samples to create personalized profiles
- **Voice Training**: Process audio samples to extract voice characteristics
- **Profile Management**: Store, activate, and manage multiple voice profiles

#### Call Integration
- **Dialer Interface**: Custom dialer with contact integration
- **Call Management**: Handle call states and audio routing
- **Translation Overlay**: Real-time translation display during calls

## API Integration

### Translation APIs
- **OpenAI GPT**: Primary translation service with context awareness
- **Google Translate**: Fallback translation service
- **Azure Translator**: Alternative translation provider

### Voice Processing
- **Speech-to-Text**: Convert audio to text for translation
- **Text-to-Speech**: Generate natural speech from translated text
- **Voice Cloning**: Preserve user's voice characteristics in translations

## Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
OPENAI_API_KEY=your_openai_api_key
GOOGLE_TRANSLATE_API_KEY=your_google_api_key
AZURE_TRANSLATOR_KEY=your_azure_key
```

### Permissions

#### Android (android/app/src/main/AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.READ_CONTACTS" />
<uses-permission android:name="android.permission.CALL_PHONE" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

#### iOS (ios/VoiceTranslator/Info.plist)
```xml
<key>NSMicrophoneUsageDescription</key>
<string>This app needs microphone access for voice translation</string>
<key>NSContactsUsageDescription</key>
<string>This app needs contacts access to show them in the dialer</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>This app needs speech recognition for voice translation</string>
```

## Usage

### Basic Translation
1. Open the Translation tab
2. Select source and target languages
3. Tap the microphone button and speak
4. View the real-time translation
5. Tap the speaker button to hear the translation

### Voice Profile Setup
1. Go to Settings → Voice Profiles
2. Tap "Create New Profile"
3. Enter a profile name
4. Record 5 sample phrases as prompted
5. Wait for the profile to be trained
6. Set as active profile for improved translations

### Making Translation Calls
1. Open the Dialer tab
2. Enter a phone number or select a contact
3. Tap "Translation Call" instead of regular call
4. Speak normally - your voice will be translated in real-time
5. The other party hears the translation in their language

## Development

### Adding New Languages
1. Update the `SUPPORTED_LANGUAGES` array in `src/screens/TranslationScreen.tsx`
2. Add language support in translation services
3. Test voice recognition and synthesis for the new language

### Customizing Translation Providers
1. Modify `src/services/TranslationService.ts`
2. Add new provider methods
3. Update fallback logic
4. Test with various text inputs

### Extending Voice Features
1. Update `src/services/VoiceService.ts`
2. Add new voice processing capabilities
3. Integrate with voice profile system
4. Test across different devices and languages

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## Deployment

### Android
```bash
npm run build:android
```

### iOS
```bash
npm run build:ios
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@voicetranslator.com or create an issue in this repository.

## Roadmap

### Version 1.1
- [ ] Offline translation support
- [ ] Group call translation
- [ ] Real-time conversation mode
- [ ] Advanced voice customization

### Version 1.2
- [ ] Video call translation
- [ ] Text message translation
- [ ] Cloud sync for voice profiles
- [ ] Multi-device support

### Version 2.0
- [ ] AI-powered conversation context
- [ ] Emotion preservation in translation
- [ ] Professional translation modes
- [ ] Enterprise features

## Acknowledgments

- OpenAI for GPT-based translation
- Google for translation services
- React Native community for excellent libraries
- Voice processing libraries and contributors

---

**Made with ❤️ for seamless global communication**

