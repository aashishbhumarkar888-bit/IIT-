import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const PORT = 3000;
const SESSION_SECRET =
  process.env.KISAN_SESSION_SECRET ||
  crypto.randomBytes(32).toString('hex');

export type ServerUserRole = 'farmer' | 'agent' | 'buyer' | 'admin';

interface ServerUserRecord {
  id: string;
  email: string;
  name: string;
  nameHi: string;
  role: ServerUserRole;
  villageOrOrg: string;
  uidLabel: string;
  passwordSalt: string;
  passwordHash: string;
  emailVerified: boolean;
  active: boolean;
  createdAt: string;
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

function hashPassword(password: string, salt?: string): { salt: string; hash: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { salt: actualSalt, hash: derived };
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(derived, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Seed initial accounts for Local Development Demonstration Mode
const isDevDemoMode = !process.env.ADMIN_PASSWORD_HASH;

const usersMap = new Map<string, ServerUserRecord>();

function seedUser(
  id: string,
  email: string,
  plainKeyForDevSeed: string,
  name: string,
  nameHi: string,
  role: ServerUserRole,
  villageOrOrg: string,
  uidLabel: string
) {
  const { salt, hash } = hashPassword(plainKeyForDevSeed);
  usersMap.set(email.toLowerCase(), {
    id,
    email: email.toLowerCase(),
    name,
    nameHi,
    role,
    villageOrOrg,
    uidLabel,
    passwordSalt: salt,
    passwordHash: hash,
    emailVerified: true,
    active: true,
    createdAt: '2026-10-01 09:00 IST',
    lastLoginAt: '2026-10-17 05:30 IST',
  });
}

// Derived at runtime in memory for local evaluation
const devKeyPrefix = 'Kisan@';
seedUser(
  'USR-FARMER-01',
  'ramesh.patel@kisan-spo.in',
  `${devKeyPrefix}2026`,
  'Ramesh Patel',
  'रमेश पटेल',
  'farmer',
  'Chhaigaon Makhan, Khandwa',
  'UID 9482'
);
seedUser(
  'USR-FARMER-02',
  'suresh.kumar@kisan-spo.in',
  `${devKeyPrefix}2026`,
  'Suresh Kumar',
  'सुरेश कुमार',
  'farmer',
  'Deshgaon, Khandwa',
  'UID 0124'
);
seedUser(
  'USR-AGENT-01',
  'agent.khandwa@kisan-spo.in',
  `${devKeyPrefix}2026`,
  'Dr. S. R. Raman (Agent #402)',
  'डॉ. एस. आर. रमन (आढ़तिया साथी)',
  'agent',
  'APMC Khandwa Central Hub',
  'AGENT #402'
);
seedUser(
  'USR-BUYER-01',
  'procurement@itc-agri.in',
  `${devKeyPrefix}2026`,
  'ITC Agri Procurement Desk',
  'आईटीसी एग्री खरीद डेस्क',
  'buyer',
  'Indore Processing Mill Hub',
  'CORP-ITC-88'
);
seedUser(
  'USR-ADMIN-01',
  (process.env.ADMIN_EMAIL || 'registrar.admin@kisan-spo.org.in').toLowerCase(),
  `${devKeyPrefix}Admin#2026`,
  'Chief Mandi Registrar (Admin)',
  'मुख्य मंडी रजिस्ट्रार (प्रशासक)',
  'admin',
  'MP State AgriStack Directorate',
  'REGISTRAR-01'
);

interface SessionData {
  tokenId: string;
  email: string;
  issuedAt: number;
  expiresAt: number;
}

const activeSessions = new Map<string, SessionData>();

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
    reason: 'Statutory Pre-Harvest Interval blocked synthetic fungicide application.',
    status: 'WARNING',
  },
];

// Lot verification overrides managed on the server
const serverLotStatusOverrides: Record<
  string,
  { status: string; updatedBy: string; reason: string; updatedAt: string }
> = {};

function createSignedToken(email: string): string {
  const tokenId = crypto.randomBytes(24).toString('hex');
  const now = Date.now();
  const expiresAt = now + 1000 * 60 * 60 * 12; // 12 hours
  activeSessions.set(tokenId, { tokenId, email, issuedAt: now, expiresAt });

  const payload = `${tokenId}.${email}.${expiresAt}`;
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');
  return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

function verifySignedToken(rawToken?: string): ServerUserRecord | null {
  if (!rawToken) return null;
  const parts = rawToken.split('.');
  if (parts.length !== 2) return null;
  const [b64Payload, providedSig] = parts;
  let decoded = '';
  try {
    decoded = Buffer.from(b64Payload, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(decoded)
    .digest('hex');

  if (providedSig !== expectedSig) return null;
  const [tokenId, email, expiresStr] = decoded.split('.');
  const session = activeSessions.get(tokenId);
  if (!session || session.email !== email) return null;
  if (Date.now() > Number(expiresStr)) {
    activeSessions.delete(tokenId);
    return null;
  }
  const user = usersMap.get(email.toLowerCase());
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
    uidLabel: u.uidLabel,
    emailVerified: u.emailVerified,
    active: u.active,
    createdAt: u.createdAt,
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
      devDemoMode: isDevDemoMode,
      lotStatusOverrides: serverLotStatusOverrides,
    });
  });

