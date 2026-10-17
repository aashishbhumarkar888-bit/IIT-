import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  createSignedToken as createStatelessSignedToken,
  verifySignedToken as verifyStatelessSignedToken,
} from './serverSession';
import {
  CropToCashService,
  ExtendedCropLotRecord,
  getExtendedLot,
  saveExtendedLot,
  getAllExtendedLots,
} from './src/services/cropToCashService';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT must be a valid TCP port between 1 and 65535.');
}
const configuredSessionSecret = process.env.KISAN_SESSION_SECRET;
if (
  process.env.NODE_ENV === 'production' &&
  (!configuredSessionSecret ||
    configuredSessionSecret.length < 32 ||
    configuredSessionSecret.includes('REPLACE_WITH'))
) {
  throw new Error(
    'KISAN_SESSION_SECRET must be configured with at least 32 characters in production.'
  );
}
const SESSION_SECRET =
  configuredSessionSecret || crypto.randomBytes(32).toString('hex');

export type ServerUserRole = 'farmer' | 'agent' | 'buyer' | 'admin';
export type ServerOnboardingStatus = 'INCOMPLETE' | 'COMPLETED' | 'SKIPPED';

interface ServerCropLotRecord {
  id: string;
  shortCode: string;
  farmerId: string;
  farmerName: string;
  farmerNameHi: string;
  cropName: string;
  cropNameHi: string;
  variety: string;
  varietyHi: string;
  grade: string;
  quantityQuintals: number;
  harvestDate: string;
  plotAreaHectares: number;
  surveyNumber: string;
  verificationStatus:
    | 'INDEPENDENTLY_VERIFIED'
    | 'LABORATORY_TESTED'
    | 'DOCUMENT_VERIFIED'
    | 'FARMER_DECLARED'
    | 'VERIFICATION_PENDING';
  evidenceIds: string[];
  evidence: {
    id: string;
    labName: string;
    certificateNumber: string;
    testedDate: string;
    mrlStatus: 'ZERO_EXCEEDANCE' | 'PENDING_LAB' | 'SELF_DECLARED';
    sha256Hash: string;
    moisturePercent: number;
    foreignMatterPercent: number;
  };
  mandiPricePerQuintal: number;
  directBuyerPricePerQuintal: number;
}

interface ServerUserRecord {
  id: string;
  email: string;
  name: string;
  nameHi: string;
  role: ServerUserRole;
  villageOrOrg: string;
  village: string;
  district: string;
  state: string;
  phoneNumber: string;
  preferredLanguage: 'en' | 'hi';
  onboardingStatus: ServerOnboardingStatus;
  onboardingStep: number;
  profileCompletion: number;
  isDemoAccount: boolean;
  demoDatasetVersion: string;
  uidLabel: string;
  passwordSalt: string;
  passwordHash: string;
  emailVerified: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  target: string;
  reason: string;
  status: 'SUCCESS' | 'DENIED' | 'WARNING';
}

function hashPassword(
  password: string,
  salt?: string
): { salt: string; hash: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { salt: actualSalt, hash: derived };
}

