# API CONTRACT — KISAN-SPO × KISANSETU AI

**Base URL:** `http://localhost:3000/api`  
**Authentication:** Bearer token in `Authorization: Bearer <token>` header (stateless signed HMAC token).  
**Caching:** `Cache-Control: private, no-store` on all `/api/*` routes.

---

## 1. Authentication & Session

### `POST /api/auth/register`
Creates an individual user account with fresh onboarding state.
- **Access:** Public. Prevents privilege escalation (role cannot be `admin`).
- **Body:**
  ```json
  {
    "email": "farmer@example.com",
    "password": "minimum6chars",
    "name": "Ramesh Patel",
    "role": "farmer", // "farmer" | "agent" | "buyer"
    "villageOrOrg": "Khandwa"
  }
  ```
- **Response (201):** `{ token: string, user: UserProfile, personalLots: [], devDemoMode: boolean }`

### `POST /api/auth/login`
- **Body:** `{ "email": "...", "password": "..." }`
- **Response (200):** `{ token: string, user: UserProfile, personalLots: CropLot[], devDemoMode: boolean }`

### `POST /api/auth/firebase-sync`
Synchronizes Firebase Google Sign-In with server-side RBAC.
- **Body:** `{ uid, email, displayName, role, village, district, state, preferredLanguage, onboardingStatus, onboardingStep, profileCompletion, emailVerified }`
- **Response (200):** `{ token: string, user: UserProfile, personalLots: CropLot[], devDemoMode: boolean }`

---

## 2. Crop-to-Cash (C2C) Workflows

### `POST /api/c2c/lots`
Create a persistent Crop Lot record.
- **Auth:** Required (`farmer`, `agent`, `admin`).
- **Body:**
  ```json
  {
    "cropName": "Soybean (JS-335)",
    "variety": "Grade A Certified",
    "grade": "Grade A",
    "quantityQuintals": 50,
    "harvestDate": "Oct 2026",
    "surveyNumber": "Plot-99/A"
  }
  ```
- **Response (201):** `ExtendedCropLotRecord`

### `GET /api/c2c/lots/:lotId`
Retrieve crop lot by ID with complete timeline history.
- **Auth:** Required (Owner or `admin`).
- **Response (200):** `ExtendedCropLotRecord`
- **Errors:** `404 Not Found`, `403 Forbidden` (if not owner or admin).

### `POST /api/c2c/lots/:lotId/screening`
Submit a leaf photograph for disease / quality screening.
- **Auth:** Required (Owner or `admin`).
- **Body:**
  ```json
  {
    "imageFormat": "jpeg", // "jpeg" | "png" | "webp"
    "imageSizeBytes": 450000,
    "cropDeclared": "Soybean"
  }
  ```
- **Response (200):**
  ```json
  {
    "screeningId": "SCR-1729194...",
    "lotId": "KS-LOT-1729194...",
    "modelName": "KisanSetu-Screening-Adapter",
    "modelVersion": "v1.0.0-mock-demo",
    "isMockOrDemo": true,
    "outcomeCategory": "DISEASE_DETECTED",
    "topClass": {
      "className": "Soybean Rust (Phakopsora pachyrhizi)",
      "confidence": 0.88,
      "scientificName": "Phakopsora pachyrhizi"
    },
    "runnerUp": { ... },
    "calibratedConfidence": false,
    "explanation": {
      "visualQualityScore": 0.85,
      "lightingAdequate": true,
      "blurDetected": false,
      "diagnosticNotes": "Visual inspection indicates foliar pustules...",
      "safeExpertReferral": "Automated systems do not prescribe synthetic pesticides from imagery alone. Consult Krishi Vigyan Kendra (KVK) for an official prescription."
    }
  }
  ```

