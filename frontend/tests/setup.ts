import { vi } from 'vitest';

// テスト環境でのFirebase設定をモック
vi.stubEnv('FIREBASE_API_KEY', 'test-api-key');
vi.stubEnv('FIREBASE_AUTH_DOMAIN', 'test-project.firebaseapp.com');
vi.stubEnv('FIREBASE_PROJECT_ID', 'test-project');
vi.stubEnv('FIREBASE_STORAGE_BUCKET', 'test-project.appspot.com');
vi.stubEnv('FIREBASE_MESSAGING_SENDER_ID', '123456789');
vi.stubEnv('FIREBASE_APP_ID', '1:123456789:web:abcdef');

// Firebase全体をモック
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({}))
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    onAuthStateChanged: vi.fn()
  })),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn()
}));

// Nuxtプラグインをモック
vi.mock('~/plugins/firebase.client.ts', () => ({
  default: vi.fn()
}));

// 認証ミドルウェアをモック
vi.mock('~/middleware/requireAuth.ts', () => ({
  default: vi.fn()
}));