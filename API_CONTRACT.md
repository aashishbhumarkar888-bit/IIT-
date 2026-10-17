# Kisan-SPO × KisanSetu AI — Unified API Contract

**Status:** APPROVED & DEPLOYED (Authoritative Backend & Frontend Integration Contract)
**Base URLs:**
- Production / Local REST API: `http://localhost:3000/api/v1` (Typed Adapter Contract)
- Legacy C2C & Admin Analytics: `http://localhost:3000/api`
**Authentication:** `Authorization: Bearer <signed-hmac-token>` header on all protected endpoints.
**Response Headers:** `Cache-Control: private, no-store` on all dynamic API routes.
**Standard Error Envelope:**
```json
{
  "error": {
    "code": "VALIDATION_FAILED | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | SERVICE_UNAVAILABLE",
    "message": "Human-readable descriptive error message",
    "retryable": false
  }
}
```

---

## 1. Authentication & Session Synchronization

### `POST /api/auth/register`
Registers a new user account with an isolated workspace and fresh onboarding state.
- **Access:** Public. Prevents privilege escalation (`role` cannot be `admin`).
- **Request Body:**
  ```json
  {
    "email": "farmer@example.com",
    "password": "minimum6characters",
    "name": "Ramesh Patel",
    "role": "farmer", // "farmer" | "agent" | "buyer"
    "villageOrOrg": "Chhaigaon Makhan, Khandwa"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "token": "base64Claims.hexSignature",
    "user": {
      "id": "USR-101",
      "email": "farmer@example.com",
      "name": "Ramesh Patel",
      "role": "farmer",
      "villageOrOrg": "Chhaigaon Makhan, Khandwa",
      "onboardingStatus": "INCOMPLETE",
      "onboardingStep": 1,
      "profileCompletion": 25,
      "isDemoAccount": false,
      "uidLabel": "UID-9482",
      "emailVerified": false,
      "active": true
    },
    "personalLots": [],
    "devDemoMode": false
  }
  ```

### `POST /api/auth/login`
Authenticates existing credentials against salt and scrypt hash.
- **Access:** Public.
- **Request Body:** `{ "email": "...", "password": "..." }`
- **Response (200 OK):** `{ "token": string, "user": UserProfile, "personalLots": CropLot[], "devDemoMode": boolean }`
- **Errors:** `401 Unauthorized` for bad credentials; `403 Forbidden` if account deactivated.

### `POST /api/auth/firebase-sync`
Synchronizes Firebase Google Sign-In with server-side RBAC and issues a stateless signed token.
- **Access:** Public (valid Firebase UID and email required).
- **Request Body:** `{ uid, email, displayName, role, village, district, state, phoneNumber, preferredLanguage, onboardingStatus, onboardingStep, profileCompletion, emailVerified }`
- **Response (200 OK):** `{ "token": string, "user": UserProfile, "personalLots": CropLot[], "devDemoMode": boolean }`

---

## 2. Crop-to-Cash Workflow Endpoints (`/api/v1/lots`)

All endpoints in this section use the canonical persistent `lotId` across screening, price discovery, procurement, and settlement.

### `GET /api/v1/lots`
Retrieves all crop lots owned by the authenticated user (or all lots if `admin`).
- **Auth:** Required (`farmer`, `agent`, `buyer`, `admin`).
- **Response (200 OK):** `ExtendedCropLotRecord[]`

### `POST /api/v1/lots`
Creates a persistent Crop Lot record and initializes its verifiable ledger.
- **Auth:** Required (`farmer`, `agent`, `admin`).
- **Request Body:**
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
- **Response (201 Created):** `ExtendedCropLotRecord`
- **Errors:** `422 Unprocessable Entity` if crop name is missing or quantity $\le 0$.

### `GET /api/v1/lots/:lotId`
Fetches a specific crop lot by ID.
- **Auth:** Required (Owner or `admin`).
- **Response (200 OK):** `ExtendedCropLotRecord`
- **Errors:** `404 Not Found`, `403 Forbidden` (if not owner or admin).

