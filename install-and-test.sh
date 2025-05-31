#!/bin/bash

# Voice Translator App - Complete Installation and Testing Script for MacBook
# This script sets up the entire development environment and runs the app

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    log_error "This script is designed for macOS only"
    exit 1
fi

log_info "🚀 Starting Voice Translator App Installation and Setup"
log_info "This will install all dependencies and set up the development environment"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Homebrew
install_homebrew() {
    if ! command_exists brew; then
        log_info "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Add Homebrew to PATH for Apple Silicon Macs
        if [[ $(uname -m) == "arm64" ]]; then
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
        
        log_success "Homebrew installed successfully"
    else
        log_info "Homebrew already installed"
        brew update
    fi
}

# Function to install Node.js and npm
install_node() {
    if ! command_exists node; then
        log_info "Installing Node.js..."
        brew install node
        log_success "Node.js installed successfully"
    else
        log_info "Node.js already installed ($(node --version))"
    fi
    
    # Install yarn if not present
    if ! command_exists yarn; then
        log_info "Installing Yarn..."
        npm install -g yarn
        log_success "Yarn installed successfully"
    else
        log_info "Yarn already installed ($(yarn --version))"
    fi
}

# Function to install React Native CLI
install_react_native_cli() {
    if ! command_exists react-native; then
        log_info "Installing React Native CLI..."
        npm install -g @react-native-community/cli
        log_success "React Native CLI installed successfully"
    else
        log_info "React Native CLI already installed"
    fi
}

# Function to install Xcode Command Line Tools
install_xcode_tools() {
    if ! xcode-select -p &> /dev/null; then
        log_info "Installing Xcode Command Line Tools..."
        xcode-select --install
        log_warning "Please complete the Xcode Command Line Tools installation and run this script again"
        exit 1
    else
        log_info "Xcode Command Line Tools already installed"
    fi
}

# Function to install CocoaPods
install_cocoapods() {
    if ! command_exists pod; then
        log_info "Installing CocoaPods..."
        sudo gem install cocoapods
        log_success "CocoaPods installed successfully"
    else
        log_info "CocoaPods already installed ($(pod --version))"
    fi
}

# Function to install Watchman
install_watchman() {
    if ! command_exists watchman; then
        log_info "Installing Watchman..."
        brew install watchman
        log_success "Watchman installed successfully"
    else
        log_info "Watchman already installed ($(watchman --version))"
    fi
}

# Function to install Android Studio and SDK
install_android_studio() {
    if ! command_exists adb; then
        log_warning "Android Studio not detected"
        log_info "Please install Android Studio manually from: https://developer.android.com/studio"
        log_info "After installation, set up Android SDK and add platform-tools to PATH"
        log_info "You can continue with iOS development for now"
        
        read -p "Do you want to continue without Android setup? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        log_info "Android SDK already installed"
    fi
}

# Function to install iOS Simulator
setup_ios_simulator() {
    if command_exists xcrun; then
        log_info "Setting up iOS Simulator..."
        xcrun simctl list devices | grep -q "iPhone" && log_success "iOS Simulators available" || log_warning "No iOS Simulators found"
    else
        log_warning "Xcode not installed. Please install Xcode from the App Store"
    fi
}

# Function to create environment file
create_env_file() {
    log_info "Creating environment configuration..."
    
    cat > .env << EOF
# Voice Translator App Environment Configuration

# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Google Translate API Configuration  
GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key_here

# Azure Translator Configuration
AZURE_TRANSLATOR_KEY=your_azure_translator_key_here
AZURE_TRANSLATOR_REGION=your_azure_region_here

# App Configuration
APP_ENV=development
DEBUG_MODE=true

# Voice Cloning Configuration
VOICE_CLONING_ENABLED=true
SEAMLESS_M4T_ENABLED=true

# Audio Configuration
AUDIO_SAMPLE_RATE=16000
AUDIO_CHANNELS=1
AUDIO_FORMAT=wav

# Performance Configuration
MAX_AUDIO_DURATION=30
BATCH_SIZE=5
PROCESSING_TIMEOUT=30000

EOF

    log_success "Environment file created (.env)"
    log_warning "Please update .env with your actual API keys before running the app"
}

# Function to install project dependencies
install_dependencies() {
    log_info "Installing project dependencies..."
    
    # Install npm dependencies
    if [ -f "package.json" ]; then
        log_info "Installing npm packages..."
        npm install
        log_success "npm packages installed"
    else
        log_error "package.json not found. Make sure you're in the project directory"
        exit 1
    fi
    
    # Install iOS dependencies
    if [ -d "ios" ]; then
        log_info "Installing iOS dependencies..."
        cd ios
        pod install --repo-update
        cd ..
        log_success "iOS dependencies installed"
    else
        log_warning "iOS directory not found"
    fi
}

