import {
  ArbitrageCalculationInput,
  ArbitrageCalculationResult,
  CropLot,
  VerificationStatus,
} from '../types/kisan';

/**
 * Formats a number in Indian currency style (e.g., ₹2,68,750 or ₹42,262)
 */
export function formatINR(amount: number, showDecimals = false): string {
  if (!Number.isFinite(amount)) return '₹0';
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(absAmount);
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Performs the mandatory Net-Pocket Arbitrage calculation from current form values.
 *
 * Required formulas:
 * Gross Sale Value = Quantity × Price Per Quintal
 * Total Deductions = Sum of applicable deductions
 * Net Payout = Gross Sale Value − Total Deductions
 * Net Realization Per Quintal = Net Payout ÷ Quantity
 * Difference Between Offers = Direct Buyer Net Payout − Mandi Net Payout
 */
export function calculateArbitrage(
  input: ArbitrageCalculationInput
): ArbitrageCalculationResult {
  const qty = Number(input.quantityQuintals);
  const mandiPrice = Number(input.mandiPricePerQuintal);
  const directPrice = Number(input.directPricePerQuintal);
  const mandiTransport = Math.max(0, Number(input.mandiTransportCost) || 0);
  const mandiLoading = Math.max(0, Number(input.mandiLoadingCost) || 0);
  const mandiCessPct = Math.max(0, Number(input.mandiCessPercent) || 0);
  const directFee = Math.max(0, Number(input.directPlatformFee) || 0);
  const directTransport = Math.max(0, Number(input.directTransportCost) || 0);

  if (!Number.isFinite(qty) || qty <= 0) {
    return {
      isValid: false,
      validationMessage:
        'Enter a lot quantity greater than 0 quintals to calculate net payout.',
      quantityQuintals: 0,
      mandiGross: 0,
      mandiCessAmount: 0,
      mandiTotalDeductions: 0,
      mandiNetPayout: 0,
      mandiNetPerQuintal: 0,
      directGross: 0,
      directTotalDeductions: 0,
      directNetPayout: 0,
      directNetPerQuintal: 0,
      netDifference: 0,
      percentageGain: 0,
      firstInstallment50: 0,
      remainingInstallment50: 0,
    };
  }

  if (
    !Number.isFinite(mandiPrice) ||
    mandiPrice <= 0 ||
    !Number.isFinite(directPrice) ||
    directPrice <= 0
  ) {
    return {
      isValid: false,
      validationMessage:
        'Both Mandi and Direct Buyer price per quintal must be valid positive numbers.',
      quantityQuintals: qty,
      mandiGross: 0,
      mandiCessAmount: 0,
      mandiTotalDeductions: 0,
      mandiNetPayout: 0,
      mandiNetPerQuintal: 0,
      directGross: 0,
      directTotalDeductions: 0,
      directNetPayout: 0,
      directNetPerQuintal: 0,
      netDifference: 0,
      percentageGain: 0,
      firstInstallment50: 0,
      remainingInstallment50: 0,
    };
  }

  // Gross Sale Value = Quantity × Price Per Quintal
  const mandiGross = Math.round(qty * mandiPrice);
  // Mandi Cess (e.g. 2.5% of Gross; for 25 * 1820 = 45,500 -> 2.5% = 1,137.5 -> rounded to 1,138)
  const mandiCessAmount = Math.round((mandiGross * mandiCessPct) / 100);
  const mandiTotalDeductions = mandiTransport + mandiLoading + mandiCessAmount;
  const mandiNetPayout = mandiGross - mandiTotalDeductions;
  const mandiNetPerQuintal = mandiNetPayout / qty;

  const directGross = Math.round(qty * directPrice);
  const directTotalDeductions = directFee + directTransport;
  const directNetPayout = directGross - directTotalDeductions;
  const directNetPerQuintal = directNetPayout / qty;

  const netDifference = directNetPayout - mandiNetPayout;
  const percentageGain =
    mandiNetPayout > 0
      ? Math.round((netDifference / mandiNetPayout) * 100)
      : 0;

  // 50-50 Escrow Split on Gross Contract Value (or Net Contract Value)
  // Per Phase 9: 25 * ₹2,150 = ₹53,750 gross contract value before deductions; 50% = ₹26,875
  const firstInstallment50 = Math.round(directGross / 2);
  const remainingInstallment50 = directGross - firstInstallment50;

  return {
    isValid: true,
    quantityQuintals: qty,
    mandiGross,
    mandiCessAmount,
    mandiTotalDeductions,
    mandiNetPayout,
    mandiNetPerQuintal,
    directGross,
    directTotalDeductions,
    directNetPayout,
    directNetPerQuintal,
    netDifference,
    percentageGain,
    firstInstallment50,
    remainingInstallment50,
  };
}

/**
 * Generates a structured JSON credential payload for the Crop Passport QR code
 */
export function buildCropPassportPayload(lot: CropLot): string {
  const baseUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/crop-passport?lot=${encodeURIComponent(lot.id)}`
      : `https://kisan-spo.example/crop-passport?lot=${encodeURIComponent(lot.id)}`;

  const payload = {
    schema: 'AGRISTACK-CROP-PASSPORT-V2.4',
    verifyUrl: baseUrl,
    lotId: lot.id,
    farmer: lot.farmerName,
    crop: lot.cropName,
    quantityQtl: lot.quantityQuintals,
    harvestDate: lot.harvestDate,
    verificationStatus: lot.verificationStatus,
    sha256: lot.evidence.sha256Hash,
    disclaimer: 'DEMONSTRATION_CREDENTIAL_NOT_GOVERNMENT_ISSUED',
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Returns human-readable metadata for each verification status so the UI never
 * conflates farmer-declared data with lab-tested or independently verified lots.
 */
export function getVerificationBadgeMeta(status: VerificationStatus): {
  titleEn: string;
  titleHi: string;
  tierLabel: string;
  isResidueFreeVerified: boolean;
  description: string;
} {
  switch (status) {
    case 'INDEPENDENTLY_VERIFIED':
      return {
        titleEn: 'Residue-Free Verified Lot',
        titleHi: 'अवशेष-मुक्त प्रमाणित फसल लॉट',
        tierLabel: 'TIER-1 INSTITUTIONAL AUDIT',
        isResidueFreeVerified: true,
        description:
          'Independently audited with supporting NABL laboratory residue test evidence (Demo Record).',
      };
    case 'LABORATORY_TESTED':
      return {
        titleEn: 'Laboratory Tested Lot (Zero MRL Exceedance)',
        titleHi: 'प्रयोगशाला परीक्षित फसल लॉट',
        tierLabel: 'NABL LAB TESTED',
        isResidueFreeVerified: true,
        description:
          'Sample tested by accredited pathology & MRL laboratory with zero residue exceedance (Demo Record).',
      };
    case 'DOCUMENT_VERIFIED':
      return {
        titleEn: 'Document Verified Lot (Lab Assay Pending)',
        titleHi: 'दस्तावेज़ सत्यापित लॉट',
        tierLabel: 'FPO DOCUMENT AUDIT',
        isResidueFreeVerified: false,
        description:
          'Land cadastre and purchase receipts verified by FPO desk; chemical residue lab report pending.',
      };
    case 'FARMER_DECLARED':
      return {
        titleEn: 'Farmer Self-Declared Lot',
        titleHi: 'किसान स्व-घोषित लॉट',
        tierLabel: 'SELF-DECLARED',
        isResidueFreeVerified: false,
        description:
          'Declared by grower without independent third-party laboratory residue test evidence.',
      };
    case 'VERIFICATION_PENDING':
      return {
        titleEn: 'Verification Pending Inspection',
        titleHi: 'सत्यापन प्रतीक्षित है',
        tierLabel: 'INSPECTION QUEUED',
        isResidueFreeVerified: false,
        description:
          'Lot registered in queue; awaiting field agent geo-fence check and laboratory sampling.',
      };
  }
}