### `GET /api/v1/lots/:lotId/ledger`
Retrieves the complete audit trail snapshot for the crop lot.
- **Auth:** Required (Owner or `admin`).
- **Response (200 OK):** `CropToCashSnapshot`
  ```json
  {
    "lotId": "KS-MP-2025-089",
    "events": [
      {
        "eventId": "EV-1729194-INIT",
        "lotId": "KS-MP-2025-089",
        "type": "READINESS",
        "occurredAt": "2026-10-18T00:00:00.000Z",
        "source": "VERIFIED",
        "verification": "OFFICIAL_REGISTRATION",
        "summary": "Farmer registration and bank account verified for MSP eligibility.",
        "payload": { "readinessId": "registration", "ready": true }
      }
    ],
    "readiness": [
      { "id": "registration", "labelEn": "Farmer & Land Registration", "labelHi": "किसान एवं भूमि पंजीकरण", "ready": true },
      { "id": "bankAccount", "labelEn": "Aadhaar-Linked Bank Account", "labelHi": "आधार लिंक बैंक खाता", "ready": true },
      { "id": "landRecord", "labelEn": "Khasra / Land Record Verification", "labelHi": "खसरा / भूमि रिकॉर्ड सत्यापन", "ready": true },
      { "id": "qualityCheck", "labelEn": "Pre-Procurement Quality / Moisture Check", "labelHi": "खरीद-पूर्व गुणवत्ता / नमी जांच", "ready": false }
    ],
    "procurementState": "PLANNED" // "PLANNED" | "VISITED" | "PENDING" | "REJECTED" | "RESCHEDULED" | "NOT_COMPLETED"
  }
  ```

### `GET /api/v1/lots/:lotId/quotes`
Returns comparable market selling quotes across FCI/MSP, local Mandi, and direct buyer.
- **Auth:** Required (Owner or `admin`).
- **Response (200 OK):** `SellingQuote[]`
  ```json
  [
    {
      "option": "FCI_MSP_REFERENCE",
      "lotId": "KS-MP-2025-089",
      "pricePerQuintal": 2585,
      "commodity": "Soybean (JS-335)",
      "grade": "FAQ Grade A",
      "market": "Official FCI / State Procurement Depot",
      "source": "MSP Price Schedule 2025-26",
      "timestamp": "2026-10-18T00:00:00.000Z",
      "freshness": "Official government reference rate",
      "provenance": "DEMO"
    },
    {
      "option": "MANDI",
      "lotId": "KS-MP-2025-089",
      "pricePerQuintal": 2300,
      "commodity": "Soybean (JS-335)",
      "grade": "FAQ Grade A",
      "market": "Khandwa APMC Grain Mandi",
      "source": "APMC E-Mandi Daily Modal Auction",
      "timestamp": "2026-10-18T00:00:00.000Z",
      "freshness": "Recent market auction rate",
      "provenance": "DEMO",
      "minimumRate": 2200,
      "maximumRate": 2400,
      "modalRate": 2300
    },
    {
      "option": "DIRECT_BUYER",
      "lotId": "KS-MP-2025-089",
      "pricePerQuintal": 2350,
      "commodity": "Soybean (JS-335)",
      "grade": "FAQ Grade A",
      "market": "ITC Choupal Sagar / FPO Forward Desk",
      "source": "Registered Institutional Buyer Quotation",
      "timestamp": "2026-10-18T00:00:00.000Z",
      "freshness": "Active contract quote",
      "provenance": "DEMO"
    }
  ]
  ```

### `POST /api/v1/lots/:lotId/comparisons`
Executes deterministic net return calculation and appends a `COMPARISON` event to the lot ledger.
- **Auth:** Required (Owner or `admin`).
- **Deterministic Formula:**
  $$\text{Net Return} = (\text{accepted quantity} \times \text{price}) - \text{transport} - \text{loading/handling} - \text{fees} - \text{extra visit costs} - \text{expected deductions}$$
- **Request Body:**
  ```json
  {
    "quantityQtl": 50,
    "costs": {
      "fciCosts": 2500,
      "mandiCosts": 4000,
      "directCosts": 4000,
      "extraTripCost": 1000
    }
  }
  ```
- **Response (200 OK):** `ComparisonResult`
  ```json
  {
    "lotId": "KS-MP-2025-089",
    "calculationVersion": "v2.0-deterministic",
    "estimates": [
      { "option": "FCI_MSP_REFERENCE", "gross": 129250, "deductions": 2500, "net": 126750 },
      { "option": "MANDI", "gross": 115000, "deductions": 4000, "net": 111000 },
      { "option": "DIRECT_BUYER", "gross": 117500, "deductions": 4000, "net": 113500 }
    ],
    "downsideNet": 112500,
    "event": {
      "eventId": "EV-1729194-CMP",
      "lotId": "KS-MP-2025-089",
      "type": "COMPARISON",
      "occurredAt": "2026-10-18T01:00:00.000Z",
      "source": "ESTIMATED",
      "verification": "ESTIMATE — deterministic engine v2.0",
      "summary": "Compared selling options for 50 qtl: FCI ₹126750, Mandi ₹111000, Direct ₹113500",
      "payload": {
        "quantityQtl": 50,
        "fciNet": 126750,
        "mandiNet": 111000,
        "directNet": 113500,
        "downsideNet": 112500
      }
    }
  }
  ```