# Function to setup native modules
setup_native_modules() {
    log_info "Setting up native modules..."
    
    # Update MainApplication.java to include voice cloning package
    if [ -f "android/app/src/main/java/com/voicetranslator/MainApplication.java" ]; then
        log_info "Updating Android MainApplication..."
        
        # Add voice cloning package import if not already present
        if ! grep -q "VoiceCloningPackage" "android/app/src/main/java/com/voicetranslator/MainApplication.java"; then
            sed -i '' '/import com.voicetranslator.seamless.SeamlessM4TPackage;/a\
import com.voicetranslator.voicecloning.VoiceCloningPackage;
' "android/app/src/main/java/com/voicetranslator/MainApplication.java"
            
            sed -i '' '/packages.add(new SeamlessM4TPackage());/a\
          packages.add(new VoiceCloningPackage());
' "android/app/src/main/java/com/voicetranslator/MainApplication.java"
            
            log_success "Android MainApplication updated"
        else
            log_info "Android MainApplication already configured"
        fi
    fi
}

# Function to download AI models
download_models() {
    log_info "Setting up AI models directory..."
    
    # Create models directory
    mkdir -p models
    
    log_info "AI models will be downloaded automatically when the app starts"
    log_info "Models to be downloaded:"
    log_info "  - SeamlessM4T Mini (~500MB)"
    log_info "  - Speaker Encoder (~50MB)"
    log_info "  - Voice Synthesizer (~200MB)"
    log_info "  - Voice Converter (~150MB)"
    log_info "  - Emotion Classifier (~30MB)"
    log_warning "Total download size: ~930MB"
    log_warning "Ensure you have a stable internet connection for first run"
}

# Function to setup development certificates (iOS)
setup_ios_certificates() {
    log_info "Setting up iOS development certificates..."
    
    if [ -d "ios" ]; then
        cd ios
        
        # Check if development team is set
        if grep -q "DEVELOPMENT_TEAM" "VoiceTranslator.xcodeproj/project.pbxproj"; then
            log_info "Development team already configured"
        else
            log_warning "iOS development team not configured"
            log_info "Please open ios/VoiceTranslator.xcworkspace in Xcode and:"
            log_info "1. Select your development team"
            log_info "2. Configure signing certificates"
            log_info "3. Set bundle identifier"
        fi
        
        cd ..
    fi
}

# Function to run pre-flight checks
run_preflight_checks() {
    log_info "Running pre-flight checks..."
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_NODE_VERSION="16.0.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_NODE_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_NODE_VERSION" ]; then
        log_success "Node.js version check passed ($NODE_VERSION)"
    else
        log_error "Node.js version $NODE_VERSION is too old. Required: $REQUIRED_NODE_VERSION+"
        exit 1
    fi
    
    # Check available disk space
    AVAILABLE_SPACE=$(df -h . | awk 'NR==2 {print $4}' | sed 's/[^0-9.]//g')
    if [ -n "$AVAILABLE_SPACE" ] && [ "${AVAILABLE_SPACE%.*}" -lt 5 ] 2>/dev/null; then
        log_warning "Low disk space detected. At least 5GB recommended for models and dependencies"
    else
        log_success "Disk space check passed"
    fi
    
    # Check internet connectivity
    if ping -c 1 google.com &> /dev/null; then
        log_success "Internet connectivity check passed"
    else
        log_error "No internet connection. Required for downloading dependencies and models"
        exit 1
    fi
}

# Function to start Metro bundler
start_metro() {
    log_info "Starting Metro bundler..."
    
    # Kill any existing Metro processes
    pkill -f "react-native start" || true
    pkill -f "metro" || true
    
    # Start Metro in background
    npx react-native start --reset-cache &
    METRO_PID=$!
    
    log_success "Metro bundler started (PID: $METRO_PID)"
    
    # Wait for Metro to start
    log_info "Waiting for Metro to initialize..."
    sleep 10
}

# Function to run iOS app
run_ios_app() {
    log_info "Building and running iOS app..."
    
    # Check if iOS simulator is available
    if xcrun simctl list devices | grep -q "Booted"; then
        log_info "iOS Simulator already running"
    else
        log_info "Starting iOS Simulator..."
        xcrun simctl boot "iPhone 14" 2>/dev/null || xcrun simctl boot "$(xcrun simctl list devices | grep iPhone | head -1 | sed 's/.*(\([^)]*\)).*/\1/')"
        sleep 5
    fi
    
    # Build and run the app
    npx react-native run-ios --simulator="iPhone 14" || npx react-native run-ios
    
    log_success "iOS app launched successfully"
}

# Function to run Android app
run_android_app() {
    if command_exists adb; then
        log_info "Building and running Android app..."
        
        # Check if Android emulator or device is connected
        if adb devices | grep -q "device"; then
            npx react-native run-android
            log_success "Android app launched successfully"
        else
            log_warning "No Android device or emulator detected"
            log_info "Please start an Android emulator or connect a device"
        fi
    else
        log_warning "Android SDK not installed, skipping Android build"
    fi
}