### `POST /api/c2c/lots/:lotId/estimate`
Deterministic return calculation engine. Reproducible formula:
$$\text{Net return} = (\text{accepted quantity} \times \text{price}) - \text{transport} - \text{loading/handling} - \text{fees} - \text{extra visit costs} - \text{expected deductions}$$
- **Auth:** Required (Owner or `admin`).
- **Response (200):**
  ```json
  {
    "estimateId": "EST-1729194...",
    "calculationVersion": "v2.0-deterministic",
    "lotId": "KS-LOT-1729194...",
    "acceptedQuantityQuintals": 50,
    "options": {
      "fciMsp": {
        "unitPrice": 2585,
        "grossAmount": 129250,
        "deductions": { "totalDeductions": 2500, ... },
        "netReturn": 126750,
        "netRealizationPerQuintal": 2535.00
      },
      "mandi": {
        "unitPrice": 2300,
        "grossAmount": 115000,
        "deductions": { "totalDeductions": 4000, ... },
        "netReturn": 111000,
        "netRealizationPerQuintal": 2220.00
      },
      "directBuyer": {
        "unitPrice": 2350,
        "grossAmount": 117500,
        "deductions": { "totalDeductions": 4000, ... },
        "netReturn": 113500,
        "netRealizationPerQuintal": 2270.00
      },
      "downsideFallback": {
        "unitPrice": 2350,
        "grossAmount": 117500,
        "deductions": { "totalDeductions": 5000, ... },
        "netReturn": 112500,
        "netRealizationPerQuintal": 2250.00
      }
    }
  }
  ```

### `POST /api/c2c/lots/:lotId/procurement-attempt`
Record official procurement centre attempt.
- **Auth:** Required (`farmer`, `agent`, `admin`).
- **Body:**
  ```json
  {
    "centreId": "FCI-KHD-01",
    "centreName": "Khandwa FCI Depot Centre",
    "isCentreVerified": true,
    "outcome": "ACCEPTED", // "ACCEPTED" | "REJECTED" | "PENDING" | "RESCHEDULED" | "NOT_COMPLETED"
    "outcomeReason": "FAQ quality checked, moisture 11.4%",
    "farmerIdPresented": true,
    "landRecordReady": true,
    "bankPassbookReady": true
  }
  ```
- **Response (201):** `ProcurementAttempt` (document readiness stored as yes/no boolean flags only).

### `POST /api/c2c/lots/:lotId/sale`
Record finalized actual sale and escrow/payment settlement.
- **Auth:** Required (Owner, `agent`, `buyer`, or `admin`).
- **Body:**
  ```json
  {
    "buyerName": "ITC Choupal Sagar",
    "buyerType": "INSTITUTIONAL_BUYER",
    "acceptedQuantityQuintals": 50,
    "actualPricePerQuintal": 2350,
    "actualTransportDeduction": 2500,
    "actualHandlingDeduction": 1000,
    "actualFeesDeduction": 500,
    "paymentStatus": "FIRST_INSTALLMENT_PAID" // "AWAITING_PAYMENT" | "FIRST_INSTALLMENT_PAID" | "FULLY_SETTLED" | "PAYMENT_FAILED"
  }
  ```
- **Response (201):** `SaleRecord` (includes `estimatedVsActualGap` variance calculation).

---

## 3. Privacy-Safe Admin Pilot Analytics

### `GET /api/admin/pilot-analytics`
Aggregated metrics for FPO/Mandi administrators and pilot partners.
- **Auth:** Required (`admin` role enforced on server).
- **Response (200):**
  ```json
  {
    "reportingPeriod": "Kharif-Rabi Pilot 2026",
    "sampleSizeN": 1,
    "totalProcurementAttempts": 1,
    "attemptsByOutcome": { "ACCEPTED": 1, "REJECTED": 0, "PENDING": 0, "RESCHEDULED": 0, "NOT_COMPLETED": 0 },
    "financialAggregates": { "totalGrossSalesINR": 117500, "totalNetSalesINR": 113500 },
    "paymentStatusDistribution": { "FIRST_INSTALLMENT_PAID": 1 },
    "privacySafeNote": "Aggregated analytics; individual Aadhaar or raw personal records are never recorded or exposed."
  }
  ```
