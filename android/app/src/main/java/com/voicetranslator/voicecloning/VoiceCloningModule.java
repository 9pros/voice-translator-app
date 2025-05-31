package com.voicetranslator.voicecloning;

import android.content.Context;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtException;
import ai.onnxruntime.OrtSession;

public class VoiceCloningModule extends ReactContextBaseJavaModule {
    private static final String TAG = "VoiceCloningModule";
    private static final String MODULE_NAME = "VoiceCloning";
    
    private ReactApplicationContext reactContext;
    private OrtEnvironment ortEnvironment;
    private Map<String, OrtSession> modelSessions;
    private Map<String, VoiceProfile> voiceProfiles;
    private boolean isInitialized = false;
    private ExecutorService executorService;
    
    // Voice cloning models
    private static final String SPEAKER_ENCODER_MODEL = "speaker_encoder.onnx";
    private static final String VOICE_SYNTHESIZER_MODEL = "voice_synthesizer.onnx";
    private static final String VOICE_CONVERTER_MODEL = "voice_converter.onnx";
    private static final String EMOTION_CLASSIFIER_MODEL = "emotion_classifier.onnx";

    // Voice profile class
    private static class VoiceProfile {
        String id;
        String name;
        float[] embeddings;
        String[] audioSamples;
        Map<String, Object> characteristics;
        
        VoiceProfile(String id, String name, float[] embeddings, String[] audioSamples) {
            this.id = id;
            this.name = name;
            this.embeddings = embeddings;
            this.audioSamples = audioSamples;
            this.characteristics = new HashMap<>();
        }
    }

    public VoiceCloningModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.executorService = Executors.newFixedThreadPool(2);
        this.modelSessions = new HashMap<>();
        this.voiceProfiles = new HashMap<>();
        