- **Errors:** `422 Unprocessable Entity` if `quantityQtl <= 0` or any cost $< 0$.

### `POST /api/v1/lots/:lotId/readiness`
Updates document readiness checklist. Only boolean flags (`ready: true/false`) are accepted.
- **Privacy Rule:** No Aadhaar numbers, bank account numbers, or document scans are ever received or stored.
- **Request Body:**
  ```json
  {
    "lotId": "KS-MP-2025-089",
    "type": "READINESS",
    "source": "VERIFIED",
    "verification": "OFFICIAL_DOCUMENTS",
    "summary": "Bank account linked and verified.",
    "payload": {
      "readinessId": "bankAccount",
      "ready": true
    }
  }
  ```
- **Response (201 Created):** `CropLedgerEvent`

### `POST /api/v1/lots/:lotId/procurement-attempts`
Records an official procurement visit outcome and updates `procurementState`.
- **Request Body:**
  ```json
  {
    "lotId": "KS-MP-2025-089",
    "type": "PROCUREMENT",
    "source": "DEMO",
    "verification": "CENTRE_VERIFIED",
    "summary": "Visited Khandwa FCI depot centre.",
    "payload": {
      "outcome": "VISITED", // "PLANNED" | "VISITED" | "PENDING" | "REJECTED" | "RESCHEDULED" | "NOT_COMPLETED"
      "centreName": "Khandwa FCI Depot"
    }
  }
  ```
- **Response (201 Created):** `CropLedgerEvent`

### `POST /api/v1/lots/:lotId/sales`
Finalizes an actual sale transaction and appends the settlement event.
- **Request Body:**
  ```json
  {
    "lotId": "KS-MP-2025-089",
    "type": "SALE",
    "source": "DEMO",
    "verification": "CONTRACT_SETTLED",
    "summary": "Direct institutional sale finalized.",
    "payload": {
      "buyerName": "ITC Choupal Sagar",
      "acceptedQty": 50,
      "netAmount": 113500,
      "paymentStatus": "FIRST_INSTALLMENT_PAID"
    }
  }
  ```
- **Response (201 Created):** `CropLedgerEvent`

### `POST /api/v1/lots/:lotId/screenings`
Model-independent leaf image screening endpoint.
- **Safety Rule:** Strictly abstains from prescribing synthetic chemical pesticides from an image alone. Always provides safe Krishi Vigyan Kendra (KVK) referral advice.
- **Request Body:**
  ```json
  {
    "imageFormat": "jpeg", // "jpeg" | "png" | "webp"
    "imageSizeBytes": 350000,
    "cropDeclared": "Soybean"
  }
  ```
- **Response (200 OK):** `CropScreeningResult`
  ```json
  {
    "screeningId": "SCR-1729194...",
    "lotId": "KS-MP-2025-089",
    "modelName": "KisanSetu-Screening-Adapter",
    "modelVersion": "v1.0.0-mock-demo",
    "isMockOrDemo": true,
    "outcomeCategory": "DISEASE_DETECTED",
    "topClass": {
      "className": "Soybean Rust (Phakopsora pachyrhizi)",
      "confidence": 0.88,
      "scientificName": "Phakopsora pachyrhizi"
    },
    "runnerUp": {
      "className": "Cercospora Leaf Blight",
      "confidence": 0.08,
      "scientificName": "Cercospora kikuchii"
    },
    "calibratedConfidence": false,
    "explanation": {
      "visualQualityScore": 0.85,
      "lightingAdequate": true,
      "blurDetected": false,
      "diagnosticNotes": "Visual inspection indicates foliar pustules...",
      "safeExpertReferral": "Automated systems do not prescribe synthetic pesticides from imagery alone. Please consult your Block Agriculture Extension Officer or visit the nearest Krishi Vigyan Kendra (KVK) for an official field agronomy prescription."
    }
  }
  ```

---

## 3. Administrative Pilot Analytics

### `GET /api/admin/pilot-analytics`
Aggregated metrics for FPO/Mandi administrators.
- **Auth:** Required (`admin` role enforced on server).
- **Response (200 OK):**
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
