import {
  AlchemyAccountsUIConfig,
  cookieStorage,
  createConfig,
} from "@account-kit/react";
import { baseSepolia } from "@account-kit/infra";
import { alchemy } from "@account-kit/infra";
import { QueryClient } from "@tanstack/react-query";

const API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const SPONSORSHIP_POLICY_ID = process.env.NEXT_PUBLIC_ALCHEMY_POLICY_ID;

if (!API_KEY) throw new Error("NEXT_PUBLIC_ALCHEMY_API_KEY is not set");
if (!SPONSORSHIP_POLICY_ID) throw new Error("NEXT_PUBLIC_ALCHEMY_POLICY_ID is not set");

const uiConfig: AlchemyAccountsUIConfig = {
  illustrationStyle: "outline",
  auth: {
    sections: [
      [{ type: "email" }],
      [
        { type: "passkey" },
        { type: "social", authProviderId: "google", mode: "popup" },
        { type: "social", authProviderId: "facebook", mode: "popup" },
      ],
    ],
    addPasskeyOnSignup: false,
  },
};

export const config = createConfig(
  {
    transport: alchemy({ apiKey: API_KEY }), // apiKey goes here
    chain: baseSepolia,
    
    // CORRECT LOCATION: policyId goes at the root level
    policyId: SPONSORSHIP_POLICY_ID, 
    
    ssr: true, 
    storage: cookieStorage, 
    enablePopupOauth: true,
  },
  uiConfig
);

export const queryClient = new QueryClient();