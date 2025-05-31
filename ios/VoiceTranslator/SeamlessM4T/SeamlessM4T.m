#import "SeamlessM4T.h"
#import <React/RCTLog.h>
#import <AVFoundation/AVFoundation.h>

// Import ONNX Runtime for iOS
#import <onnxruntime_objc/onnxruntime.h>

@interface SeamlessM4T()
@property (nonatomic, strong) ORTSession *ortSession;
@property (nonatomic, strong) ORTEnv *ortEnvironment;
@property (nonatomic, assign) BOOL isModelLoaded;
@property (nonatomic, strong) dispatch_queue_t processingQueue;
@end

@implementation SeamlessM4T

RCT_EXPORT_MODULE();

- (instancetype)init {
    self = [super init];
    if (self) {
        self.isModelLoaded = NO;
        self.processingQueue = dispatch_queue_create("com.voicetranslator.seamless", DISPATCH_QUEUE_SERIAL);
        
        NSError *error;
        self.ortEnvironment = [[ORTEnv alloc] initWithLoggingLevel:ORTLoggingLevelWarning error:&error];
        if (error) {
            RCTLogError(@"Failed to initialize ONNX Runtime environment: %@", error.localizedDescription);
        }
    }
    return self;
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

RCT_EXPORT_METHOD(initializeModel:(NSString *)modelPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(self.processingQueue, ^{
        @try {
            if (self.isModelLoaded) {
                resolve(@YES);
                return;
            }
            
            // Check if model file exists
            if (![[NSFileManager defaultManager] fileExistsAtPath:modelPath]) {
                reject(@"MODEL_NOT_FOUND", [NSString stringWithFormat:@"Model file not found at: %@", modelPath], nil);
                return;
            }
            
            // Create session options
            ORTSessionOptions *sessionOptions = [[ORTSessionOptions alloc] init];
            
            // Enable Core ML acceleration if available
            NSError *error;
            if (@available(iOS 13.0, *)) {
                [sessionOptions appendCoreMLProviderWithFlags:0 error:&error];
                if (!error) {
                    RCTLog(@"Core ML acceleration enabled");
                } else {
                    RCTLogWarn(@"Core ML not available, using CPU: %@", error.localizedDescription);
                }
            }
            
            // Create ONNX Runtime session
            self.ortSession = [[ORTSession alloc] initWithEnv:self.ortEnvironment
                                                   modelPath:modelPath
                                                     options:sessionOptions
                                                       error:&error];
            
            if (error) {
                reject(@"MODEL_LOAD_FAILED", [NSString stringWithFormat:@"Failed to load model: %@", error.localizedDescription], error);
                return;
            }
            
            self.isModelLoaded = YES;
            RCTLog(@"SeamlessM4T model loaded successfully");
            resolve(@YES);
            
        } @catch (NSException *exception) {
            reject(@"INITIALIZATION_ERROR", [NSString stringWithFormat:@"Unexpected error: %@", exception.reason], nil);
        }
    });
}

RCT_EXPORT_METHOD(translateSpeechToSpeech:(NSString *)audioPath
                  sourceLanguage:(NSString *)sourceLanguage
                  targetLanguage:(NSString *)targetLanguage
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(self.processingQueue, ^{
        @try {
            if (!self.isModelLoaded) {
                reject(@"MODEL_NOT_LOADED", @"Model not loaded", nil);
                return;
            }
            
            // Load and preprocess audio
            NSArray<NSNumber *> *audioData = [self loadAudioFile:audioPath];
            if (!audioData) {
                reject(@"AUDIO_LOAD_FAILED", @"Failed to load audio file", nil);
                return;
            }
            
            // Prepare input tensors
            NSError *error;
            
            // Audio tensor
            NSArray<NSNumber *> *audioShape = @[@1, @(audioData.count)];
            ORTValue *audioTensor = [ORTValue createTensorWithData:[self floatArrayFromNSNumberArray:audioData]
                                                         elementType:ORTTensorElementDataTypeFloat
                                                               shape:audioShape
                                                               error:&error];
            if (error) {
                reject(@"TENSOR_CREATION_FAILED", @"Failed to create audio tensor", error);
                return;
            }
            
            // Language tokens
            NSNumber *sourceLangToken = [self getLanguageToken:sourceLanguage];
            NSNumber *targetLangToken = [self getLanguageToken:targetLanguage];
            
            NSArray<NSNumber *> *langShape = @[@1, @1];
            ORTValue *sourceLangTensor = [ORTValue createTensorWithData:@[sourceLangToken]
                                                            elementType:ORTTensorElementDataTypeInt64
                                                                  shape:langShape
                                                                  error:&error];
            ORTValue *targetLangTensor = [ORTValue createTensorWithData:@[targetLangToken]
                                                            elementType:ORTTensorElementDataTypeInt64
                                                                  shape:langShape
                                                                  error:&error];
            
            // Run inference
            NSDictionary<NSString *, ORTValue *> *inputs = @{
                @"audio": audioTensor,
                @"src_lang": sourceLangTensor,
                @"tgt_lang": targetLangTensor
            };
            
            NSArray<NSString *> *outputNames = @[@"output_audio", @"output_text"];
            NSDictionary<NSString *, ORTValue *> *outputs = [self.ortSession runWithInputs:inputs
                                                                               outputNames:outputNames
                                                                                   options:nil
                                                                                     error:&error];
            
            if (error) {
                reject(@"INFERENCE_FAILED", @"Model inference failed", error);
                return;
            }
            
            // Process outputs
            ORTValue *outputAudio = outputs[@"output_audio"];
            ORTValue *outputText = outputs[@"output_text"];
            
            NSString *translatedAudioPath = [self saveAudioToFile:outputAudio];
            NSString *translatedText = [self processTextOutput:outputText];
            
            NSDictionary *result = @{
                @"translatedAudioPath": translatedAudioPath ?: @"",
                @"translatedText": translatedText ?: @""
            };
            
            resolve(result);
            
        } @catch (NSException *exception) {
            reject(@"TRANSLATION_FAILED", [NSString stringWithFormat:@"Translation failed: %@", exception.reason], nil);
        }
    });
}

RCT_EXPORT_METHOD(translateSpeechToText:(NSString *)audioPath
                  sourceLanguage:(NSString *)sourceLanguage
                  targetLanguage:(NSString *)targetLanguage
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(self.processingQueue, ^{
        @try {
            if (!self.isModelLoaded) {
                reject(@"MODEL_NOT_LOADED", @"Model not loaded", nil);
                return;
            }
            
            // Similar implementation to speech-to-speech but only extract text
            // ... (implementation details)
            
            NSDictionary *result = @{
                @"originalText": @"Extracted original text",
                @"translatedText": @"Translated text result"
            };
            
            resolve(result);
            
        } @catch (NSException *exception) {
            reject(@"TRANSLATION_FAILED", [NSString stringWithFormat:@"Translation failed: %@", exception.reason], nil);
        }
    });
}

RCT_EXPORT_METHOD(translateTextToSpeech:(NSString *)text
                  sourceLanguage:(NSString *)sourceLanguage
                  targetLanguage:(NSString *)targetLanguage
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(self.processingQueue, ^{
        @try {
            if (!self.isModelLoaded) {
                reject(@"MODEL_NOT_LOADED", @"Model not loaded", nil);
                return;
            }
            
            // Text-to-speech implementation
            // ... (implementation details)
            
            NSDictionary *result = @{
                @"translatedAudioPath": @"path/to/translated/audio.wav",
                @"translatedText": @"Translated text"
            };
            
            resolve(result);
            
        } @catch (NSException *exception) {
            reject(@"TRANSLATION_FAILED", [NSString stringWithFormat:@"Translation failed: %@", exception.reason], nil);
        }
    });
}

RCT_EXPORT_METHOD(translateTextToText:(NSString *)text
                  sourceLanguage:(NSString *)sourceLanguage
                  targetLanguage:(NSString *)targetLanguage
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(self.processingQueue, ^{
        @try {
            if (!self.isModelLoaded) {
                reject(@"MODEL_NOT_LOADED", @"Model not loaded", nil);
                return;
            }
            
            // Text-to-text implementation
            // ... (implementation details)
            
            NSDictionary *result = @{
                @"translatedText": @"Translated text result"
            };
            
            resolve(result);
            
        } @catch (NSException *exception) {
            reject(@"TRANSLATION_FAILED", [NSString stringWithFormat:@"Translation failed: %@", exception.reason], nil);
        }
    });
}

RCT_EXPORT_METHOD(detectLanguage:(NSString *)audioPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(self.processingQueue, ^{
        @try {
            if (!self.isModelLoaded) {
                reject(@"MODEL_NOT_LOADED", @"Model not loaded", nil);
                return;
            }
            
            // Language detection implementation
            // ... (implementation details)
            
            resolve(@"eng"); // Mock result
            
        } @catch (NSException *exception) {
            reject(@"DETECTION_FAILED", [NSString stringWithFormat:@"Language detection failed: %@", exception.reason], nil);
        }
    });
}

RCT_EXPORT_METHOD(isModelLoaded:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@(self.isModelLoaded));
}

