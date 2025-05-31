#import "VoiceCloning.h"
#import <React/RCTLog.h>
#import <AVFoundation/AVFoundation.h>

// Import ONNX Runtime for iOS
#import <onnxruntime_objc/onnxruntime.h>

@interface VoiceCloning()
@property (nonatomic, strong) NSMutableDictionary<NSString *, ORTSession *> *modelSessions;
@property (nonatomic, strong) NSMutableDictionary<NSString *, NSDictionary *> *voiceProfiles;
@property (nonatomic, strong) ORTEnv *ortEnvironment;
@property (nonatomic, assign) BOOL isInitialized;
@property (nonatomic, strong) dispatch_queue_t processingQueue;
@end

@implementation VoiceCloning

RCT_EXPORT_MODULE();

- (instancetype)init {
    self = [super init];
    if (self) {
        self.isInitialized = NO;
        self.modelSessions = [NSMutableDictionary dictionary];
        self.voiceProfiles = [NSMutableDictionary dictionary];
        self.processingQueue = dispatch_queue_create("com.voicetranslator.voicecloning", DISPATCH_QUEUE_SERIAL);
        
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

RCT_EXPORT_METHOD(initializeVoiceCloning:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(self.processingQueue, ^{
        @try {
            if (self.isInitialized) {
                resolve(@YES);
                return;
            }
            
            NSString *documentsPath = [NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES) firstObject];
            NSString *modelsPath = [documentsPath stringByAppendingPathComponent:@"voice_cloning_models"];
            
            // Check if models directory exists
            if (![[NSFileManager defaultManager] fileExistsAtPath:modelsPath]) {
                reject(@"MODELS_NOT_FOUND", @"Voice cloning models not found", nil);
                return;
            }
            
            // Initialize voice cloning models
            NSArray *modelFiles = @[
                @"speaker_encoder.onnx",
                @"voice_synthesizer.onnx", 
                @"voice_converter.onnx",
                @"emotion_classifier.onnx"
            ];
            
            for (NSString *modelFile in modelFiles) {
                NSString *modelPath = [modelsPath stringByAppendingPathComponent:modelFile];
                
                if (![[NSFileManager defaultManager] fileExistsAtPath:modelPath]) {
                    RCTLogWarn(@"Model not found: %@", modelFile);
                    continue;
                }
                
                NSError *error;
                ORTSessionOptions *sessionOptions = [[ORTSessionOptions alloc] init];
                
                // Enable Core ML acceleration if available
                if (@available(iOS 13.0, *)) {
                    [sessionOptions appendCoreMLProviderWithFlags:0 error:&error];
                    if (!error) {
                        RCTLog(@"Core ML acceleration enabled for %@", modelFile);
                    } else {
                        RCTLogWarn(@"Core ML not available for %@: %@", modelFile, error.localizedDescription);
                    }
                }
                
                // Create ONNX Runtime session
                ORTSession *session = [[ORTSession alloc] initWithEnv:self.ortEnvironment
                                                           modelPath:modelPath
                                                             options:sessionOptions
                                                               error:&error];
                
                if (error) {
                    RCTLogError(@"Failed to load model %@: %@", modelFile, error.localizedDescription);
                    continue;
                }
                
                self.modelSessions[modelFile] = session;
                RCTLog(@"Loaded voice cloning model: %@", modelFile);
            }
            
            self.isInitialized = YES;
            RCTLog(@"Voice cloning initialized successfully");
            resolve(@YES);
            
        } @catch (NSException *exception) {
            reject(@"INITIALIZATION_ERROR", [NSString stringWithFormat:@"Failed to initialize: %@", exception.reason], nil);
        }
    });
}

RCT_EXPORT_METHOD(extractVoiceEmbeddings:(NSString *)audioPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(self.processingQueue, ^{
        @try {
            if (!self.isInitialized) {
                reject(@"NOT_INITIALIZED", @"Voice cloning not initialized", nil);
                return;
            }
            
            ORTSession *speakerEncoder = self.modelSessions[@"speaker_encoder.onnx"];
            if (!speakerEncoder) {
                reject(@"MODEL_NOT_LOADED", @"Speaker encoder model not loaded", nil);
                return;
            }
            
            // Load and preprocess audio
            NSArray<NSNumber *> *audioData = [self loadAndPreprocessAudio:audioPath];
            if (!audioData) {
                reject(@"AUDIO_LOAD_FAILED", @"Failed to load audio file", nil);
                return;
            }
            
            NSError *error;
            
            // Create input tensor
            NSArray<NSNumber *> *audioShape = @[@1, @(audioData.count)];
            ORTValue *audioTensor = [ORTValue createTensorWithData:[self floatArrayFromNSNumberArray:audioData]
                                                       elementType:ORTTensorElementDataTypeFloat
                                                             shape:audioShape
                                                             error:&error];
            if (error) {
                reject(@"TENSOR_CREATION_FAILED", @"Failed to create audio tensor", error);
                return;
            }
            
            // Run speaker encoder
            NSDictionary<NSString *, ORTValue *> *inputs = @{@"audio": audioTensor};
            NSArray<NSString *> *outputNames = @[@"embeddings"];
            NSDictionary<NSString *, ORTValue *> *outputs = [speakerEncoder runWithInputs:inputs
                                                                               outputNames:outputNames
                                                                                   options:nil
                                                                                     error:&error];
            
            if (error) {
                reject(@"INFERENCE_FAILED", @"Speaker encoder inference failed", error);
                return;
            }
            
            // Extract embeddings
            ORTValue *embeddingTensor = outputs[@"embeddings"];
            NSData *embeddingData = [embeddingTensor tensorDataWithError:&error];
            if (error) {
                reject(@"DATA_EXTRACTION_FAILED", @"Failed to extract embedding data", error);
                return;
            }
            
            // Convert to NSArray
            NSMutableArray *embeddingsArray = [NSMutableArray array];
            const float *embeddings = (const float *)embeddingData.bytes;
            NSUInteger embeddingCount = embeddingData.length / sizeof(float);
            
            for (NSUInteger i = 0; i < embeddingCount; i++) {
                [embeddingsArray addObject:@(embeddings[i])];
            }
            
            resolve(embeddingsArray);
            
        } @catch (NSException *exception) {
            reject(@"EXTRACTION_FAILED", [NSString stringWithFormat:@"Failed to extract embeddings: %@", exception.reason], nil);
        }
    });
}

RCT_EXPORT_METHOD(createVoiceProfile:(NSString *)profileName
                  audioSamples:(NSArray *)audioSamples
                  embeddings:(NSArray *)embeddings
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(self.processingQueue, ^{
        @try {
            if (!self.isInitialized) {
                reject(@"NOT_INITIALIZED", @"Voice cloning not initialized", nil);
                return;
            }
            
            // Generate unique profile ID
            NSString *profileId = [NSString stringWithFormat:@"profile_%ld", (long)[[NSDate date] timeIntervalSince1970]];
            
            // Create voice profile dictionary
            NSDictionary *profile = @{
                @"id": profileId,
                @"name": profileName,
                @"audioSamples": audioSamples,
                @"embeddings": embeddings,
                @"createdAt": [NSDate date],
                @"characteristics": @{
                    @"pitch": @0,
                    @"speed": @1.0,
                    @"emotion": @"neutral"
                }
            };
            
            // Store voice profile
            self.voiceProfiles[profileId] = profile;
            
            // Prepare response
            NSDictionary *response = @{
                @"profileId": profileId,
                @"embeddings": embeddings
            };
            
            RCTLog(@"Voice profile created: %@", profileName);
            resolve(response);
            
        } @catch (NSException *exception) {
            reject(@"PROFILE_CREATION_FAILED", [NSString stringWithFormat:@"Failed to create profile: %@", exception.reason], nil);
        }
    });
}

RCT_EXPORT_METHOD(synthesizeVoice:(NSString *)text
                  profileId:(NSString *)profileId
                  language:(NSString *)language
                  emotion:(NSString *)emotion
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(self.processingQueue, ^{
        @try {
            if (!self.isInitialized) {
                reject(@"NOT_INITIALIZED", @"Voice cloning not initialized", nil);
                return;
            }
            
            NSDictionary *profile = self.voiceProfiles[profileId];
            if (!profile) {
                reject(@"PROFILE_NOT_FOUND", @"Voice profile not found", nil);
                return;
            }
            
            ORTSession *synthesizer = self.modelSessions[@"voice_synthesizer.onnx"];
            if (!synthesizer) {
                reject(@"MODEL_NOT_LOADED", @"Voice synthesizer model not loaded", nil);
                return;
            }
            
            NSError *error;
            
            // Tokenize text (simplified)
            NSArray<NSNumber *> *textTokens = [self tokenizeText:text];
            NSArray<NSNumber *> *embeddings = profile[@"embeddings"];
            
            // Prepare input tensors
            NSArray<NSNumber *> *textShape = @[@1, @(textTokens.count)];
            ORTValue *textTensor = [ORTValue createTensorWithData:[self int64ArrayFromNSNumberArray:textTokens]
                                                      elementType:ORTTensorElementDataTypeInt64
                                                            shape:textShape
                                                            error:&error];
            
            NSArray<NSNumber *> *embeddingShape = @[@1, @(embeddings.count)];
            ORTValue *embeddingTensor = [ORTValue createTensorWithData:[self floatArrayFromNSNumberArray:embeddings]
                                                           elementType:ORTTensorElementDataTypeFloat
                                                                 shape:embeddingShape
                                                                 error:&error];
            
            // Language and emotion tokens
            NSArray<NSNumber *> *langToken = @[[self getLanguageToken:language]];
            NSArray<NSNumber *> *emotionToken = @[[self getEmotionToken:emotion]];
            
            ORTValue *langTensor = [ORTValue createTensorWithData:[self int64ArrayFromNSNumberArray:langToken]
                                                      elementType:ORTTensorElementDataTypeInt64
                                                            shape:@[@1, @1]
                                                            error:&error];
            
            ORTValue *emotionTensor = [ORTValue createTensorWithData:[self int64ArrayFromNSNumberArray:emotionToken]
                                                         elementType:ORTTensorElementDataTypeInt64
                                                               shape:@[@1, @1]
                                                               error:&error];
            
            // Run synthesis
            NSDictionary<NSString *, ORTValue *> *inputs = @{
                @"text": textTensor,
                @"speaker_embedding": embeddingTensor,
                @"language": langTensor,
                @"emotion": emotionTensor
            };
            
            NSArray<NSString *> *outputNames = @[@"audio"];
            NSDictionary<NSString *, ORTValue *> *outputs = [synthesizer runWithInputs:inputs
                                                                            outputNames:outputNames
                                                                                options:nil
                                                                                  error:&error];
            
            if (error) {
                reject(@"SYNTHESIS_FAILED", @"Voice synthesis failed", error);
                return;
            }
            
            // Process output audio
            ORTValue *audioOutput = outputs[@"audio"];
            NSString *outputPath = [self saveAudioToFile:audioOutput prefix:@"synthesized"];
            
            // Calculate duration (simplified)
            double duration = 5.0; // Mock duration
            
            // Prepare response
            NSDictionary *response = @{
                @"audioPath": outputPath ?: @"",
                @"duration": @(duration)
            };
            
            resolve(response);
            
        } @catch (NSException *exception) {
            reject(@"SYNTHESIS_FAILED", [NSString stringWithFormat:@"Voice synthesis failed: %@", exception.reason], nil);
        }
    });
}

RCT_EXPORT_METHOD(cloneVoiceFromSample:(NSString *)audioPath
                  targetText:(NSString *)targetText
                  language:(NSString *)language
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(self.processingQueue, ^{
        @try {
            if (!self.isInitialized) {
                reject(@"NOT_INITIALIZED", @"Voice cloning not initialized", nil);
                return;
            }
            
            // Extract embeddings from source audio
            NSArray<NSNumber *> *sourceEmbeddings = [self extractEmbeddingsFromAudioSync:audioPath];
            if (!sourceEmbeddings) {
                reject(@"EMBEDDING_EXTRACTION_FAILED", @"Failed to extract voice embeddings", nil);
                return;
            }
            
            ORTSession *voiceConverter = self.modelSessions[@"voice_converter.onnx"];
            if (!voiceConverter) {
                reject(@"MODEL_NOT_LOADED", @"Voice converter model not loaded", nil);
                return;
            }
            
            NSError *error;
            
            // Tokenize target text
            NSArray<NSNumber *> *textTokens = [self tokenizeText:targetText];
            
            // Prepare tensors
            NSArray<NSNumber *> *textShape = @[@1, @(textTokens.count)];
            ORTValue *textTensor = [ORTValue createTensorWithData:[self int64ArrayFromNSNumberArray:textTokens]
                                                      elementType:ORTTensorElementDataTypeInt64
                                                            shape:textShape
                                                            error:&error];
            
            NSArray<NSNumber *> *embeddingShape = @[@1, @(sourceEmbeddings.count)];
            ORTValue *embeddingTensor = [ORTValue createTensorWithData:[self floatArrayFromNSNumberArray:sourceEmbeddings]
                                                           elementType:ORTTensorElementDataTypeFloat
                                                                 shape:embeddingShape
                                                                 error:&error];
            
            NSArray<NSNumber *> *langToken = @[[self getLanguageToken:language]];
            ORTValue *langTensor = [ORTValue createTensorWithData:[self int64ArrayFromNSNumberArray:langToken]
                                                      elementType:ORTTensorElementDataTypeInt64
                                                            shape:@[@1, @1]
                                                            error:&error];
            
            // Run voice conversion
            NSDictionary<NSString *, ORTValue *> *inputs = @{
                @"text": textTensor,
                @"source_embedding": embeddingTensor,
                @"language": langTensor
            };
            
            NSArray<NSString *> *outputNames = @[@"converted_audio"];
            NSDictionary<NSString *, ORTValue *> *outputs = [voiceConverter runWithInputs:inputs
                                                                               outputNames:outputNames
                                                                                   options:nil
                                                                                     error:&error];
            
            if (error) {
                reject(@"CLONING_FAILED", @"Voice cloning failed", error);
                return;
            }
            
            // Save cloned audio
            ORTValue *audioOutput = outputs[@"converted_audio"];
            NSString *outputPath = [self saveAudioToFile:audioOutput prefix:@"cloned"];
            
            // Calculate similarity (mock)
            double similarity = 0.85;
            
            // Prepare response
            NSDictionary *response = @{
                @"clonedAudioPath": outputPath ?: @"",
                @"similarity": @(similarity)
            };
            
            resolve(response);
            
        } @catch (NSException *exception) {
            reject(@"CLONING_FAILED", [NSString stringWithFormat:@"Voice cloning failed: %@", exception.reason], nil);
        }
    });
}

RCT_EXPORT_METHOD(enhanceAudioQuality:(NSString *)audioPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(self.processingQueue, ^{
        @try {
            // Audio enhancement logic (simplified)
            NSArray<NSNumber *> *audioData = [self loadAndPreprocessAudio:audioPath];
            if (!audioData) {
                reject(@"AUDIO_LOAD_FAILED", @"Failed to load audio", nil);
                return;
            }
            
            // Apply enhancement (mock implementation)
            NSString *outputPath = [self enhanceAndSaveAudio:audioData];
            resolve(outputPath);
            
        } @catch (NSException *exception) {
            reject(@"ENHANCEMENT_FAILED", [NSString stringWithFormat:@"Audio enhancement failed: %@", exception.reason], nil);
        }
    });
}

RCT_EXPORT_METHOD(adjustVoiceCharacteristics:(NSString *)audioPath
                  pitch:(double)pitch
                  speed:(double)speed
                  emotion:(NSString *)emotion
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(self.processingQueue, ^{
        @try {
            NSArray<NSNumber *> *audioData = [self loadAndPreprocessAudio:audioPath];
            if (!audioData) {
                reject(@"AUDIO_LOAD_FAILED", @"Failed to load audio", nil);
                return;
            }
            
            // Apply voice adjustments (mock implementation)
            NSString *outputPath = [self adjustAndSaveAudio:audioData pitch:pitch speed:speed emotion:emotion];
            resolve(outputPath);
            
        } @catch (NSException *exception) {
            reject(@"ADJUSTMENT_FAILED", [NSString stringWithFormat:@"Voice adjustment failed: %@", exception.reason], nil);
        }
    });
}

RCT_EXPORT_METHOD(compareVoiceProfiles:(NSString *)profileId1
                  profileId2:(NSString *)profileId2
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        NSDictionary *profile1 = self.voiceProfiles[profileId1];
        NSDictionary *profile2 = self.voiceProfiles[profileId2];
        
        if (!profile1 || !profile2) {
            reject(@"PROFILE_NOT_FOUND", @"One or both profiles not found", nil);
            return;
        }
        
        // Calculate cosine similarity
        NSArray *embeddings1 = profile1[@"embeddings"];
        NSArray *embeddings2 = profile2[@"embeddings"];
        double similarity = [self calculateCosineSimilarity:embeddings1 embeddings2:embeddings2];
        
        NSDictionary *response = @{@"similarity": @(similarity)};
        resolve(response);
        
    } @catch (NSException *exception) {
        reject(@"COMPARISON_FAILED", [NSString stringWithFormat:@"Voice comparison failed: %@", exception.reason], nil);
    }
}