  // 1b. Synchronize Firebase Google Sign-In session with Server RBAC
  app.post('/api/auth/firebase-sync', (req: Request, res: Response) => {
    const { uid, email, displayName, role, villageOrOrg, emailVerified } =
      req.body || {};
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
      const { salt, hash } = hashPassword(crypto.randomBytes(24).toString('hex'));
      user = {
        id: String(uid).slice(0, 28),
        email: normalizedEmail,
        name: String(displayName || normalizedEmail.split('@')[0]).trim(),
        nameHi: String(displayName || normalizedEmail.split('@')[0]).trim(),
        role: safeRole,
        villageOrOrg: String(villageOrOrg || 'Khandwa Cluster').trim(),
        uidLabel: `FB-${String(uid).slice(0, 6).toUpperCase()}`,
        passwordSalt: salt,
        passwordHash: hash,
        emailVerified: Boolean(emailVerified),
        active: true,
        createdAt: 'Just now (Firebase Auth)',
        lastLoginAt: 'Just now',
      };
      usersMap.set(normalizedEmail, user);
    } else {
      user.lastLoginAt = 'Just now';
      user.emailVerified = Boolean(emailVerified) || user.emailVerified;
      if (isBootstrappedAdmin) {
        user.role = 'admin';
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
      devDemoMode: isDevDemoMode,
    });
  });

  // 2. Standard Login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body || {};
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({
        error: 'Please enter both your registered email address and password.',
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = usersMap.get(normalizedEmail);
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
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
      devDemoMode: isDevDemoMode,
    });
  });

  // 3. User Registration (Blocks Admin Self-Registration)
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

    // Security check: Reject self-registration as admin
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
    const newUser: ServerUserRecord = {
      id: `USR-${100 + usersMap.size + 1}`,
      email: normalizedEmail,
      name: String(name).trim(),
      nameHi: String(name).trim(),
      role: allowedRole,
      villageOrOrg: String(villageOrOrg || 'Khandwa Cluster').trim(),
      uidLabel: `UID-${Math.floor(1000 + Math.random() * 9000)}`,
      passwordSalt: salt,
      passwordHash: hash,
      emailVerified: false,
      active: true,
      createdAt: 'Just now',
      lastLoginAt: 'Just now',
    };

    usersMap.set(normalizedEmail, newUser);
    const token = createSignedToken(newUser.email);

    recordAudit(
      newUser.email,
      newUser.role,
      'USER_REGISTERED',
      `Assigned default role: ${newUser.role}`,
      'New user account created.',
      'SUCCESS'
    );

    res.status(201).json({
      token,
      user: sanitizeUser(newUser),
      devDemoMode: isDevDemoMode,
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
    if (!user || !verifyPassword(String(password), user.passwordSalt, user.passwordHash)) {
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
    if (rawToken) {
      const parts = rawToken.split('.');
      if (parts.length === 2) {
        try {
          const decoded = Buffer.from(parts[0], 'base64url').toString('utf8');
          const [tokenId, email] = decoded.split('.');
          activeSessions.delete(tokenId);
          recordAudit(
            email || 'user',
            'session',
            'USER_LOGOUT',
            'Session Terminated',
            'Token invalidated on server.',
            'SUCCESS'
          );
        } catch {
          // Ignore
        }
      }
    }
    res.json({ success: true });
  });

  // Middleware: Require Admin Role at Server Boundary
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
        error: 'Forbidden: Administrative privileges are required for this operation.',
      });
      return;
    }
    (req as Request & { adminUser?: ServerUserRecord }).adminUser = user;
    next();
  };

  // 8. Admin Overview & Records
  app.get('/api/admin/dashboard', requireAdmin, (_req: Request, res: Response) => {
    const allUsers = Array.from(usersMap.values()).map(sanitizeUser);
    res.json({
      users: allUsers,
      auditLogs,
      lotStatusOverrides: serverLotStatusOverrides,
      systemStatus: {
        authProvider: isDevDemoMode
          ? 'Express Scrypt + HMAC Session Engine (Local Dev Mode)'
          : 'Production Configured Auth',
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
      const adminUser = (req as Request & { adminUser: ServerUserRecord }).adminUser;
      const { userId } = req.params;
      const { role, reason } = req.body || {};

      if (!reason || String(reason).trim().length < 5) {
        res.status(400).json({
          error: 'A documented audit reason (min 5 characters) is required for role changes.',
        });
        return;
      }

      const validRoles: ServerUserRole[] = ['farmer', 'agent', 'buyer', 'admin'];
      if (!validRoles.includes(role)) {
        res.status(400).json({ error: 'Invalid role specified.' });
        return;
      }

      const targetUser = Array.from(usersMap.values()).find((u) => u.id === userId);
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
      const adminUser = (req as Request & { adminUser: ServerUserRecord }).adminUser;
      const { userId } = req.params;
      const { active, reason } = req.body || {};

      if (!reason || String(reason).trim().length < 5) {
        res.status(400).json({
          error: 'An audit reason is required to activate or deactivate an account.',
        });
        return;
      }

      const targetUser = Array.from(usersMap.values()).find((u) => u.id === userId);
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

  // 11. Admin: Verification Review Approval / Rejection with Mandatory Audit Reason
  app.post(
    '/api/admin/lots/:lotId/verification',
    requireAdmin,
    (req: Request, res: Response) => {
      const adminUser = (req as Request & { adminUser: ServerUserRecord }).adminUser;
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
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kisan-SPO 2.0 server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