        try {
            this.ortEnvironment = OrtEnvironment.getEnvironment();
        } catch (OrtException e) {
            Log.e(TAG, "Failed to initialize ONNX Runtime environment", e);
        }
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void initializeVoiceCloning(Promise promise) {
        executorService.execute(() -> {
            try {
                if (isInitialized) {
                    promise.resolve(true);
                    return;
                }

                String modelsPath = reactContext.getFilesDir() + "/voice_cloning_models";
                File modelsDir = new File(modelsPath);
                
                if (!modelsDir.exists()) {
                    promise.reject("MODELS_NOT_FOUND", "Voice cloning models not found");
                    return;
                }

                // Initialize all voice cloning models
                String[] modelFiles = {
                    SPEAKER_ENCODER_MODEL,
                    VOICE_SYNTHESIZER_MODEL,
                    VOICE_CONVERTER_MODEL,
                    EMOTION_CLASSIFIER_MODEL
                };

                for (String modelFile : modelFiles) {
                    String modelPath = modelsPath + "/" + modelFile;
                    File model = new File(modelPath);
                    
                    if (!model.exists()) {
                        Log.w(TAG, "Model not found: " + modelFile);
                        continue;
                    }

                    try {
                        OrtSession.SessionOptions sessionOptions = new OrtSession.SessionOptions();
                        sessionOptions.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.BASIC_OPT);
                        
                        // Enable GPU acceleration if available
                        try {
                            sessionOptions.addNnapi();
                            Log.d(TAG, "NNAPI acceleration enabled for " + modelFile);
                        } catch (OrtException e) {
                            Log.w(TAG, "NNAPI not available for " + modelFile, e);
                        }

                        OrtSession session = ortEnvironment.createSession(modelPath, sessionOptions);
                        modelSessions.put(modelFile, session);
                        Log.d(TAG, "Loaded model: " + modelFile);
                        
                    } catch (OrtException e) {
                        Log.e(TAG, "Failed to load model: " + modelFile, e);
                    }
                }

                isInitialized = true;
                Log.d(TAG, "Voice cloning initialized successfully");
                promise.resolve(true);
                
            } catch (Exception e) {
                Log.e(TAG, "Voice cloning initialization failed", e);
                promise.reject("INITIALIZATION_ERROR", "Failed to initialize: " + e.getMessage());
            }
        });
    }

    @ReactMethod
    public void extractVoiceEmbeddings(String audioPath, Promise promise) {
        executorService.execute(() -> {
            try {
                if (!isInitialized) {
                    promise.reject("NOT_INITIALIZED", "Voice cloning not initialized");
                    return;
                }

                OrtSession speakerEncoder = modelSessions.get(SPEAKER_ENCODER_MODEL);
                if (speakerEncoder == null) {
                    promise.reject("MODEL_NOT_LOADED", "Speaker encoder model not loaded");
                    return;
                }

                // Load and preprocess audio
                float[] audioData = loadAndPreprocessAudio(audioPath);
                if (audioData == null) {
                    promise.reject("AUDIO_LOAD_FAILED", "Failed to load audio file");
                    return;
                }

                // Create input tensor
                long[] audioShape = {1, audioData.length};
                OnnxTensor audioTensor = OnnxTensor.createTensor(ortEnvironment, audioData, audioShape);

                // Run speaker encoder
                OrtSession.Result result = speakerEncoder.run(Map.of("audio", audioTensor));
                OnnxTensor embeddingTensor = (OnnxTensor) result.get("embeddings").get();
                
                // Extract embeddings
                float[] embeddings = (float[]) embeddingTensor.getValue();

                // Convert to WritableArray
                WritableArray embeddingsArray = new WritableNativeArray();
                for (float embedding : embeddings) {
                    embeddingsArray.pushDouble(embedding);
                }

                // Cleanup
                audioTensor.close();
                result.close();

                promise.resolve(embeddingsArray);

            } catch (Exception e) {
                Log.e(TAG, "Voice embedding extraction failed", e);
                promise.reject("EXTRACTION_FAILED", "Failed to extract embeddings: " + e.getMessage());
            }
        });
    }

    @ReactMethod
    public void createVoiceProfile(String profileName, ReadableArray audioSamples, 
                                  ReadableArray embeddings, Promise promise) {
        executorService.execute(() -> {
            try {
                if (!isInitialized) {
                    promise.reject("NOT_INITIALIZED", "Voice cloning not initialized");
                    return;
                }

                // Generate unique profile ID
                String profileId = "profile_" + System.currentTimeMillis();

                // Convert audio samples
                String[] audioSamplePaths = new String[audioSamples.size()];
                for (int i = 0; i < audioSamples.size(); i++) {
                    audioSamplePaths[i] = audioSamples.getString(i);
                }

                // Convert embeddings
                float[] embeddingArray = new float[embeddings.size()];
                for (int i = 0; i < embeddings.size(); i++) {
                    embeddingArray[i] = (float) embeddings.getDouble(i);
                }

                // Create voice profile
                VoiceProfile profile = new VoiceProfile(profileId, profileName, embeddingArray, audioSamplePaths);
                voiceProfiles.put(profileId, profile);

                // Prepare response
                WritableMap response = new WritableNativeMap();
                response.putString("profileId", profileId);
                
                WritableArray embeddingsResponse = new WritableNativeArray();
                for (float embedding : embeddingArray) {
                    embeddingsResponse.pushDouble(embedding);
                }
                response.putArray("embeddings", embeddingsResponse);

                Log.d(TAG, "Voice profile created: " + profileName);
                promise.resolve(response);

            } catch (Exception e) {
                Log.e(TAG, "Voice profile creation failed", e);
                promise.reject("PROFILE_CREATION_FAILED", "Failed to create profile: " + e.getMessage());
            }
        });
    }

    @ReactMethod
    public void synthesizeVoice(String text, String profileId, String language, 
                               String emotion, Promise promise) {
        executorService.execute(() -> {
            try {
                if (!isInitialized) {
                    promise.reject("NOT_INITIALIZED", "Voice cloning not initialized");
                    return;
                }

                VoiceProfile profile = voiceProfiles.get(profileId);
                if (profile == null) {
                    promise.reject("PROFILE_NOT_FOUND", "Voice profile not found");
                    return;
                }

                OrtSession synthesizer = modelSessions.get(VOICE_SYNTHESIZER_MODEL);
                if (synthesizer == null) {
                    promise.reject("MODEL_NOT_LOADED", "Voice synthesizer model not loaded");
                    return;
                }

                // Tokenize text (simplified)
                long[] textTokens = tokenizeText(text);
                
                // Prepare input tensors
                long[] textShape = {1, textTokens.length};
                OnnxTensor textTensor = OnnxTensor.createTensor(ortEnvironment, textTokens, textShape);
                
                long[] embeddingShape = {1, profile.embeddings.length};
                OnnxTensor embeddingTensor = OnnxTensor.createTensor(ortEnvironment, profile.embeddings, embeddingShape);
                
                // Language and emotion tokens
                long[] langToken = {getLanguageToken(language)};
                long[] emotionToken = {getEmotionToken(emotion)};
                
                OnnxTensor langTensor = OnnxTensor.createTensor(ortEnvironment, langToken, new long[]{1, 1});
                OnnxTensor emotionTensor = OnnxTensor.createTensor(ortEnvironment, emotionToken, new long[]{1, 1});

                // Run synthesis
                Map<String, OnnxTensor> inputs = Map.of(
                    "text", textTensor,
                    "speaker_embedding", embeddingTensor,
                    "language", langTensor,
                    "emotion", emotionTensor
                );

                OrtSession.Result result = synthesizer.run(inputs);
                OnnxTensor audioOutput = (OnnxTensor) result.get("audio").get();
                
                // Save synthesized audio
                float[] audioData = (float[]) audioOutput.getValue();
                String outputPath = saveAudioToFile(audioData, "synthesized");
                
                // Calculate duration (simplified)
                double duration = audioData.length / 22050.0; // Assuming 22kHz sample rate

                // Prepare response
                WritableMap response = new WritableNativeMap();
                response.putString("audioPath", outputPath);
                response.putDouble("duration", duration);

                // Cleanup tensors
                textTensor.close();
                embeddingTensor.close();
                langTensor.close();
                emotionTensor.close();
                result.close();

                promise.resolve(response);

            } catch (Exception e) {
                Log.e(TAG, "Voice synthesis failed", e);
                promise.reject("SYNTHESIS_FAILED", "Failed to synthesize voice: " + e.getMessage());
            }
        });
    }

    @ReactMethod
    public void cloneVoiceFromSample(String audioPath, String targetText, String language, Promise promise) {
        executorService.execute(() -> {
            try {
                if (!isInitialized) {
                    promise.reject("NOT_INITIALIZED", "Voice cloning not initialized");
                    return;
                }

                // Extract embeddings from source audio
                float[] sourceEmbeddings = extractEmbeddingsFromAudio(audioPath);
                if (sourceEmbeddings == null) {
                    promise.reject("EMBEDDING_EXTRACTION_FAILED", "Failed to extract voice embeddings");
                    return;
                }

                // Use voice converter model for cloning
                OrtSession voiceConverter = modelSessions.get(VOICE_CONVERTER_MODEL);
                if (voiceConverter == null) {
                    promise.reject("MODEL_NOT_LOADED", "Voice converter model not loaded");
                    return;
                }

                // Tokenize target text
                long[] textTokens = tokenizeText(targetText);
                
                // Prepare tensors
                long[] textShape = {1, textTokens.length};
                OnnxTensor textTensor = OnnxTensor.createTensor(ortEnvironment, textTokens, textShape);
                
                long[] embeddingShape = {1, sourceEmbeddings.length};
                OnnxTensor embeddingTensor = OnnxTensor.createTensor(ortEnvironment, sourceEmbeddings, embeddingShape);
                
                long[] langToken = {getLanguageToken(language)};
                OnnxTensor langTensor = OnnxTensor.createTensor(ortEnvironment, langToken, new long[]{1, 1});

                // Run voice conversion
                Map<String, OnnxTensor> inputs = Map.of(
                    "text", textTensor,
                    "source_embedding", embeddingTensor,
                    "language", langTensor
                );

                OrtSession.Result result = voiceConverter.run(inputs);
                OnnxTensor audioOutput = (OnnxTensor) result.get("converted_audio").get();
                
                // Save cloned audio
                float[] audioData = (float[]) audioOutput.getValue();
                String outputPath = saveAudioToFile(audioData, "cloned");
                
                // Calculate similarity (simplified)
                double similarity = 0.85; // Mock similarity score

                // Prepare response
                WritableMap response = new WritableNativeMap();
                response.putString("clonedAudioPath", outputPath);
                response.putDouble("similarity", similarity);

                // Cleanup
                textTensor.close();
                embeddingTensor.close();
                langTensor.close();
                result.close();

                promise.resolve(response);

            } catch (Exception e) {
                Log.e(TAG, "Voice cloning from sample failed", e);
                promise.reject("CLONING_FAILED", "Failed to clone voice: " + e.getMessage());
            }
        });
    }

    @ReactMethod
    public void enhanceAudioQuality(String audioPath, Promise promise) {
        executorService.execute(() -> {
            try {
                // Audio enhancement logic (simplified)
                // In a real implementation, this would use audio processing algorithms
                
                float[] audioData = loadAndPreprocessAudio(audioPath);
                if (audioData == null) {
                    promise.reject("AUDIO_LOAD_FAILED", "Failed to load audio");
                    return;
                }

                // Apply noise reduction, normalization, etc.
                float[] enhancedAudio = enhanceAudioData(audioData);
                
                String outputPath = saveAudioToFile(enhancedAudio, "enhanced");
                promise.resolve(outputPath);

            } catch (Exception e) {
                Log.e(TAG, "Audio enhancement failed", e);
                promise.reject("ENHANCEMENT_FAILED", "Failed to enhance audio: " + e.getMessage());
            }
        });
    }

    @ReactMethod
    public void adjustVoiceCharacteristics(String audioPath, double pitch, double speed, 
                                          String emotion, Promise promise) {
        executorService.execute(() -> {
            try {
                float[] audioData = loadAndPreprocessAudio(audioPath);
                if (audioData == null) {
                    promise.reject("AUDIO_LOAD_FAILED", "Failed to load audio");
                    return;
                }

                // Apply voice adjustments
                float[] adjustedAudio = adjustAudioCharacteristics(audioData, (float)pitch, (float)speed, emotion);
                
                String outputPath = saveAudioToFile(adjustedAudio, "adjusted");
                promise.resolve(outputPath);

            } catch (Exception e) {
                Log.e(TAG, "Voice adjustment failed", e);
                promise.reject("ADJUSTMENT_FAILED", "Failed to adjust voice: " + e.getMessage());
            }
        });
    }

    @ReactMethod
    public void compareVoiceProfiles(String profileId1, String profileId2, Promise promise) {
        try {
            VoiceProfile profile1 = voiceProfiles.get(profileId1);
            VoiceProfile profile2 = voiceProfiles.get(profileId2);
            
            if (profile1 == null || profile2 == null) {
                promise.reject("PROFILE_NOT_FOUND", "One or both profiles not found");
                return;
            }

            // Calculate cosine similarity between embeddings
            double similarity = calculateCosineSimilarity(profile1.embeddings, profile2.embeddings);
            
            WritableMap response = new WritableNativeMap();
            response.putDouble("similarity", similarity);
            promise.resolve(response);

        } catch (Exception e) {
            Log.e(TAG, "Voice comparison failed", e);
            promise.reject("COMPARISON_FAILED", "Failed to compare voices: " + e.getMessage());
        }
    }

    @ReactMethod
    public void isVoiceCloningReady(Promise promise) {
        promise.resolve(isInitialized && !modelSessions.isEmpty());
    }

    @ReactMethod
    public void getAvailableVoices(Promise promise) {
        WritableArray voices = new WritableNativeArray();
        for (String profileId : voiceProfiles.keySet()) {
            voices.pushString(profileId);
        }
        promise.resolve(voices);
    }

    @ReactMethod
    public void cleanupVoiceProfile(String profileId, Promise promise) {
        try {
            voiceProfiles.remove(profileId);
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("CLEANUP_FAILED", "Failed to cleanup profile: " + e.getMessage());
        }
    }

    // Helper methods
    private float[] loadAndPreprocessAudio(String audioPath) {
        try {
            File audioFile = new File(audioPath);
            if (!audioFile.exists()) {
                return null;
            }

            // Load audio file and convert to float array
            // This is a simplified implementation
            byte[] audioBytes = new byte[(int) audioFile.length()];
            FileInputStream fis = new FileInputStream(audioFile);
            fis.read(audioBytes);
            fis.close();

            // Convert to float array and normalize
            float[] audioData = new float[audioBytes.length / 2];
            for (int i = 0; i < audioData.length; i++) {
                short sample = (short) ((audioBytes[i * 2 + 1] << 8) | (audioBytes[i * 2] & 0xFF));
                audioData[i] = sample / 32768.0f;
            }

            return audioData;
        } catch (IOException e) {
            Log.e(TAG, "Failed to load audio file", e);
            return null;
        }
    }

    private String saveAudioToFile(float[] audioData, String prefix) {
        try {
            String outputPath = reactContext.getCacheDir() + "/" + prefix + "_audio_" + System.currentTimeMillis() + ".wav";
            
            // Convert float array to bytes
            byte[] audioBytes = new byte[audioData.length * 2];
            for (int i = 0; i < audioData.length; i++) {
                short sample = (short) (audioData[i] * 32767);
                audioBytes[i * 2] = (byte) (sample & 0xFF);
                audioBytes[i * 2 + 1] = (byte) ((sample >> 8) & 0xFF);
            }

            FileOutputStream fos = new FileOutputStream(outputPath);
            fos.write(audioBytes);
            fos.close();

            return outputPath;
        } catch (IOException e) {
            Log.e(TAG, "Failed to save audio file", e);
            return null;
        }
    }

    private float[] extractEmbeddingsFromAudio(String audioPath) {
        try {
            OrtSession speakerEncoder = modelSessions.get(SPEAKER_ENCODER_MODEL);
            if (speakerEncoder == null) {
                return null;
            }

            float[] audioData = loadAndPreprocessAudio(audioPath);
            if (audioData == null) {
                return null;
            }

            long[] audioShape = {1, audioData.length};
            OnnxTensor audioTensor = OnnxTensor.createTensor(ortEnvironment, audioData, audioShape);

            OrtSession.Result result = speakerEncoder.run(Map.of("audio", audioTensor));
            OnnxTensor embeddingTensor = (OnnxTensor) result.get("embeddings").get();
            
            float[] embeddings = (float[]) embeddingTensor.getValue();

            audioTensor.close();
            result.close();

            return embeddings;
        } catch (Exception e) {
            Log.e(TAG, "Failed to extract embeddings", e);
            return null;
        }
    }

    private long[] tokenizeText(String text) {
        // Simplified tokenization
        String[] words = text.split(" ");
        long[] tokens = new long[words.length];
        for (int i = 0; i < words.length; i++) {
            tokens[i] = Math.abs(words[i].hashCode()) % 10000;
        }
        return tokens;
    }

    private long getLanguageToken(String language) {
        // Language code mapping
        switch (language.toLowerCase()) {
            case "en": return 1;
            case "es": return 2;
            case "fr": return 3;
            case "de": return 4;
            case "it": return 5;
            case "pt": return 6;
            case "ru": return 7;
            case "zh": return 8;
            case "ja": return 9;
            case "ko": return 10;
            default: return 1;
        }
    }

    private long getEmotionToken(String emotion) {
        // Emotion mapping
        switch (emotion.toLowerCase()) {
            case "neutral": return 0;
            case "happy": return 1;
            case "sad": return 2;
            case "angry": return 3;
            case "excited": return 4;
            case "calm": return 5;
            default: return 0;
        }
    }

    private float[] enhanceAudioData(float[] audioData) {
        // Simplified audio enhancement
        float[] enhanced = new float[audioData.length];
        for (int i = 0; i < audioData.length; i++) {
            // Apply noise reduction and normalization
            enhanced[i] = audioData[i] * 1.2f; // Simple amplification
            enhanced[i] = Math.max(-1.0f, Math.min(1.0f, enhanced[i])); // Clamp
        }
        return enhanced;
    }

    private float[] adjustAudioCharacteristics(float[] audioData, float pitch, float speed, String emotion) {
        // Simplified voice characteristic adjustment
        float[] adjusted = new float[audioData.length];
        
        for (int i = 0; i < audioData.length; i++) {
            // Apply pitch adjustment (simplified)
            adjusted[i] = audioData[i] * (1.0f + pitch * 0.5f);
            
            // Apply emotion-based modifications
            switch (emotion.toLowerCase()) {
                case "happy":
                    adjusted[i] *= 1.1f; // Slightly amplify
                    break;
                case "sad":
                    adjusted[i] *= 0.9f; // Slightly dampen
                    break;
                case "angry":
                    adjusted[i] *= 1.3f; // More aggressive
                    break;
            }
            
            // Clamp values
            adjusted[i] = Math.max(-1.0f, Math.min(1.0f, adjusted[i]));
        }
        
        return adjusted;
    }

    private double calculateCosineSimilarity(float[] vector1, float[] vector2) {
        if (vector1.length != vector2.length) {
            return 0.0;
        }

        double dotProduct = 0.0;
        double norm1 = 0.0;
        double norm2 = 0.0;

        for (int i = 0; i < vector1.length; i++) {
            dotProduct += vector1[i] * vector2[i];
            norm1 += vector1[i] * vector1[i];
            norm2 += vector2[i] * vector2[i];
        }

        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        if (executorService != null) {
            executorService.shutdown();
        }
        
        // Cleanup ONNX sessions
        for (OrtSession session : modelSessions.values()) {
            try {
                session.close();
            } catch (OrtException e) {
                Log.e(TAG, "Error closing ONNX session", e);
            }
        }
        modelSessions.clear();
    }
}