RCT_EXPORT_METHOD(isVoiceCloningReady:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@(self.isInitialized && self.modelSessions.count > 0));
}

RCT_EXPORT_METHOD(getAvailableVoices:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSArray *profileIds = [self.voiceProfiles allKeys];
    resolve(profileIds);
}

RCT_EXPORT_METHOD(cleanupVoiceProfile:(NSString *)profileId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        [self.voiceProfiles removeObjectForKey:profileId];
        resolve([NSNull null]);
    } @catch (NSException *exception) {
        reject(@"CLEANUP_FAILED", [NSString stringWithFormat:@"Failed to cleanup profile: %@", exception.reason], nil);
    }
}

#pragma mark - Helper Methods

- (NSArray<NSNumber *> *)loadAndPreprocessAudio:(NSString *)audioPath {
    @try {
        NSURL *audioURL = [NSURL fileURLWithPath:audioPath];
        
        NSError *error;
        AVAudioFile *audioFile = [[AVAudioFile alloc] initForReading:audioURL error:&error];
        if (error) {
            RCTLogError(@"Failed to load audio file: %@", error.localizedDescription);
            return nil;
        }
        
        // Convert to processing format (16kHz, mono)
        AVAudioFormat *processingFormat = [[AVAudioFormat alloc] initWithCommonFormat:AVAudioPCMFormatFloat32
                                                                           sampleRate:16000
                                                                             channels:1
                                                                          interleaved:NO];
        
        AVAudioConverter *converter = [[AVAudioConverter alloc] initFromFormat:audioFile.processingFormat
                                                                      toFormat:processingFormat];
        
        AVAudioFrameCount frameCount = (AVAudioFrameCount)audioFile.length;
        AVAudioPCMBuffer *buffer = [[AVAudioPCMBuffer alloc] initWithPCMFormat:processingFormat
                                                                     frameCapacity:frameCount];
        
        [converter convertToBuffer:buffer error:&error withInputFromBlock:^AVAudioBuffer *(AVAudioFrameCount inNumberOfFrames, AVAudioConverterInputStatus *outStatus) {
            AVAudioPCMBuffer *inputBuffer = [[AVAudioPCMBuffer alloc] initWithPCMFormat:audioFile.processingFormat
                                                                          frameCapacity:inNumberOfFrames];
            [audioFile readIntoBuffer:inputBuffer error:nil];
            *outStatus = AVAudioConverterInputStatus_HaveData;
            return inputBuffer;
        }];
        
        // Convert to NSArray
        NSMutableArray<NSNumber *> *audioData = [NSMutableArray array];
        float *channelData = buffer.floatChannelData[0];
        for (AVAudioFrameCount i = 0; i < buffer.frameLength; i++) {
            [audioData addObject:@(channelData[i])];
        }
        
        return audioData;
        
    } @catch (NSException *exception) {
        RCTLogError(@"Exception loading audio: %@", exception.reason);
        return nil;
    }
}

