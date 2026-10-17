import {
  SellingOptionEstimate,
  SellingQuote,
} from '../types/cropToCash';

export interface SellingCosts {
  fciCosts: number;
  mandiCosts: number;
  directCosts: number;
  extraTripCost: number;
}

export function calculateSellingOptions(
  quantityQuintals: number,
  quotes: SellingQuote[],
  costs: SellingCosts
): {
  estimates: SellingOptionEstimate[];
  downsideNet: number | null;
  error?: string;
} {
  if (!Number.isFinite(quantityQuintals) || quantityQuintals <= 0) {
    return {
      estimates: [],
      downsideNet: null,
      error: 'Enter a quantity greater than zero quintals.',
    };
  }
  if (
    Object.values(costs).some(
      (value) => !Number.isFinite(value) || value < 0
    )
  ) {
    return {
      estimates: [],
      downsideNet: null,
      error: 'Costs and deductions must be non-negative amounts.',
    };
  }

  const costByOption = {
    FCI_MSP_REFERENCE: costs.fciCosts,
    MANDI: costs.mandiCosts,
    DIRECT_BUYER: costs.directCosts,
  };
  const estimates = quotes.map((quote) => {
    const gross = Math.round(quantityQuintals * quote.pricePerQuintal);
    const deductions = costByOption[quote.option];
    return {
      option: quote.option,
      gross,
      deductions,
      net: gross - deductions,
    };
  });
  const directNet =
    estimates.find((estimate) => estimate.option === 'DIRECT_BUYER')?.net ??
    null;

  return {
    estimates,
    downsideNet:
      directNet === null ? null : directNet - costs.extraTripCost,
  };
}