function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string
): boolean {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(derived, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

const isDevDemoMode = !process.env.ADMIN_PASSWORD_HASH;

const usersMap = new Map<string, ServerUserRecord>();
// Isolated per-user crop lots store keyed by lowercase user email
const userCropLotsMap = new Map<string, ServerCropLotRecord[]>();

function seedUser(params: {
  id: string;
  email: string;
  plainKeyForDevSeed: string;
  name: string;
  nameHi: string;
  role: ServerUserRole;
  villageOrOrg: string;
  village: string;
  district: string;
  state: string;
  phoneNumber?: string;
  preferredLanguage?: 'en' | 'hi';
  onboardingStatus: ServerOnboardingStatus;
  onboardingStep: number;
  profileCompletion: number;
  isDemoAccount: boolean;
  demoDatasetVersion?: string;
  uidLabel: string;
  initialLots?: ServerCropLotRecord[];
}) {
  const { salt, hash } = hashPassword(params.plainKeyForDevSeed);
  const normalizedEmail = params.email.toLowerCase();
  usersMap.set(normalizedEmail, {
    id: params.id,
    email: normalizedEmail,
    name: params.name,
    nameHi: params.nameHi,
    role: params.role,
    villageOrOrg: params.villageOrOrg,
    village: params.village,
    district: params.district,
    state: params.state,
    phoneNumber: params.phoneNumber || '',
    preferredLanguage: params.preferredLanguage || 'en',
    onboardingStatus: params.onboardingStatus,
    onboardingStep: params.onboardingStep,
    profileCompletion: params.profileCompletion,
    isDemoAccount: params.isDemoAccount,
    demoDatasetVersion: params.demoDatasetVersion || '',
    uidLabel: params.uidLabel,
    passwordSalt: salt,
    passwordHash: hash,
    emailVerified: true,
    active: true,
    createdAt: '2026-10-01 09:00 IST',
    updatedAt: '2026-10-17 05:30 IST',
    lastLoginAt: '2026-10-17 05:30 IST',
  });
  userCropLotsMap.set(normalizedEmail, params.initialLots || []);
}

const devKeyPrefix = 'Kisan@';

// EXPERIENCE B: Dedicated Seeded Demo Farmer Account (Ramesh Patel)
seedUser({
  id: 'USR-DEMO-FARMER',
  email: 'ramesh.patel@kisan-spo.in',
  plainKeyForDevSeed: `${devKeyPrefix}2026`,
  name: 'Ramesh Patel',
  nameHi: 'रमेश पटेल',
  role: 'farmer',
  villageOrOrg: 'Chhaigaon Makhan, Khandwa, Madhya Pradesh',
  village: 'Chhaigaon Makhan',
  district: 'Khandwa',
  state: 'Madhya Pradesh',
  phoneNumber: '+91 98260-41109',
  preferredLanguage: 'en',
  onboardingStatus: 'COMPLETED',
  onboardingStep: 4,
  profileCompletion: 100,
  isDemoAccount: true,
  demoDatasetVersion: 'v2.4-demo',
  uidLabel: 'DEMO-UID-9482',
});

// EXPERIENCE C: Returning Authenticated Non-Demo User (Suresh Kumar — has 1 saved personal Soybean lot)
seedUser({
  id: 'USR-RETURNING-FARMER',
  email: 'suresh.kumar@kisan-spo.in',
  plainKeyForDevSeed: `${devKeyPrefix}2026`,
  name: 'Suresh Kumar',
  nameHi: 'सुरेश कुमार',
  role: 'farmer',
  villageOrOrg: 'Deshgaon, Khandwa, Madhya Pradesh',
  village: 'Deshgaon',
  district: 'Khandwa',
  state: 'Madhya Pradesh',
  phoneNumber: '+91 94251-88124',
  preferredLanguage: 'en',
  onboardingStatus: 'COMPLETED',
  onboardingStep: 4,
  profileCompletion: 100,
  isDemoAccount: false,
  demoDatasetVersion: '',
  uidLabel: 'UID-0124',
  initialLots: [
    {
      id: 'KS-2025-0124',
      shortCode: '#KS-0124',
      farmerId: 'USR-RETURNING-FARMER',
      farmerName: 'Suresh Kumar',
      farmerNameHi: 'सुरेश कुमार',
      cropName: 'Soybean',
      cropNameHi: 'सोयाबीन',
      variety: 'JS-2034 High Oil',
      varietyHi: 'जेएस-2034 सोयाबीन',
      grade: 'FAQ Grade A',
      quantityQuintals: 25,
      harvestDate: '17 Oct 2026',
      plotAreaHectares: 1.85,
      surveyNumber: 'Survey No. 88/1B',
      verificationStatus: 'DOCUMENT_VERIFIED',
      evidenceIds: ['EV-AGRISTACK-2026-88'],
      evidence: {
        id: 'EV-AGRISTACK-2026-88',
        labName: 'Khandwa Mandi Quality Desk',
        certificateNumber: 'DOC-MP-88-2026',
        testedDate: '16 Oct 2026',
        mrlStatus: 'PENDING_LAB',
        sha256Hash:
          '3b71d9f02c88e1a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8',
        moisturePercent: 11.4,
        foreignMatterPercent: 1.2,
      },
      mandiPricePerQuintal: 1820,
      directBuyerPricePerQuintal: 2150,
    },
  ],
});

// EXPERIENCE A: Fresh New User Account for Isolation Testing (Anita Verma — incomplete onboarding, 0 crops)
seedUser({
  id: 'USR-NEW-FARMER',
  email: 'anita.verma@kisan-spo.in',
  plainKeyForDevSeed: `${devKeyPrefix}2026`,
  name: 'Anita Verma',
  nameHi: 'अनीता वर्मा',
  role: 'farmer',
  villageOrOrg: 'Unassigned Workspace',
  village: '',
  district: '',
  state: '',
  phoneNumber: '',
  preferredLanguage: 'en',
  onboardingStatus: 'INCOMPLETE',
  onboardingStep: 1,
  profileCompletion: 25,
  isDemoAccount: false,
  demoDatasetVersion: '',
  uidLabel: 'UID-3041',
  initialLots: [],
});

// Seeded Demo Village Agent Account
seedUser({
  id: 'USR-DEMO-AGENT',
  email: 'agent.khandwa@kisan-spo.in',
  plainKeyForDevSeed: `${devKeyPrefix}2026`,
  name: 'Dr. S. R. Raman (Agent #402)',
  nameHi: 'डॉ. एस. आर. रमन (आढ़तिया साथी)',
  role: 'agent',
  villageOrOrg: 'APMC Khandwa Central Hub',
  village: 'Khandwa Hub',
  district: 'Khandwa',
  state: 'Madhya Pradesh',
  phoneNumber: '+91 98930-40200',
  preferredLanguage: 'en',
  onboardingStatus: 'COMPLETED',
  onboardingStep: 4,
  profileCompletion: 100,
  isDemoAccount: true,
  demoDatasetVersion: 'v2.4-demo',
  uidLabel: 'DEMO-AGENT-402',
});

// Seeded Demo Institutional Buyer Account
seedUser({
  id: 'USR-DEMO-BUYER',
  email: 'procurement@itc-agri.in',
  plainKeyForDevSeed: `${devKeyPrefix}2026`,
  name: 'ITC Agri Procurement Desk',
  nameHi: 'आईटीसी एग्री खरीद डेस्क',
  role: 'buyer',
  villageOrOrg: 'Indore Processing Mill Hub',
  village: 'Sanwer Industrial Area',
  district: 'Indore',
  state: 'Madhya Pradesh',
  phoneNumber: '+91 731-4029910',
  preferredLanguage: 'en',
  onboardingStatus: 'COMPLETED',
  onboardingStep: 4,
  profileCompletion: 100,
  isDemoAccount: true,
  demoDatasetVersion: 'v2.4-demo',
  uidLabel: 'DEMO-CORP-ITC',
});

// Dedicated Administrator Account
seedUser({
  id: 'USR-ADMIN-01',
  email: (process.env.ADMIN_EMAIL || 'registrar.admin@kisan-spo.org.in').toLowerCase(),
  plainKeyForDevSeed: `${devKeyPrefix}Admin#2026`,
  name: 'Chief Mandi Registrar (Admin)',
  nameHi: 'मुख्य मंडी रजिस्ट्रार (प्रशासक)',
  role: 'admin',
  villageOrOrg: 'MP State AgriStack Directorate',
  village: 'Bhopal Directorate',
  district: 'Bhopal',
  state: 'Madhya Pradesh',
  phoneNumber: '+91 755-2550104',
  preferredLanguage: 'en',
  onboardingStatus: 'COMPLETED',
  onboardingStep: 4,
  profileCompletion: 100,
  isDemoAccount: false,
  demoDatasetVersion: '',
  uidLabel: 'REGISTRAR-01',
});

const auditLogs: AuditLogEntry[] = [
  {
    id: 'AUD-1001',
    timestamp: '17 Oct 2026, 05:15 IST',
    actorEmail: 'registrar.admin@kisan-spo.org.in',
    actorRole: 'admin',
    action: 'VERIFY_LOT_CREDENTIAL',
    target: 'Lot #KS-MP-2025-089 (Ramesh Patel)',
    reason: 'NABL Certificate #NABL-Q-99-2026 confirmed Zero MRL Exceedance.',
    status: 'SUCCESS',
  },
  {
    id: 'AUD-1002',
    timestamp: '17 Oct 2026, 05:22 IST',
    actorEmail: 'agent.khandwa@kisan-spo.in',
    actorRole: 'agent',
    action: 'WEIGHBRIDGE_TARE_LOCK',
    target: 'Token #A-14 • Vehicle MP-12-GA-4482',
    reason: 'RS232 Terminal 104 verified 2,500.0 Kg net payable weight.',
    status: 'SUCCESS',
  },
  {
    id: 'AUD-1003',
    timestamp: '17 Oct 2026, 05:40 IST',
    actorEmail: 'ramesh.patel@kisan-spo.in',
    actorRole: 'farmer',
    action: 'PHI_CHEMICAL_BLOCK_TRIGGERED',
    target: 'Field Specimen #0942 (8 Days to Harvest)',
    reason:
      'Statutory Pre-Harvest Interval blocked synthetic fungicide application.',
    status: 'WARNING',
  },
];

let serverLotStatusOverrides: Record<
  string,
  { status: string; updatedBy: string; reason: string; updatedAt: string }
> = {};

function createSignedToken(email: string): string {
  return createStatelessSignedToken(email, SESSION_SECRET);
}

function verifySignedToken(rawToken?: string): ServerUserRecord | null {
  const claims = verifyStatelessSignedToken(rawToken, SESSION_SECRET);
  if (!claims) return null;
  const user = usersMap.get(claims.email.toLowerCase());
  if (!user || !user.active) return null;
  return user;
}

function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return undefined;
}

function sanitizeUser(u: ServerUserRecord) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    nameHi: u.nameHi,
    role: u.role,
    villageOrOrg: u.villageOrOrg,
    village: u.village,
    district: u.district,
    state: u.state,
    phoneNumber: u.phoneNumber,
    preferredLanguage: u.preferredLanguage,
    onboardingStatus: u.onboardingStatus,
    onboardingStep: u.onboardingStep,
    profileCompletion: u.profileCompletion,
    isDemoAccount: u.isDemoAccount,
    demoDatasetVersion: u.demoDatasetVersion,
    uidLabel: u.uidLabel,
    emailVerified: u.emailVerified,
    active: u.active,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    lastLoginAt: u.lastLoginAt,
  };
}