- (NSString *)saveAudioToFile:(ORTValue *)audioTensor prefix:(NSString *)prefix {
    @try {
        NSError *error;
        NSData *tensorData = [audioTensor tensorDataWithError:&error];
        if (error) {
            RCTLogError(@"Failed to extract tensor data: %@", error.localizedDescription);
            return nil;
        }
        
        NSString *outputPath = [NSTemporaryDirectory() stringByAppendingPathComponent:
                               [NSString stringWithFormat:@"%@_audio_%ld.wav", prefix, (long)[[NSDate date] timeIntervalSince1970]]];
        
        [tensorData writeToFile:outputPath atomically:YES];
        return outputPath;
        
    } @catch (NSException *exception) {
        RCTLogError(@"Exception saving audio: %@", exception.reason);
        return nil;
    }
}

- (NSArray<NSNumber *> *)extractEmbeddingsFromAudioSync:(NSString *)audioPath {
    // Synchronous version of embedding extraction for internal use
    // Implementation would be similar to the async version
    return @[@0.1, @0.2, @0.3]; // Mock embeddings
}

- (NSArray<NSNumber *> *)tokenizeText:(NSString *)text {
    // Simplified tokenization
    NSArray<NSString *> *words = [text componentsSeparatedByString:@" "];
    NSMutableArray<NSNumber *> *tokens = [NSMutableArray array];
    
    for (NSString *word in words) {
        NSUInteger hash = [word hash] % 10000;
        [tokens addObject:@(hash)];
    }
    
    return tokens;
}