# Function to show usage instructions
show_usage_instructions() {
    log_success "🎉 Installation completed successfully!"
    echo
    log_info "📱 Voice Translator App is now ready for testing"
    echo
    log_info "🔧 Next steps:"
    echo "1. Update .env file with your API keys"
    echo "2. The app will download AI models on first run (~930MB)"
    echo "3. Grant microphone permissions when prompted"
    echo "4. Test voice translation features"
    echo
    log_info "🎯 Key features to test:"
    echo "• Real-time voice translation during calls"
    echo "• Voice profile creation and management"
    echo "• Native on-device processing with SeamlessM4T"
    echo "• Voice cloning and synthesis"
    echo "• Multi-language support (30+ languages)"
    echo
    log_info "🛠 Development commands:"
    echo "• Start Metro: npm start"
    echo "• Run iOS: npm run ios"
    echo "• Run Android: npm run android"
    echo "• Clean build: npm run clean"
    echo
    log_info "📚 Documentation:"
    echo "• Setup guide: SEAMLESS_M4T_SETUP.md"
    echo "• Voice cloning: Check VoiceCloningService.ts"
    echo "• API reference: src/services/"
    echo
    log_warning "⚠️  Important notes:"
    echo "• First run will download large AI models"
    echo "• Microphone permission required for voice features"
    echo "• iOS requires development team setup in Xcode"
    echo "• Android requires Android Studio and SDK setup"
}

# Function to create test script
create_test_script() {
    log_info "Creating test script..."
    
    cat > test-voice-features.sh << 'EOF'
#!/bin/bash

# Voice Translator App - Feature Testing Script

echo "🧪 Voice Translator App - Feature Testing"
echo "========================================"

echo
echo "📱 Testing Voice Translation Features:"
echo "1. Open the app on your device/simulator"
echo "2. Grant microphone permissions when prompted"
echo "3. Wait for AI models to download (first run only)"
echo "4. Test the following features:"
echo

echo "🎤 Voice Profile Creation:"
echo "• Go to Settings → Voice Profiles"
echo "• Tap 'Create New Profile'"
echo "• Record 5 sample phrases as prompted"
echo "• Wait for profile training to complete"

echo
echo "🗣️ Real-time Translation:"
echo "• Go to Translation tab"
echo "• Select source and target languages"
echo "• Tap microphone and speak"
echo "• Listen to translated audio output"

echo
echo "📞 Translation Calls:"
echo "• Go to Dialer tab"
echo "• Enter a test number or select contact"
echo "• Tap 'Translation Call'"
echo "• Speak normally during call"

echo
echo "🔄 Voice Cloning Test:"
echo "• Record a voice sample"
echo "• Type text to be spoken in your voice"
echo "• Listen to cloned voice output"

echo
echo "🌍 Language Detection:"
echo "• Speak in different languages"
echo "• Verify automatic language detection"
echo "• Test translation accuracy"

echo
echo "⚡ Performance Testing:"
echo "• Test offline mode (disable internet)"
echo "• Measure translation speed"
echo "• Check voice quality preservation"

echo
echo "🔧 Troubleshooting:"
echo "• Check logs in Metro bundler"
echo "• Verify API keys in .env file"
echo "• Ensure models downloaded successfully"
echo "• Test with different devices/simulators"

EOF

    chmod +x test-voice-features.sh
    log_success "Test script created (test-voice-features.sh)"
}

# Main installation flow
main() {
    echo "🎯 Voice Translator App - Complete Setup"
    echo "========================================"
    echo
    
    # Run pre-flight checks
    run_preflight_checks
    
    # Install system dependencies
    log_info "📦 Installing system dependencies..."
    install_homebrew
    install_node
    install_react_native_cli
    install_xcode_tools
    install_cocoapods
    install_watchman
    install_android_studio
    
    # Setup iOS
    setup_ios_simulator
    setup_ios_certificates
    
    # Setup project
    log_info "🔧 Setting up project..."
    create_env_file
    install_dependencies
    setup_native_modules
    download_models
    
    # Create test utilities
    create_test_script
    
    # Ask user what to run
    echo
    log_info "🚀 Ready to launch the app!"
    echo "Choose an option:"
    echo "1. Run iOS app"
    echo "2. Run Android app"
    echo "3. Start Metro only"
    echo "4. Skip and show instructions"
    echo
    
    read -p "Enter your choice (1-4): " -n 1 -r
    echo
    
    case $REPLY in
        1)
            start_metro
            sleep 3
            run_ios_app
            ;;
        2)
            start_metro
            sleep 3
            run_android_app
            ;;
        3)
            start_metro
            log_info "Metro started. Run 'npm run ios' or 'npm run android' in another terminal"
            ;;
        4)
            log_info "Skipping app launch"
            ;;
        *)
            log_warning "Invalid choice, showing instructions only"
            ;;
    esac
    
    # Show final instructions
    show_usage_instructions
}

# Handle script interruption
trap 'log_error "Installation interrupted"; exit 1' INT

# Run main installation
main "$@"