RCT_EXPORT_METHOD(unloadModel:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(self.processingQueue, ^{
        @try {
            self.ortSession = nil;
            self.isModelLoaded = NO;
            resolve([NSNull null]);
        } @catch (NSException *exception) {
            reject(@"UNLOAD_FAILED", [NSString stringWithFormat:@"Failed to unload model: %@", exception.reason], nil);
        }
    });
}

RCT_EXPORT_METHOD(getSupportedLanguages:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSArray *supportedLanguages = @[
        @"eng", @"spa", @"fra", @"deu", @"ita", @"por", @"rus", @"cmn", @"jpn", @"kor",
        @"arb", @"hin", @"tur", @"pol", @"nld", @"swe", @"dan", @"nor", @"fin", @"ces",
        @"hun", @"ron", @"bul", @"hrv", @"slk", @"slv", @"est", @"lav", @"lit", @"mlt",
        @"gle", @"cym"
    ];
    resolve(supportedLanguages);
}

#pragma mark - Helper Methods

- (NSArray<NSNumber *> *)loadAudioFile:(NSString *)audioPath {
    @try {
        NSURL *audioURL = [NSURL fileURLWithPath:audioPath];
        
        // Load audio file using AVAudioFile
        NSError *error;
        AVAudioFile *audioFile = [[AVAudioFile alloc] initForReading:audioURL error:&error];
        if (error) {
            RCTLogError(@"Failed to load audio file: %@", error.localizedDescription);
            return nil;
        }
        
        // Convert to the format expected by SeamlessM4T (16kHz, mono)
        AVAudioFormat *processingFormat = [[AVAudioFormat alloc] initWithCommonFormat:AVAudioPCMFormatFloat32
                                                                           sampleRate:16000
                                                                             channels:1
                                                                          interleaved:NO];
        
        AVAudioConverter *converter = [[AVAudioConverter alloc] initFromFormat:audioFile.processingFormat
                                                                      toFormat:processingFormat];
        
        AVAudioFrameCount frameCount = (AVAudioFrameCount)audioFile.length;
        AVAudioPCMBuffer *buffer = [[AVAudioPCMBuffer alloc] initWithPCMFormat:processingFormat
                                                                     frameCapacity:frameCount];
        
        // Convert audio
        [converter convertToBuffer:buffer error:&error withInputFromBlock:^AVAudioBuffer *(AVAudioFrameCount inNumberOfFrames, AVAudioConverterInputStatus *outStatus) {
            AVAudioPCMBuffer *inputBuffer = [[AVAudioPCMBuffer alloc] initWithPCMFormat:audioFile.processingFormat
                                                                          frameCapacity:inNumberOfFrames];
            [audioFile readIntoBuffer:inputBuffer error:nil];
            *outStatus = AVAudioConverterInputStatus_HaveData;
            return inputBuffer;
        }];
        
        // Convert to NSArray of NSNumber
        NSMutableArray<NSNumber *> *audioData = [NSMutableArray array];
        float *channelData = buffer.floatChannelData[0];
        for (AVAudioFrameCount i = 0; i < buffer.frameLength; i++) {
            [audioData addObject:@(channelData[i])];
        }
        
        return audioData;
        
    } @catch (NSException *exception) {
        RCTLogError(@"Exception loading audio file: %@", exception.reason);
        return nil;
    }
}

