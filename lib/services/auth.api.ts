import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { LoginRequest, LoginResponse, DecodedToken } from '../types/auth';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const isDev = __DEV__;
const LAN_IP = '192.168.1.38';

const DEV_HTTP_PORT = 5256;
const DEV_HTTPS_PORT = 7120;

// const API_BASE_URL = 'https://192.168.1.38:7120/api'; // CHANGE THIS
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const AUTH_SESSION_KEY = '@van_sales_session';

export async function onlineLogin(
  credentials: LoginRequest
): Promise<LoginResponse> {

  console.log('API_BASE_URL:', API_BASE_URL);

  try {
    const response = await fetch(`${API_BASE_URL}/Account/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    console.log('LOGIN STATUS:', response.status);

    // Read body ONCE
    const text = await response.text();
    console.log('LOGIN RAW RESPONSE:', text);

    if (!response.ok) {
      throw new Error(text || 'Invalid username or password');
    }

    const data: LoginResponse = JSON.parse(text);

    // 🔐 Decode JWT
    const decoded = jwtDecode<DecodedToken>(data.token);
    const expiresAt = decoded.exp ? decoded.exp * 1000 : Date.now() + 3600 * 1000; // fallback 1 hour
    const issuedAt = decoded.iat ? decoded.iat * 1000 : Date.now();

        

    // 💾 Store session
    const session: LoginResponse = {
      ...data,
      expiresAt,
      issuedAt,
    };

    await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));

    return session;


  } catch (error: any) {
    console.log('LOGIN ERROR:', error);

    alert(
      'Login error: ' +
      (error?.message ?? 'Unknown error')
    );

    throw error; // IMPORTANT: propagate error
  }
}

export async function getAuthToken(): Promise<string | null> {
  try {
    const session = await AsyncStorage.getItem(AUTH_SESSION_KEY);
    if (!session) return null;

    const parsed = JSON.parse(session);
    return parsed.token ?? null;
  } catch (error) {
    console.log('Error reading auth token:', error);
    return null;
  }
}

export async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    const token = await getAuthToken();
    if (!token) return { 'Content-Type': 'application/json' };

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  } catch (error) {
    console.log('Error building auth headers:', error);
    return { 'Content-Type': 'application/json' };
  }
}

export async function getLoggedInUserName(): Promise<string> {
  try {
    const session = await AsyncStorage.getItem(AUTH_SESSION_KEY);
    if (!session) return 'system';

    const parsed = JSON.parse(session);
    return parsed.userName ?? 'system';
  } catch (error) {
    console.log('Error reading username:', error);
    return 'system';
  }
}