- (NSNumber *)getLanguageToken:(NSString *)language {
    NSDictionary *languageTokens = @{
        @"en": @1, @"es": @2, @"fr": @3, @"de": @4, @"it": @5,
        @"pt": @6, @"ru": @7, @"zh": @8, @"ja": @9, @"ko": @10
    };
    return languageTokens[language.lowercaseString] ?: @1;
}

- (NSNumber *)getEmotionToken:(NSString *)emotion {
    NSDictionary *emotionTokens = @{
        @"neutral": @0, @"happy": @1, @"sad": @2,
        @"angry": @3, @"excited": @4, @"calm": @5
    };
    return emotionTokens[emotion.lowercaseString] ?: @0;
}

- (NSString *)enhanceAndSaveAudio:(NSArray<NSNumber *> *)audioData {
    // Mock audio enhancement
    NSString *outputPath = [NSTemporaryDirectory() stringByAppendingPathComponent:
                           [NSString stringWithFormat:@"enhanced_audio_%ld.wav", (long)[[NSDate date] timeIntervalSince1970]]];
    
    // Save enhanced audio (simplified)
    NSData *audioBytes = [self floatArrayFromNSNumberArray:audioData];
    [audioBytes writeToFile:outputPath atomically:YES];
    
    return outputPath;
}

