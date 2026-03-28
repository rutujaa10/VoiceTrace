/**
 * VoiceTrace — State Management
 *
 * Using React Context + useReducer for lightweight global state.
 * Justified for hackathon: no Redux overhead, simple action dispatch.
 */

import { createContext, useContext, useReducer, useCallback } from 'react';

const AppContext = createContext(null);

const initialState = {
  vendor: null,
  vendorId: localStorage.getItem('voicetrace_vendorId') || null,
  dashboard: null,
  todayEntry: null,
  insights: [],
  loanScore: null,
  isLoading: false,
  error: null,
  sidebarOpen: false,
  isRecording: false,
};

const actionTypes = {
  SET_VENDOR: 'SET_VENDOR',
  SET_VENDOR_ID: 'SET_VENDOR_ID',
  SET_DASHBOARD: 'SET_DASHBOARD',
  SET_TODAY_ENTRY: 'SET_TODAY_ENTRY',
  SET_INSIGHTS: 'SET_INSIGHTS',
  SET_LOAN_SCORE: 'SET_LOAN_SCORE',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  SET_RECORDING: 'SET_RECORDING',
  LOGOUT: 'LOGOUT',
};

const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_VENDOR:
      return { ...state, vendor: action.payload };
    case actionTypes.SET_VENDOR_ID:
      localStorage.setItem('voicetrace_vendorId', action.payload);
      return { ...state, vendorId: action.payload };
    case actionTypes.SET_DASHBOARD:
      return { ...state, dashboard: action.payload };
    case actionTypes.SET_TODAY_ENTRY:
      return { ...state, todayEntry: action.payload };
    case actionTypes.SET_INSIGHTS:
      return { ...state, insights: action.payload };
    case actionTypes.SET_LOAN_SCORE:
      return { ...state, loanScore: action.payload };
    case actionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case actionTypes.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };
    case actionTypes.CLEAR_ERROR:
      return { ...state, error: null };
    case actionTypes.TOGGLE_SIDEBAR:
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case actionTypes.SET_RECORDING:
      return { ...state, isRecording: action.payload };
    case actionTypes.LOGOUT:
      localStorage.removeItem('voicetrace_vendorId');
      return { ...initialState, vendorId: null };
    default:
      return state;
  }
};

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch, actionTypes }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { actionTypes };