- (NSString *)saveAudioToFile:(ORTValue *)audioTensor {
    @try {
        // Extract audio data from tensor and save to file
        NSError *error;
        NSData *tensorData = [audioTensor tensorDataWithError:&error];
        if (error) {
            RCTLogError(@"Failed to extract tensor data: %@", error.localizedDescription);
            return nil;
        }
        
        // Create output file path
        NSString *outputPath = [NSTemporaryDirectory() stringByAppendingPathComponent:
                               [NSString stringWithFormat:@"translated_audio_%ld.wav", (long)[[NSDate date] timeIntervalSince1970]]];
        
        // Convert tensor data to audio file
        // This is a simplified implementation - in practice you'd need proper audio encoding
        [tensorData writeToFile:outputPath atomically:YES];
        
        return outputPath;
        
    } @catch (NSException *exception) {
        RCTLogError(@"Exception saving audio file: %@", exception.reason);
        return nil;
    }
}

- (NSString *)processTextOutput:(ORTValue *)textTensor {
    @try {
        // Process text tensor to string
        // This is a simplified implementation
        return @"Translated text result";
        
    } @catch (NSException *exception) {
        RCTLogError(@"Exception processing text output: %@", exception.reason);
        return @"Translation result";
    }
}

- (NSNumber *)getLanguageToken:(NSString *)language {
    NSDictionary *languageTokens = @{
        @"eng": @1,
        @"spa": @2,
        @"fra": @3,
        @"deu": @4,
        @"ita": @5,
        @"por": @6,
        @"rus": @7,
        @"cmn": @8,
        @"jpn": @9,
        @"kor": @10
    };
    
    return languageTokens[language] ?: @1; // Default to English
}

- (NSData *)floatArrayFromNSNumberArray:(NSArray<NSNumber *> *)numberArray {
    NSMutableData *data = [NSMutableData dataWithCapacity:numberArray.count * sizeof(float)];
    for (NSNumber *number in numberArray) {
        float value = number.floatValue;
        [data appendBytes:&value length:sizeof(float)];
    }
    return data;
}

@end

