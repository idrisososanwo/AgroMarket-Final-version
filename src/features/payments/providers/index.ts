import { PaymentProvider } from "./types";
import { PaystackProvider } from "./paystack";
import { FlutterwaveProvider } from "./flutterwave";
import { PaymentProviderName } from "../types";

export * from "./types";
export * from "./paystack";
export * from "./flutterwave";

const providers: Partial<Record<PaymentProviderName, PaymentProvider>> = {};

/**
 * Returns the requested PaymentProvider instance.
 * Provider instances are cached singletons.
 */
export function getPaymentProvider(name: PaymentProviderName = "PAYSTACK"): PaymentProvider {
  if (providers[name]) {
    return providers[name]!;
  }

  switch (name) {
    case "PAYSTACK": {
      const provider = new PaystackProvider();
      providers[name] = provider;
      return provider;
    }
    case "FLUTTERWAVE": {
      const provider = new FlutterwaveProvider();
      providers[name] = provider;
      return provider;
    }
    default:
      throw new Error(`Payment provider '${name}' is not currently supported.`);
  }
}


export function resetPaymentProviders(): void {
  delete providers.PAYSTACK;
  delete providers.FLUTTERWAVE;
}