function recordAudit(
  actorEmail: string,
  actorRole: string,
  action: string,
  target: string,
  reason: string,
  status: 'SUCCESS' | 'DENIED' | 'WARNING' = 'SUCCESS'
) {
  auditLogs.unshift({
    id: `AUD-${1000 + auditLogs.length + 1}`,
    timestamp: new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
    actorEmail,
    actorRole,
    action,
    target,
    reason,
    status,
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use('/api', (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  });

  // 1. Check current session
  app.get('/api/auth/session', (req: Request, res: Response) => {
    const token = extractToken(req);
    const user = verifySignedToken(token);
    if (!user) {
      res.status(401).json({
        authenticated: false,
        devDemoMode: isDevDemoMode,
      });
      return;
    }
    res.json({
      authenticated: true,
      user: sanitizeUser(user),
      personalLots: userCropLotsMap.get(user.email) || [],
      devDemoMode: isDevDemoMode,
      lotStatusOverrides: serverLotStatusOverrides,
    });
  });

  // 1b. Synchronize Firebase Google Sign-In session with Server RBAC
  app.post('/api/auth/firebase-sync', (req: Request, res: Response) => {
    const {
      uid,
      email,
      displayName,
      role,
      villageOrOrg,
      village,
      district,
      state,
      phoneNumber,
      preferredLanguage,
      onboardingStatus,
      onboardingStep,
      profileCompletion,
      emailVerified,
    } = req.body || {};

    if (!uid || !email || typeof email !== 'string') {
      res.status(400).json({
        error: 'Valid Firebase UID and email are required for session sync.',
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isBootstrappedAdmin =
      Boolean(emailVerified) &&
      normalizedEmail === 'aashishbhumarkar888@gmail.com';

    let user = usersMap.get(normalizedEmail);
    const safeRole: ServerUserRole = isBootstrappedAdmin
      ? 'admin'
      : role === 'agent' || role === 'buyer'
      ? role
      : 'farmer';

    if (!user) {
      const { salt, hash } = hashPassword(
        crypto.randomBytes(24).toString('hex')
      );
      user = {
        id: String(uid).slice(0, 28),
        email: normalizedEmail,
        name: String(displayName || normalizedEmail.split('@')[0]).trim(),
        nameHi: String(displayName || normalizedEmail.split('@')[0]).trim(),
        role: safeRole,
        villageOrOrg: String(villageOrOrg || 'Unassigned Workspace').trim(),
        village: String(village || '').trim(),
        district: String(district || '').trim(),
        state: String(state || '').trim(),
        phoneNumber: String(phoneNumber || '').trim(),
        preferredLanguage: preferredLanguage === 'hi' ? 'hi' : 'en',
        onboardingStatus:
          onboardingStatus === 'COMPLETED' || onboardingStatus === 'SKIPPED'
            ? onboardingStatus
            : isBootstrappedAdmin
            ? 'COMPLETED'
            : 'INCOMPLETE',
        onboardingStep:
          typeof onboardingStep === 'number'
            ? Math.max(1, Math.min(4, onboardingStep))
            : isBootstrappedAdmin
            ? 4
            : 1,
        profileCompletion:
          typeof profileCompletion === 'number'
            ? Math.max(0, Math.min(100, profileCompletion))
            : isBootstrappedAdmin
            ? 100
            : 25,
        isDemoAccount: false,
        demoDatasetVersion: '',
        uidLabel: `FB-${String(uid).slice(0, 6).toUpperCase()}`,
        passwordSalt: salt,
        passwordHash: hash,
        emailVerified: Boolean(emailVerified),
        active: true,
        createdAt: 'Just now (Firebase Auth)',
        updatedAt: 'Just now',
        lastLoginAt: 'Just now',
      };
      usersMap.set(normalizedEmail, user);
      if (!userCropLotsMap.has(normalizedEmail)) {
        userCropLotsMap.set(normalizedEmail, []);
      }
    } else {
      user.lastLoginAt = 'Just now';
      user.emailVerified = Boolean(emailVerified) || user.emailVerified;
      if (isBootstrappedAdmin) {
        user.role = 'admin';
      }
      if (
        onboardingStatus === 'COMPLETED' ||
        onboardingStatus === 'SKIPPED' ||
        onboardingStatus === 'INCOMPLETE'
      ) {
        user.onboardingStatus = onboardingStatus;
      }
      if (typeof onboardingStep === 'number') {
        user.onboardingStep = Math.max(1, Math.min(4, onboardingStep));
      }
      if (typeof profileCompletion === 'number') {
        user.profileCompletion = Math.max(0, Math.min(100, profileCompletion));
      }
    }

    if (!user.active) {
      res.status(403).json({
        error:
          'This account has been deactivated by the Mandi Administrator.',
      });
      return;
    }

    const token = createSignedToken(user.email);
    recordAudit(
      user.email,
      user.role,
      'FIREBASE_GOOGLE_LOGIN',
      `UID: ${String(uid).slice(0, 12)}`,
      'Authenticated via Google Sign-In with Firebase Auth & Firestore.',
      'SUCCESS'
    );

    res.json({
      token,
      user: sanitizeUser(user),
      personalLots: userCropLotsMap.get(user.email) || [],
      devDemoMode: isDevDemoMode,
    });
  });

  // 2. Standard Login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body || {};
    if (
      !email ||
      !password ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      res.status(400).json({
        error: 'Please enter both your registered email address and password.',
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = usersMap.get(normalizedEmail);
    if (
      !user ||
      !verifyPassword(password, user.passwordSalt, user.passwordHash)
    ) {
      recordAudit(
        normalizedEmail,
        'unauthenticated',
        'LOGIN_FAILED',
        'Auth Gate',
        'Invalid email or password submitted.',
        'DENIED'
      );
      res.status(401).json({
        error:
          'Invalid email or password. Please check your credentials or use a configured demonstration account.',
      });
      return;
    }

    if (!user.active) {
      res.status(403).json({
        error:
          'This account has been deactivated by the Mandi Administrator. Contact FPO desk.',
      });
      return;
    }

    user.lastLoginAt = 'Just now';
    const token = createSignedToken(user.email);
    recordAudit(
      user.email,
      user.role,
      'USER_LOGIN',
      `Role: ${user.role}`,
      'Authenticated session established via server token.',
      'SUCCESS'
    );

    res.json({
      token,
      user: sanitizeUser(user),
      personalLots: userCropLotsMap.get(user.email) || [],
      devDemoMode: isDevDemoMode,
    });
  });

  // 3. User Registration (Creates Individual Profile with Incomplete Onboarding & Empty Personal Workspace)
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { email, password, name, role, villageOrOrg } = req.body || {};
    if (!email || !password || !name) {
      res.status(400).json({
        error: 'Full name, email address, and password are required.',
      });
      return;
    }

    if (String(password).length < 6) {
      res.status(400).json({
        error: 'Password must be at least 6 characters long.',
      });
      return;
    }

    if (role === 'admin') {
      recordAudit(
        String(email),
        'unauthenticated',
        'PRIVILEGE_ESCALATION_BLOCKED',
        'Registration Endpoint',
        'Attempted to self-assign admin role during public signup.',
        'DENIED'
      );
      res.status(403).json({
        error:
          'Security Violation: Administrator privileges cannot be self-assigned during registration.',
      });
      return;
    }

    const allowedRole: ServerUserRole =
      role === 'agent' || role === 'buyer' ? role : 'farmer';

    const normalizedEmail = String(email).trim().toLowerCase();
    if (usersMap.has(normalizedEmail)) {
      res.status(409).json({
        error: 'An account with this email address is already registered.',
      });
      return;
    }

    const { salt, hash } = hashPassword(String(password));
    const trimmedVillage = String(villageOrOrg || '').trim();
    const newUser: ServerUserRecord = {
      id: `USR-${100 + usersMap.size + 1}`,
      email: normalizedEmail,
      name: String(name).trim(),
      nameHi: String(name).trim(),
      role: allowedRole,
      villageOrOrg: trimmedVillage || 'Unassigned Workspace',
      village: trimmedVillage,
      district: '',
      state: '',
      phoneNumber: '',
      preferredLanguage: 'en',
      onboardingStatus: 'INCOMPLETE',
      onboardingStep: 1,
      profileCompletion: 25,
      isDemoAccount: false,
      demoDatasetVersion: '',
      uidLabel: `UID-${Math.floor(1000 + Math.random() * 9000)}`,
      passwordSalt: salt,
      passwordHash: hash,
      emailVerified: false,
      active: true,
      createdAt: 'Just now',
      updatedAt: 'Just now',
      lastLoginAt: 'Just now',
    };

    usersMap.set(normalizedEmail, newUser);
    userCropLotsMap.set(normalizedEmail, []);
    const token = createSignedToken(newUser.email);

    recordAudit(
      newUser.email,
      newUser.role,
      'USER_REGISTERED',
      `Assigned default role: ${newUser.role}`,
      'New individual user account created with fresh onboarding state.',
      'SUCCESS'
    );

    res.status(201).json({
      token,
      user: sanitizeUser(newUser),
      personalLots: [],
      devDemoMode: isDevDemoMode,
    });
  });

  // 3b. Update Authenticated User Profile & Onboarding Progress
  app.put('/api/profile', (req: Request, res: Response) => {
    const token = extractToken(req);
    const user = verifySignedToken(token);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const {
      name,
      preferredLanguage,
      phoneNumber,
      role,
      village,
      district,
      state,
      onboardingStatus,
      onboardingStep,
      profileCompletion,
    } = req.body || {};

    if (role === 'admin' && user.role !== 'admin') {
      res.status(403).json({
        error: 'Security Violation: Cannot self-assign Administrator role.',
      });
      return;
    }

    if (typeof name === 'string' && name.trim().length > 0) {
      user.name = name.trim().slice(0, 120);
      user.nameHi = name.trim().slice(0, 120);
    }
    if (preferredLanguage === 'en' || preferredLanguage === 'hi') {
      user.preferredLanguage = preferredLanguage;
    }
    if (typeof phoneNumber === 'string') {
      user.phoneNumber = phoneNumber.trim().slice(0, 24);
    }
    if (
      user.role !== 'admin' &&
      (role === 'farmer' || role === 'agent' || role === 'buyer')
    ) {
      user.role = role;
    }
    if (typeof village === 'string') {
      user.village = village.trim().slice(0, 80);
    }
    if (typeof district === 'string') {
      user.district = district.trim().slice(0, 80);
    }
    if (typeof state === 'string') {
      user.state = state.trim().slice(0, 80);
    }

    const parts = [user.village, user.district, user.state].filter(Boolean);
    if (parts.length > 0) {
      user.villageOrOrg = parts.join(', ').slice(0, 120);
    }

    if (
      onboardingStatus === 'INCOMPLETE' ||
      onboardingStatus === 'COMPLETED' ||
      onboardingStatus === 'SKIPPED'
    ) {
      user.onboardingStatus = onboardingStatus;
    }
    if (typeof onboardingStep === 'number') {
      user.onboardingStep = Math.max(1, Math.min(4, Math.round(onboardingStep)));
    }
    if (typeof profileCompletion === 'number') {
      user.profileCompletion = Math.max(
        0,
        Math.min(100, Math.round(profileCompletion))
      );
    }

    user.updatedAt = 'Just now';

    recordAudit(
      user.email,
      user.role,
      'PROFILE_UPDATED',
      `Step ${user.onboardingStep} (${user.onboardingStatus})`,
      `Profile updated (${user.profileCompletion}% complete).`,
      'SUCCESS'
    );

    res.json({
      user: sanitizeUser(user),
      personalLots: userCropLotsMap.get(user.email) || [],
    });
  });

  // 3c. Create a Personal Crop Lot Scoped to the Authenticated User
  app.post('/api/profile/crops', (req: Request, res: Response) => {
    const token = extractToken(req);
    const user = verifySignedToken(token);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const { cropName, variety, quantityQuintals, surveyNumber, harvestDate } =
      req.body || {};

    if (!cropName || typeof cropName !== 'string' || !cropName.trim()) {
      res.status(400).json({ error: 'Crop name is required.' });
      return;
    }

    const qty = Math.max(1, Math.min(10000, Number(quantityQuintals) || 20));
    const existingLots = userCropLotsMap.get(user.email) || [];
    const seq = existingLots.length + 1;
    const lotId = `KS-USER-${user.id.replace(/[^a-zA-Z0-9]/g, '')}-${100 + seq}`;
    const shortCode = `#KS-${100 + seq}`;
    const hash = crypto
      .createHash('sha256')
      .update(`${lotId}-${user.email}-${Date.now()}`)
      .digest('hex');

    const newLot: ServerCropLotRecord = {
      id: lotId,
      shortCode,
      farmerId: user.id,
      farmerName: user.name,
      farmerNameHi: user.nameHi,
      cropName: cropName.trim().slice(0, 80),
      cropNameHi: cropName.trim().slice(0, 80),
      variety: String(variety || 'Standard FAQ Grade').trim().slice(0, 80),
      varietyHi: String(variety || 'मानक ग्रेड').trim().slice(0, 80),
      grade: 'Grade A (Farmer Declared)',
      quantityQuintals: qty,
      harvestDate: String(harvestDate || 'Oct 2026').trim().slice(0, 40),
      plotAreaHectares: Number((qty * 0.08).toFixed(2)),
      surveyNumber: String(surveyNumber || user.village || 'Personal Farm Plot')
        .trim()
        .slice(0, 60),
      verificationStatus: 'FARMER_DECLARED',
      evidenceIds: [`EV-${lotId}`],
      evidence: {
        id: `EV-${lotId}`,
        labName: 'Farmer Self-Declaration (Pending FPO / NABL Verification)',
        certificateNumber: `DECL-${100 + seq}-2026`,
        testedDate: 'Just now',
        mrlStatus: 'SELF_DECLARED',
        sha256Hash: hash,
        moisturePercent: 11.2,
        foreignMatterPercent: 0.9,
      },
      mandiPricePerQuintal: 1820,
      directBuyerPricePerQuintal: 2150,
    };

    const updatedLots = [newLot, ...existingLots];
    userCropLotsMap.set(user.email, updatedLots);

    recordAudit(
      user.email,
      user.role,
      'PERSONAL_CROP_ADDED',
      `${newLot.id} (${newLot.cropName})`,
      `Added ${qty} Quintals of ${newLot.cropName} to personal workspace.`,
      'SUCCESS'
    );

    res.status(201).json({
      lot: newLot,
      personalLots: updatedLots,
    });
  });

  // =========================================================================
  // Crop-to-Cash End-to-End Flow Endpoints
  // =========================================================================

  // Helper middleware for authenticated lot access
  const requireUser = (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req);
    const user = verifySignedToken(token);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    (req as Request & { user: ServerUserRecord }).user = user;
    next();
  };

  // Helper middleware for requireAdmin
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req);
    const user = verifySignedToken(token);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (user.role !== 'admin') {
      recordAudit(
        user.email,
        user.role,
        'ADMIN_API_REJECTED',
        req.originalUrl,
        'Non-admin user attempted to invoke protected administrative endpoint.',
        'DENIED'
      );
      res.status(403).json({
        error:
          'Forbidden: Administrative privileges are required for this operation.',
      });
      return;
    }
    (req as Request & { adminUser?: ServerUserRecord }).adminUser = user;
    next();
  };

  // C2C-1: Create a tracked Crop Lot
  app.post('/api/c2c/lots', requireUser, (req: Request, res: Response) => {
    const user = (req as Request & { user: ServerUserRecord }).user;
    const { cropName, variety, grade, quantityQuintals, harvestDate, surveyNumber } = req.body || {};

    if (!cropName || typeof cropName !== 'string') {
      res.status(400).json({ error: 'Valid cropName is required.' });
      return;
    }

    const qty = Math.max(1, Number(quantityQuintals) || 50);
    const lotId = `KS-LOT-${Date.now()}`;
    const now = new Date().toISOString();

    const lot: ExtendedCropLotRecord = {
      id: lotId,
      ownerEmail: user.email,
      ownerId: user.id,
      farmerName: user.name,
      cropName: cropName.trim(),
      variety: String(variety || 'Standard FAQ Grade').trim(),
      grade: String(grade || 'Grade A').trim(),
      quantityQuintals: qty,
      harvestDate: String(harvestDate || 'Oct 2026').trim(),
      surveyNumber: String(surveyNumber || 'Plot-101').trim(),
      plotAreaHectares: Number((qty * 0.08).toFixed(2)),
      screeningResults: [],
      procurementAttempts: [],
      historyEvents: [
        {
          eventId: `EV-${Date.now()}-1`,
          timestamp: now,
          actor: user.email,
          actorRole: user.role,
          eventType: 'LOT_CREATED',
          summary: `Crop Lot ${lotId} created for ${qty} quintals of ${cropName}.`,
          isVerified: false,
          details: { cropName, quantityQuintals: qty },
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    saveExtendedLot(lot);
    recordAudit(user.email, user.role, 'C2C_LOT_CREATED', lotId, `Created lot with ${qty} quintals.`, 'SUCCESS');
    res.status(201).json(lot);
  });

  // C2C-2: Retrieve Lot by ID (with ownership check)
  app.get('/api/c2c/lots/:lotId', requireUser, (req: Request, res: Response) => {
    const user = (req as Request & { user: ServerUserRecord }).user;
    const { lotId } = req.params;
    const lot = getExtendedLot(lotId);

    if (!lot) {
      res.status(404).json({ error: 'Crop lot not found.' });
      return;
    }

    if (lot.ownerEmail !== user.email && user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied: You do not own this crop lot.' });
      return;
    }

    res.json(lot);
  });

  // C2C-3: Submit a crop screening (with abstention & image validation)
  app.post('/api/c2c/lots/:lotId/screening', requireUser, (req: Request, res: Response) => {
    const user = (req as Request & { user: ServerUserRecord }).user;
    const { lotId } = req.params;
    const lot = getExtendedLot(lotId);

    if (!lot) {
      res.status(404).json({ error: 'Crop lot not found.' });
      return;
    }

    if (lot.ownerEmail !== user.email && user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied: You do not own this crop lot.' });
      return;
    }

    const { imageFormat, imageSizeBytes, cropDeclared } = req.body || {};
    const screeningResult = CropToCashService.screenCropImage({
      lotId,
      imageFormat: imageFormat || 'jpeg',
      imageSizeBytes: Number(imageSizeBytes) || 1024 * 300,
      cropDeclared: cropDeclared || lot.cropName,
    });

    lot.screeningResults.push(screeningResult);
    lot.updatedAt = new Date().toISOString();
    lot.historyEvents.push({
      eventId: `EV-${Date.now()}-SCR`,
      timestamp: lot.updatedAt,
      actor: user.email,
      actorRole: user.role,
      eventType: 'SCREENING_PERFORMED',
      summary: `Crop screening performed: ${screeningResult.outcomeCategory} (${screeningResult.topClass?.className || 'None'})`,
      isVerified: false,
      details: { outcome: screeningResult.outcomeCategory, isMock: screeningResult.isMockOrDemo },
    });

    saveExtendedLot(lot);
    res.json(screeningResult);
  });

  // C2C-4: Calculate Return Estimate (Deterministic calculation engine)
  app.post('/api/c2c/lots/:lotId/estimate', requireUser, (req: Request, res: Response) => {
    const user = (req as Request & { user: ServerUserRecord }).user;
    const { lotId } = req.params;
    const lot = getExtendedLot(lotId);

    if (!lot) {
      res.status(404).json({ error: 'Crop lot not found.' });
      return;
    }

    if (lot.ownerEmail !== user.email && user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied: You do not own this crop lot.' });
      return;
    }

    const estimate = CropToCashService.calculateReturnEstimate(lot.id, lot.quantityQuintals);
    lot.latestEstimate = estimate;
    lot.updatedAt = new Date().toISOString();
    lot.historyEvents.push({
      eventId: `EV-${Date.now()}-EST`,
      timestamp: lot.updatedAt,
      actor: user.email,
      actorRole: user.role,
      eventType: 'ESTIMATE_GENERATED',
      summary: `Financial estimate generated (${estimate.calculationVersion}): FCI ₹${estimate.options.fciMsp.netReturn}, Mandi ₹${estimate.options.mandi.netReturn}, Direct ₹${estimate.options.directBuyer.netReturn}`,
      isVerified: true,
      details: {
        fciNet: estimate.options.fciMsp.netReturn,
        mandiNet: estimate.options.mandi.netReturn,
        directNet: estimate.options.directBuyer.netReturn,
        downsideNet: estimate.options.downsideFallback.netReturn,
      },
    });

    saveExtendedLot(lot);
    res.json(estimate);
  });

  // C2C-5: Record Procurement Attempt / Outcome
  app.post('/api/c2c/lots/:lotId/procurement-attempt', requireUser, (req: Request, res: Response) => {
    const user = (req as Request & { user: ServerUserRecord }).user;
    const { lotId } = req.params;
    const lot = getExtendedLot(lotId);

    if (!lot) {
      res.status(404).json({ error: 'Crop lot not found.' });
      return;
    }

    if (lot.ownerEmail !== user.email && user.role !== 'admin' && user.role !== 'agent') {
      res.status(403).json({ error: 'Access denied: Unauthorized to record procurement attempt.' });
      return;
    }

    const {
      centreId,
      centreName,
      isCentreVerified,
      outcome,
      outcomeReason,
      farmerIdPresented,
      landRecordReady,
      bankPassbookReady,
    } = req.body || {};

    const allDocs = Boolean(farmerIdPresented && landRecordReady && bankPassbookReady);
    const attempt: ProcurementAttempt = {
      attemptId: `ATT-${Date.now()}`,
      lotId,
      attemptTimestamp: new Date().toISOString(),
      reporter: user.email,
      reporterRole: user.role,
      centreId: String(centreId || 'FCI-CENTRE-01'),
      centreName: String(centreName || 'Khandwa Central Grain Mandi Centre'),
      isCentreVerified: Boolean(isCentreVerified ?? true),
      outcome: outcome || 'ACCEPTED',
      outcomeReason: outcomeReason || 'Standard inspection passed',
      documentReadiness: {
        farmerIdPresented: Boolean(farmerIdPresented),
        landRecordReady: Boolean(landRecordReady),
        bankPassbookReady: Boolean(bankPassbookReady),
        allDocumentsReady: allDocs,
      },
    };

    lot.procurementAttempts.push(attempt);
    lot.updatedAt = new Date().toISOString();
    lot.historyEvents.push({
      eventId: `EV-${Date.now()}-ATT`,
      timestamp: lot.updatedAt,
      actor: user.email,
      actorRole: user.role,
      eventType: 'PROCUREMENT_ATTEMPT',
      summary: `Procurement visit at ${attempt.centreName}: outcome ${attempt.outcome}.`,
      isVerified: attempt.isCentreVerified,
      details: { outcome: attempt.outcome, reason: attempt.outcomeReason, allDocs },
    });

    saveExtendedLot(lot);
    res.status(201).json(attempt);
  });

  // C2C-6: Record Actual Sale & Payment Status
  app.post('/api/c2c/lots/:lotId/sale', requireUser, (req: Request, res: Response) => {
    const user = (req as Request & { user: ServerUserRecord }).user;
    const { lotId } = req.params;
    const lot = getExtendedLot(lotId);

    if (!lot) {
      res.status(404).json({ error: 'Crop lot not found.' });
      return;
    }

    if (lot.ownerEmail !== user.email && user.role !== 'admin' && user.role !== 'buyer' && user.role !== 'agent') {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    const {
      buyerName,
      buyerType,
      acceptedQuantityQuintals,
      actualPricePerQuintal,
      actualTransportDeduction,
      actualHandlingDeduction,
      actualFeesDeduction,
      paymentStatus,
    } = req.body || {};

    const acceptedQty = Math.max(1, Number(acceptedQuantityQuintals) || lot.quantityQuintals);
    const price = Math.max(1, Number(actualPricePerQuintal) || 2350);
    const gross = Math.round(acceptedQty * price);

    const transport = Math.max(0, Number(actualTransportDeduction) || 2500);
    const handling = Math.max(0, Number(actualHandlingDeduction) || 1000);
    const fees = Math.max(0, Number(actualFeesDeduction) || 500);
    const totalDeductions = transport + handling + fees;
    const actualNet = gross - totalDeductions;

    const estimatedNet = lot.latestEstimate?.options.directBuyer.netReturn ?? 113500;
    const gapVariance = actualNet - estimatedNet;

    const sale: SaleRecord = {
      saleId: `SALE-${Date.now()}`,
      lotId,
      buyerName: String(buyerName || 'ITC Choupal Sagar Aggregator'),
      buyerType: buyerType || 'INSTITUTIONAL_BUYER',
      acceptedQuantityQuintals: acceptedQty,
      actualPricePerQuintal: price,
      actualGrossAmount: gross,
      actualDeductions: {
        transport,
        loading: handling,
        handling: 0,
        fees,
        discrepancyDeduction: 0,
        totalDeductions,
      },
      actualNetAmount: actualNet,
      paymentStatus: paymentStatus || 'FIRST_INSTALLMENT_PAID',
      settledAt: new Date().toISOString(),
      estimatedVsActualGap: {
        estimatedNet,
        actualNet,
        variance: gapVariance,
      },
    };

    lot.saleRecord = sale;
    lot.updatedAt = new Date().toISOString();
    lot.historyEvents.push({
      eventId: `EV-${Date.now()}-SALE`,
      timestamp: lot.updatedAt,
      actor: user.email,
      actorRole: user.role,
      eventType: 'SALE_RECORDED',
      summary: `Sale finalized with ${sale.buyerName}: Gross ₹${sale.actualGrossAmount}, Net ₹${sale.actualNetAmount}, Status: ${sale.paymentStatus}`,
      isVerified: true,
      details: { actualNetAmount: actualNet, paymentStatus: sale.paymentStatus, gapVariance },
    });

    saveExtendedLot(lot);
    res.status(201).json(sale);
  });

  // C2C-7: Admin Analytics (Privacy-Safe aggregates with sample size n & reporting period)
  app.get('/api/admin/pilot-analytics', requireAdmin, (_req: Request, res: Response) => {
    const allLots = getAllExtendedLots();
    const totalLots = allLots.length;

    let totalGrossSales = 0;
    let totalNetSales = 0;
    let totalAttempts = 0;
    const attemptsByOutcome: Record<string, number> = {
      ACCEPTED: 0,
      REJECTED: 0,
      PENDING: 0,
      RESCHEDULED: 0,
      NOT_COMPLETED: 0,
    };
    const paymentStatusDistribution: Record<string, number> = {
      AWAITING_PAYMENT: 0,
      FIRST_INSTALLMENT_PAID: 0,
      FULLY_SETTLED: 0,
      PAYMENT_FAILED: 0,
    };

    allLots.forEach((lot) => {
      lot.procurementAttempts.forEach((att) => {
        totalAttempts++;
        attemptsByOutcome[att.outcome] = (attemptsByOutcome[att.outcome] || 0) + 1;
      });
      if (lot.saleRecord) {
        totalGrossSales += lot.saleRecord.actualGrossAmount;
        totalNetSales += lot.saleRecord.actualNetAmount;
        paymentStatusDistribution[lot.saleRecord.paymentStatus] =
          (paymentStatusDistribution[lot.saleRecord.paymentStatus] || 0) + 1;
      }
    });

    res.json({
      reportingPeriod: 'Kharif-Rabi Pilot 2026',
      sampleSizeN: totalLots,
      totalProcurementAttempts: totalAttempts,
      attemptsByOutcome,
      financialAggregates: {
        totalGrossSalesINR: totalGrossSales,
        totalNetSalesINR: totalNetSales,
      },
      paymentStatusDistribution,
      privacySafeNote: 'Aggregated analytics; individual Aadhaar or raw personal records are never recorded or exposed.',
    });
  });

  // 3d. Safe Reset of Demo Dataset Only (Does NOT affect real user accounts or personal lots)
  app.post('/api/demo/reset', (req: Request, res: Response) => {
    const token = extractToken(req);
    const user = verifySignedToken(token);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!user.isDemoAccount && user.role !== 'admin') {
      res.status(403).json({
        error: 'Reset Demo Data is only available for Demo Accounts.',
      });
      return;
    }

    serverLotStatusOverrides = {};
    recordAudit(
      user.email,
      user.role,
      'DEMO_DATASET_RESET',
      'Demo Dataset v2.4-demo',
      'Reset demonstration lot overrides and sample workflow states to baseline.',
      'SUCCESS'
    );

    res.json({
      success: true,
      message:
        'Demo dataset has been reset to its default baseline without affecting any real user accounts.',
    });
  });

  // 4. Administrator Authentication Endpoint (Ctrl+Shift+A / Admin Gate)
  app.post('/api/auth/admin-login', (req: Request, res: Response) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({
        error: 'Administrator email and password are required.',
      });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = usersMap.get(normalizedEmail);
    if (
      !user ||
      !verifyPassword(String(password), user.passwordSalt, user.passwordHash)
    ) {
      recordAudit(
        normalizedEmail,
        'unknown',
        'ADMIN_AUTH_FAILED',
        '/admin Gate',
        'Invalid administrator credentials submitted via Admin dialog.',
        'DENIED'
      );
      res.status(401).json({
        error: 'Administrator authentication failed. Invalid credentials.',
      });
      return;
    }

    if (user.role !== 'admin') {
      recordAudit(
        user.email,
        user.role,
        'UNAUTHORIZED_ADMIN_ATTEMPT',
        '/admin Gate',
        `User with role '${user.role}' attempted to access Administrator portal.`,
        'DENIED'
      );
      res.status(403).json({
        error: `Unauthorized Access: Account '${user.email}' has role '${user.role.toUpperCase()}' and is not authorized for Administrator Access.`,
      });
      return;
    }

    user.lastLoginAt = 'Just now';
    const token = createSignedToken(user.email);
    recordAudit(
      user.email,
      'admin',
      'ADMIN_PORTAL_LOGIN',
      '/admin Dashboard',
      'Verified Administrator session via server RBAC check.',
      'SUCCESS'
    );

    res.json({
      token,
      user: sanitizeUser(user),
      personalLots: userCropLotsMap.get(user.email) || [],
      devDemoMode: isDevDemoMode,
    });
  });

  // 5. Password Reset Request
  app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({
        error: 'Please enter a valid registered email address.',
      });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    recordAudit(
      normalizedEmail,
      'public',
      'PASSWORD_RESET_REQUESTED',
      'Account Recovery',
      'Password recovery link dispatched (Simulated in Dev Mode).',
      'SUCCESS'
    );
    res.json({
      success: true,
      message:
        'If an account matches this email address, password recovery instructions have been dispatched.',
    });
  });

  // 6. Verify Email Simulation
  app.post('/api/auth/verify-email', (req: Request, res: Response) => {
    const token = extractToken(req);
    const user = verifySignedToken(token);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    user.emailVerified = true;
    recordAudit(
      user.email,
      user.role,
      'EMAIL_VERIFIED',
      user.id,
      'User completed email verification.',
      'SUCCESS'
    );
    res.json({ user: sanitizeUser(user) });
  });

  // 7. Logout
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const rawToken = extractToken(req);
    const claims = verifyStatelessSignedToken(rawToken, SESSION_SECRET);
    if (claims) {
      recordAudit(
        claims.email,
        'session',
        'USER_LOGOUT',
        'Client Session Cleared',
        'Client cleared its token; any copied token expires automatically.',
        'SUCCESS'
      );
    }
    res.json({ success: true });
  });

  // 8. Admin Overview & Records
  app.get('/api/admin/dashboard', requireAdmin, (_req: Request, res: Response) => {
    const allUsers = Array.from(usersMap.values()).map(sanitizeUser);
    res.json({
      users: allUsers,
      auditLogs,
      lotStatusOverrides: serverLotStatusOverrides,
      systemStatus: {
        authProvider:
          'Firebase Auth (Google Sign-In) + Stateless HMAC Server Tokens',
        agristackNode: 'MP-KHD-0402 (Connected Sample)',
        weighbridgeSerial: 'RS232 Terminal #104 (Simulated)',
        escrowGateway: 'Review-Only Demonstration Mode (No Live Bank Keys)',
      },
    });
  });

  // 9. Admin: Change User Role
  app.post(
    '/api/admin/users/:userId/role',
    requireAdmin,
    (req: Request, res: Response) => {
      const adminUser = (req as Request & { adminUser: ServerUserRecord })
        .adminUser;
      const { userId } = req.params;
      const { role, reason } = req.body || {};

      if (!reason || String(reason).trim().length < 5) {
        res.status(400).json({
          error:
            'A documented audit reason (min 5 characters) is required for role changes.',
        });
        return;
      }

      const validRoles: ServerUserRole[] = ['farmer', 'agent', 'buyer', 'admin'];
      if (!validRoles.includes(role)) {
        res.status(400).json({ error: 'Invalid role specified.' });
        return;
      }

      const targetUser = Array.from(usersMap.values()).find(
        (u) => u.id === userId
      );
      if (!targetUser) {
        res.status(404).json({ error: 'User record not found.' });
        return;
      }

      const prevRole = targetUser.role;
      targetUser.role = role;

      recordAudit(
        adminUser.email,
        adminUser.role,
        'ROLE_CHANGE_APPROVED',
        `${targetUser.email} (${prevRole} -> ${role})`,
        String(reason).trim(),
        'SUCCESS'
      );

      res.json({
        user: sanitizeUser(targetUser),
        auditLogs,
      });
    }
  );

  // 10. Admin: Activate / Deactivate User Account
  app.post(
    '/api/admin/users/:userId/status',
    requireAdmin,
    (req: Request, res: Response) => {
      const adminUser = (req as Request & { adminUser: ServerUserRecord })
        .adminUser;
      const { userId } = req.params;
      const { active, reason } = req.body || {};

      if (!reason || String(reason).trim().length < 5) {
        res.status(400).json({
          error:
            'An audit reason is required to activate or deactivate an account.',
        });
        return;
      }

      const targetUser = Array.from(usersMap.values()).find(
        (u) => u.id === userId
      );
      if (!targetUser) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      if (targetUser.id === adminUser.id && !active) {
        res.status(400).json({
          error: 'You cannot deactivate your own active administrator account.',
        });
        return;
      }

      targetUser.active = Boolean(active);
      recordAudit(
        adminUser.email,
        adminUser.role,
        targetUser.active ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED',
        targetUser.email,
        String(reason).trim(),
        targetUser.active ? 'SUCCESS' : 'WARNING'
      );

      res.json({
        user: sanitizeUser(targetUser),
        auditLogs,
      });
    }
  );

  // 11. Admin: Verification Review Approval / Rejection
  app.post(
    '/api/admin/lots/:lotId/verification',
    requireAdmin,
    (req: Request, res: Response) => {
      const adminUser = (req as Request & { adminUser: ServerUserRecord })
        .adminUser;
      const { lotId } = req.params;
      const { status, reason } = req.body || {};

      if (!reason || String(reason).trim().length < 5) {
        res.status(400).json({
          error:
            'A verifiable audit reason (minimum 5 characters) is mandatory before changing lot verification status.',
        });
        return;
      }

      serverLotStatusOverrides[lotId] = {
        status: String(status),
        updatedBy: adminUser.email,
        reason: String(reason).trim(),
        updatedAt: 'Just now',
      };

      recordAudit(
        adminUser.email,
        adminUser.role,
        `LOT_VERIFICATION_${status}`,
        `Lot ${lotId}`,
        String(reason).trim(),
        'SUCCESS'
      );

      res.json({
        lotId,
        override: serverLotStatusOverrides[lotId],
        auditLogs,
      });
    }
  );

  // Vite middleware in development, static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const assetsPath = path.join(distPath, 'assets');
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          const relativeToAssets = path.relative(assetsPath, filePath);
          const isHashedAsset =
            !relativeToAssets.startsWith('..') &&
            !path.isAbsolute(relativeToAssets) &&
            /-[A-Za-z0-9_-]{8,}\.[^.]+$/.test(path.basename(filePath));

          if (path.basename(filePath) === 'index.html') {
            res.setHeader('Cache-Control', 'no-cache');
          } else if (isHashedAsset) {
            res.setHeader(
              'Cache-Control',
              'public, max-age=31536000, immutable'
            );
          }
        },
      })
    );
    app.get('*', (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kisan-SPO server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
