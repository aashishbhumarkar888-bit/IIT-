# Kisan-SPO 2.0 — Authentication & Authorization Setup Guide

## Overview

Kisan-SPO 2.0 enforces a **login-first architecture** with server-validated session tokens and role-based access control (RBAC) handled by the Express backend (`server.ts`).

## 1. Environment Variables (`.env`)

Copy `.env.example` to `.env` and configure the following server-side variables:

- `KISAN_SESSION_SECRET`: High-entropy secret string (minimum 32 bytes) used to sign and verify HMAC-SHA256 session tokens.
- `ADMIN_EMAIL`: Authorized administrator email address for `/admin` access.
- `ADMIN_PASSWORD_HASH`: Scrypt password hash (`salt:derivedKeyHex`) for the production administrator account.

## 2. Security & Role Architecture

1. **No Client-Side Role Escalation**:
   - Public registration (`POST /api/auth/register`) only permits standard operational roles (`farmer`, `agent`, `buyer`). Any request attempting to self-assign `admin` is rejected with `403 Forbidden` by the server.
2. **Administrator Shortcut (`Ctrl + Shift + A` / `Cmd + Shift + A`)**:
   - Pressing `Ctrl + Shift + A` (or `Cmd + Shift + A` on macOS) opens the Administrator Authentication Dialog.
   - The keyboard shortcut is purely a UI navigation trigger and **never** grants administrative privileges on its own.
   - All `/api/admin/*` endpoints verify the signed Bearer token and enforce `user.role === 'admin'` on the server.
3. **Local Development Mode**:
   - When `ADMIN_PASSWORD_HASH` is not configured in the environment, the backend initializes clearly labeled **Development Mode Demo Accounts** in memory so evaluators can test Farmer, Village Agent, Institutional Buyer, and Administrator workflows locally.
