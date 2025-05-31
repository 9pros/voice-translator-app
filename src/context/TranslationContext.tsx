import React, {createContext, useContext, useReducer, ReactNode} from 'react';
import {Language, TranslationConfig, TranslationResult} from '../types';

interface TranslationState {
  sourceLanguage: Language;
  targetLanguage: Language;
  isTranslating: boolean;
  translationHistory: TranslationResult[];
  realTimeMode: boolean;
  useVoiceProfile: boolean;
}

type TranslationAction =
  | {type: 'SET_SOURCE_LANGUAGE'; payload: Language}
  | {type: 'SET_TARGET_LANGUAGE'; payload: Language}
  | {type: 'SET_TRANSLATING'; payload: boolean}
  | {type: 'ADD_TRANSLATION'; payload: TranslationResult}
  | {type: 'TOGGLE_REAL_TIME_MODE'}
  | {type: 'TOGGLE_VOICE_PROFILE'}
  | {type: 'CLEAR_HISTORY'};

const initialState: TranslationState = {
  sourceLanguage: {code: 'en', name: 'English', flag: '🇺🇸'},
  targetLanguage: {code: 'es', name: 'Spanish', flag: '🇪🇸'},
  isTranslating: false,
  translationHistory: [],
  realTimeMode: true,
  useVoiceProfile: false,
};

const translationReducer = (
  state: TranslationState,
  action: TranslationAction,
): TranslationState => {
  switch (action.type) {
    case 'SET_SOURCE_LANGUAGE':
      return {...state, sourceLanguage: action.payload};
    case 'SET_TARGET_LANGUAGE':
      return {...state, targetLanguage: action.payload};
    case 'SET_TRANSLATING':
      return {...state, isTranslating: action.payload};
    case 'ADD_TRANSLATION':
      return {
        ...state,
        translationHistory: [action.payload, ...state.translationHistory],
      };
    case 'TOGGLE_REAL_TIME_MODE':
      return {...state, realTimeMode: !state.realTimeMode};
    case 'TOGGLE_VOICE_PROFILE':
      return {...state, useVoiceProfile: !state.useVoiceProfile};
    case 'CLEAR_HISTORY':
      return {...state, translationHistory: []};
    default:
      return state;
  }
};

interface TranslationContextType {
  state: TranslationState;
  setSourceLanguage: (language: Language) => void;
  setTargetLanguage: (language: Language) => void;
  setTranslating: (isTranslating: boolean) => void;
  addTranslation: (translation: TranslationResult) => void;
  toggleRealTimeMode: () => void;
  toggleVoiceProfile: () => void;
  clearHistory: () => void;
  swapLanguages: () => void;
}

const TranslationContext = createContext<TranslationContextType | undefined>(
  undefined,
);

export const TranslationProvider: React.FC<{children: ReactNode}> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(translationReducer, initialState);

  const setSourceLanguage = (language: Language) => {
    dispatch({type: 'SET_SOURCE_LANGUAGE', payload: language});
  };

  const setTargetLanguage = (language: Language) => {
    dispatch({type: 'SET_TARGET_LANGUAGE', payload: language});
  };

  const setTranslating = (isTranslating: boolean) => {
    dispatch({type: 'SET_TRANSLATING', payload: isTranslating});
  };

  const addTranslation = (translation: TranslationResult) => {
    dispatch({type: 'ADD_TRANSLATION', payload: translation});
  };

  const toggleRealTimeMode = () => {
    dispatch({type: 'TOGGLE_REAL_TIME_MODE'});
  };

  const toggleVoiceProfile = () => {
    dispatch({type: 'TOGGLE_VOICE_PROFILE'});
  };

  const clearHistory = () => {
    dispatch({type: 'CLEAR_HISTORY'});
  };

  const swapLanguages = () => {
    const temp = state.sourceLanguage;
    setSourceLanguage(state.targetLanguage);
    setTargetLanguage(temp);
  };

  return (
    <TranslationContext.Provider
      value={{
        state,
        setSourceLanguage,
        setTargetLanguage,
        setTranslating,
        addTranslation,
        toggleRealTimeMode,
        toggleVoiceProfile,
        clearHistory,
        swapLanguages,
      }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

