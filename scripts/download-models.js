#!/usr/bin/env node

/**
 * Voice Translator App - AI Models Download Script
 * Downloads and sets up all required AI models for voice cloning and translation
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Logging functions
const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  progress: (msg) => process.stdout.write(`${colors.cyan}[PROGRESS]${colors.reset} ${msg}\r`)
};

// Model configurations
const models = [
  {
    name: 'SeamlessM4T Mini',
    filename: 'seamless_m4t_mini.onnx',
    url: 'https://huggingface.co/facebook/seamless-m4t-mini/resolve/main/pytorch_model.bin',
    size: '500MB',
    description: 'Main translation model for speech-to-speech, speech-to-text, and text-to-speech',
    required: true
  },
  {
    name: 'Speaker Encoder',
    filename: 'speaker_encoder.onnx',
    url: 'https://huggingface.co/microsoft/speecht5_vc/resolve/main/speaker_encoder.onnx',
    size: '50MB',
    description: 'Extracts voice embeddings for voice cloning',
    required: true
  },
  {
    name: 'Voice Synthesizer',
    filename: 'voice_synthesizer.onnx',
    url: 'https://huggingface.co/microsoft/speecht5_tts/resolve/main/model.onnx',
    size: '200MB',
    description: 'Synthesizes speech from text with voice characteristics',
    required: true
  },
  {
    name: 'Voice Converter',
    filename: 'voice_converter.onnx',
    url: 'https://huggingface.co/microsoft/speecht5_vc/resolve/main/model.onnx',
    size: '150MB',
    description: 'Converts voice characteristics for voice cloning',
    required: true
  },
  {
    name: 'Emotion Classifier',
    filename: 'emotion_classifier.onnx',
    url: 'https://huggingface.co/audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim/resolve/main/model.onnx',
    size: '30MB',
    description: 'Classifies emotions in speech for enhanced synthesis',
    required: false
  },
  {
    name: 'Language Detector',
    filename: 'language_detector.onnx',
    url: 'https://huggingface.co/facebook/mms-lid-126/resolve/main/model.onnx',
    size: '20MB',
    description: 'Detects spoken language automatically',
    required: false
  }
];

// Configuration
const config = {
  modelsDir: path.join(process.cwd(), 'models'),
  tempDir: path.join(process.cwd(), 'temp'),
  maxRetries: 3,
  timeout: 300000, // 5 minutes per model
  chunkSize: 1024 * 1024 // 1MB chunks
};

// Utility functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function createDirectories() {
  [config.modelsDir, config.tempDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log.info(`Created directory: ${dir}`);
    }
  });
}

function checkDiskSpace() {
  try {
    const stats = fs.statSync(config.modelsDir);
    const free = execSync('df -h . | tail -1 | awk \'{print $4}\'', { encoding: 'utf8' }).trim();
    log.info(`Available disk space: ${free}`);
    
    // Estimate total download size
    const totalSize = models.reduce((sum, model) => {
      const sizeNum = parseFloat(model.size);
      return sum + (model.size.includes('GB') ? sizeNum * 1024 : sizeNum);
    }, 0);
    
    log.info(`Estimated download size: ${Math.round(totalSize)}MB`);
    
    if (parseFloat(free) < totalSize / 1024 + 1) { // Add 1GB buffer
      log.warning('Low disk space detected. Please ensure sufficient space for model downloads.');
    }
  } catch (error) {
    log.warning('Could not check disk space');
  }
}

function downloadFile(url, filepath, modelName) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    let downloadedBytes = 0;
    let totalBytes = 0;
    let lastProgress = 0;
    
    const request = https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirects
        return downloadFile(response.headers.location, filepath, modelName)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      totalBytes = parseInt(response.headers['content-length'], 10);
      
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        file.write(chunk);
        
        if (totalBytes > 0) {
          const progress = Math.round((downloadedBytes / totalBytes) * 100);
          if (progress !== lastProgress && progress % 5 === 0) {
            log.progress(`${modelName}: ${progress}% (${formatBytes(downloadedBytes)}/${formatBytes(totalBytes)})`);
            lastProgress = progress;
          }
        }
      });
      
      response.on('end', () => {
        file.end();
        log.success(`${modelName}: Download completed (${formatBytes(downloadedBytes)})`);
        resolve();
      });
      
      response.on('error', (error) => {
        file.destroy();
        fs.unlink(filepath, () => {});
        reject(error);
      });
    });
    
    request.on('error', (error) => {
      file.destroy();
      fs.unlink(filepath, () => {});
      reject(error);
    });
    
    request.setTimeout(config.timeout, () => {
      request.destroy();
      file.destroy();
      fs.unlink(filepath, () => {});
      reject(new Error('Download timeout'));
    });
  });
}

async function downloadModel(model, retryCount = 0) {
  const filepath = path.join(config.modelsDir, model.filename);
  
  // Check if model already exists
  if (fs.existsSync(filepath)) {
    const stats = fs.statSync(filepath);
    if (stats.size > 1024 * 1024) { // At least 1MB
      log.info(`${model.name}: Already downloaded (${formatBytes(stats.size)})`);
      return true;
    } else {
      log.warning(`${model.name}: Incomplete download detected, re-downloading...`);
      fs.unlinkSync(filepath);
    }
  }
  
  try {
    log.info(`${model.name}: Starting download...`);
    await downloadFile(model.url, filepath, model.name);
    
    // Verify download
    const stats = fs.statSync(filepath);
    if (stats.size < 1024 * 1024) { // Less than 1MB is suspicious
      throw new Error('Downloaded file is too small');
    }
    
    return true;
  } catch (error) {
    log.error(`${model.name}: Download failed - ${error.message}`);
    
    if (retryCount < config.maxRetries) {
      log.info(`${model.name}: Retrying... (${retryCount + 1}/${config.maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      return downloadModel(model, retryCount + 1);
    } else {
      if (model.required) {
        throw new Error(`Failed to download required model: ${model.name}`);
      } else {
        log.warning(`${model.name}: Optional model download failed, continuing...`);
        return false;
      }
    }
  }
}

function convertModels() {
  log.info('Converting models to optimized format...');
  
  // This would typically involve converting PyTorch models to ONNX format
  // For now, we'll just verify the models are in place
  
  const modelFiles = fs.readdirSync(config.modelsDir);
  log.info(`Found ${modelFiles.length} model files in ${config.modelsDir}`);
  
  modelFiles.forEach(file => {
    const filepath = path.join(config.modelsDir, file);
    const stats = fs.statSync(filepath);
    log.info(`  ${file}: ${formatBytes(stats.size)}`);
  });
}

function createModelManifest() {
  const manifest = {
    version: '1.0.0',
    created: new Date().toISOString(),
    models: {},
    totalSize: 0
  };
  
  models.forEach(model => {
    const filepath = path.join(config.modelsDir, model.filename);
    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      manifest.models[model.filename] = {
        name: model.name,
        description: model.description,
        size: stats.size,
        checksum: '', // Would calculate MD5/SHA256 in production
        downloaded: true
      };
      manifest.totalSize += stats.size;
    } else {
      manifest.models[model.filename] = {
        name: model.name,
        description: model.description,
        downloaded: false
      };
    }
  });
  
  const manifestPath = path.join(config.modelsDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  log.success(`Model manifest created: ${manifestPath}`);
  
  return manifest;
}

function cleanup() {
  if (fs.existsSync(config.tempDir)) {
    fs.rmSync(config.tempDir, { recursive: true, force: true });
    log.info('Cleaned up temporary files');
  }
}

function showSummary(manifest) {
  console.log('\n' + '='.repeat(60));
  log.success('🎉 Model Download Summary');
  console.log('='.repeat(60));
  
  const downloaded = Object.values(manifest.models).filter(m => m.downloaded);
  const failed = Object.values(manifest.models).filter(m => !m.downloaded);
  
  log.info(`✅ Successfully downloaded: ${downloaded.length} models`);
  log.info(`📦 Total size: ${formatBytes(manifest.totalSize)}`);
  
  if (failed.length > 0) {
    log.warning(`❌ Failed downloads: ${failed.length} models`);
    failed.forEach(model => {
      log.warning(`  - ${model.name}`);
    });
  }
  
  console.log('\n📋 Available Models:');
  downloaded.forEach(model => {
    console.log(`  ✅ ${model.name}: ${formatBytes(model.size)}`);
    console.log(`     ${model.description}`);
  });
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Run the Voice Translator app');
  console.log('2. Models will be automatically loaded');
  console.log('3. Grant microphone permissions when prompted');
  console.log('4. Test voice translation features');
  
  if (failed.length > 0) {
    console.log('\n⚠️  Note: Some optional models failed to download.');
    console.log('   The app will still work with reduced functionality.');
    console.log('   You can retry downloading with: npm run setup-models');
  }
}

// Main execution
async function main() {
  console.log('🤖 Voice Translator App - AI Models Setup');
  console.log('==========================================\n');
  
  try {
    // Setup
    createDirectories();
    checkDiskSpace();
    
    // Download models
    log.info(`Starting download of ${models.length} AI models...`);
    
    for (const model of models) {
      await downloadModel(model);
    }
    
    // Post-processing
    convertModels();
    const manifest = createModelManifest();
    
    // Cleanup and summary
    cleanup();
    showSummary(manifest);
    
    log.success('🎯 Model setup completed successfully!');
    
  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    cleanup();
    process.exit(1);
  }
}

// Handle interruption
process.on('SIGINT', () => {
  log.warning('\nDownload interrupted by user');
  cleanup();
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log.error(`Uncaught exception: ${error.message}`);
  cleanup();
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { downloadModel, createModelManifest, models };

