import React, {createContext, useContext, useReducer, ReactNode} from 'react';
import {VoiceProfile} from '../types';

interface VoiceProfileState {
  profiles: VoiceProfile[];
  activeProfile: VoiceProfile | null;
  isRecording: boolean;
  isTraining: boolean;
}

type VoiceProfileAction =
  | {type: 'ADD_PROFILE'; payload: VoiceProfile}
  | {type: 'UPDATE_PROFILE'; payload: VoiceProfile}
  | {type: 'DELETE_PROFILE'; payload: string}
  | {type: 'SET_ACTIVE_PROFILE'; payload: VoiceProfile | null}
  | {type: 'SET_RECORDING'; payload: boolean}
  | {type: 'SET_TRAINING'; payload: boolean}
  | {type: 'LOAD_PROFILES'; payload: VoiceProfile[]};

const initialState: VoiceProfileState = {
  profiles: [],
  activeProfile: null,
  isRecording: false,
  isTraining: false,
};

const voiceProfileReducer = (
  state: VoiceProfileState,
  action: VoiceProfileAction,
): VoiceProfileState => {
  switch (action.type) {
    case 'ADD_PROFILE':
      return {
        ...state,
        profiles: [...state.profiles, action.payload],
      };
    case 'UPDATE_PROFILE':
      return {
        ...state,
        profiles: state.profiles.map(profile =>
          profile.id === action.payload.id ? action.payload : profile,
        ),
        activeProfile:
          state.activeProfile?.id === action.payload.id
            ? action.payload
            : state.activeProfile,
      };
    case 'DELETE_PROFILE':
      return {
        ...state,
        profiles: state.profiles.filter(profile => profile.id !== action.payload),
        activeProfile:
          state.activeProfile?.id === action.payload ? null : state.activeProfile,
      };
    case 'SET_ACTIVE_PROFILE':
      return {
        ...state,
        activeProfile: action.payload,
      };
    case 'SET_RECORDING':
      return {
        ...state,
        isRecording: action.payload,
      };
    case 'SET_TRAINING':
      return {
        ...state,
        isTraining: action.payload,
      };
    case 'LOAD_PROFILES':
      return {
        ...state,
        profiles: action.payload,
      };
    default:
      return state;
  }
};

interface VoiceProfileContextType {
  state: VoiceProfileState;
  addProfile: (profile: VoiceProfile) => void;
  updateProfile: (profile: VoiceProfile) => void;
  deleteProfile: (profileId: string) => void;
  setActiveProfile: (profile: VoiceProfile | null) => void;
  setRecording: (isRecording: boolean) => void;
  setTraining: (isTraining: boolean) => void;
  loadProfiles: (profiles: VoiceProfile[]) => void;
}

const VoiceProfileContext = createContext<VoiceProfileContextType | undefined>(
  undefined,
);

export const VoiceProfileProvider: React.FC<{children: ReactNode}> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(voiceProfileReducer, initialState);

  const addProfile = (profile: VoiceProfile) => {
    dispatch({type: 'ADD_PROFILE', payload: profile});
  };

  const updateProfile = (profile: VoiceProfile) => {
    dispatch({type: 'UPDATE_PROFILE', payload: profile});
  };

  const deleteProfile = (profileId: string) => {
    dispatch({type: 'DELETE_PROFILE', payload: profileId});
  };

  const setActiveProfile = (profile: VoiceProfile | null) => {
    dispatch({type: 'SET_ACTIVE_PROFILE', payload: profile});
  };

  const setRecording = (isRecording: boolean) => {
    dispatch({type: 'SET_RECORDING', payload: isRecording});
  };

  const setTraining = (isTraining: boolean) => {
    dispatch({type: 'SET_TRAINING', payload: isTraining});
  };

  const loadProfiles = (profiles: VoiceProfile[]) => {
    dispatch({type: 'LOAD_PROFILES', payload: profiles});
  };

  return (
    <VoiceProfileContext.Provider
      value={{
        state,
        addProfile,
        updateProfile,
        deleteProfile,
        setActiveProfile,
        setRecording,
        setTraining,
        loadProfiles,
      }}>
      {children}
    </VoiceProfileContext.Provider>
  );
};

export const useVoiceProfile = () => {
  const context = useContext(VoiceProfileContext);
  if (context === undefined) {
    throw new Error('useVoiceProfile must be used within a VoiceProfileProvider');
  }
  return context;
};