- (NSString *)adjustAndSaveAudio:(NSArray<NSNumber *> *)audioData
                           pitch:(double)pitch
                           speed:(double)speed
                         emotion:(NSString *)emotion {
    // Mock voice adjustment
    NSString *outputPath = [NSTemporaryDirectory() stringByAppendingPathComponent:
                           [NSString stringWithFormat:@"adjusted_audio_%ld.wav", (long)[[NSDate date] timeIntervalSince1970]]];
    
    // Save adjusted audio (simplified)
    NSData *audioBytes = [self floatArrayFromNSNumberArray:audioData];
    [audioBytes writeToFile:outputPath atomically:YES];
    
    return outputPath;
}

- (double)calculateCosineSimilarity:(NSArray<NSNumber *> *)vector1 embeddings2:(NSArray<NSNumber *> *)vector2 {
    if (vector1.count != vector2.count) {
        return 0.0;
    }
    
    double dotProduct = 0.0;
    double norm1 = 0.0;
    double norm2 = 0.0;
    
    for (NSUInteger i = 0; i < vector1.count; i++) {
        double val1 = vector1[i].doubleValue;
        double val2 = vector2[i].doubleValue;
        
        dotProduct += val1 * val2;
        norm1 += val1 * val1;
        norm2 += val2 * val2;
    }
    
    return dotProduct / (sqrt(norm1) * sqrt(norm2));
}

- (NSData *)floatArrayFromNSNumberArray:(NSArray<NSNumber *> *)numberArray {
    NSMutableData *data = [NSMutableData dataWithCapacity:numberArray.count * sizeof(float)];
    for (NSNumber *number in numberArray) {
        float value = number.floatValue;
        [data appendBytes:&value length:sizeof(float)];
    }
    return data;
}

- (NSData *)int64ArrayFromNSNumberArray:(NSArray<NSNumber *> *)numberArray {
    NSMutableData *data = [NSMutableData dataWithCapacity:numberArray.count * sizeof(int64_t)];
    for (NSNumber *number in numberArray) {
        int64_t value = number.longLongValue;
        [data appendBytes:&value length:sizeof(int64_t)];
    }
    return data;
}

@end

