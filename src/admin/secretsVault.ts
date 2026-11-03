export type SecretGroup = "payments" | "couriers" | "messaging" | "security";
export type VaultEnv = "production" | "sandbox";

export interface SecretDescriptor {
  key: string;
  label: string;
  service: string;
  group: SecretGroup;
  env: VaultEnv;
  configured: boolean;
  version: number;
  /** Non-reversible 8-hex SHA-256 digest returned by the server vault; never a raw or partial secret. */
  fingerprint: string;
  rotatedAt: number | null;
  rotatedBy: string;
  rotationPolicyDays: number;
  health: "healthy" | "untested" | "warning";
  lastVerifiedAt: number | null;
  minLength: number;
  placeholderHint: string;
  docsNote: string;
}

export const INITIAL_SECRETS_METADATA: SecretDescriptor[] = [
  {
    key: "BKASH_APP_KEY",
    label: "bKash Tokenized App Key",
    service: "bKash PGW",
    group: "payments",
    env: "production",
    configured: true,
    version: 3,
    fingerprint: "sha256:7c9e21b4",
    rotatedAt: Date.now() - 14 * 86400_000,
    rotatedBy: "Arafat Rahman",
    rotationPolicyDays: 90,
    health: "healthy",
    lastVerifiedAt: Date.now() - 25 * 60_000,
    minLength: 16,
    placeholderHint: "Paste bKash Merchant App Key…",
    docsNote: "Used exclusively by backend /api/payments/bkash/create. Never sent to browser.",
  },
  {
    key: "BKASH_APP_SECRET",
    label: "bKash Tokenized App Secret",
    service: "bKash PGW",
    group: "payments",
    env: "production",
    configured: true,
    version: 3,
    fingerprint: "sha256:41af08d9",
    rotatedAt: Date.now() - 14 * 86400_000,
    rotatedBy: "Arafat Rahman",
    rotationPolicyDays: 90,
    health: "healthy",
    lastVerifiedAt: Date.now() - 25 * 60_000,
    minLength: 24,
    placeholderHint: "Paste bKash App Secret (write-only)…",
    docsNote: "Exchanged server-to-server for short-lived bKash grant tokens.",
  },
  {
    key: "BKASH_WEBHOOK_HMAC_SECRET",
    label: "bKash IPN / Webhook Signing Secret",
    service: "bKash PGW",
    group: "payments",
    env: "production",
    configured: true,
    version: 2,
    fingerprint: "sha256:e03b64c1",
    rotatedAt: Date.now() - 52 * 86400_000,
    rotatedBy: "Arafat Rahman",
    rotationPolicyDays: 60,
    health: "healthy",
    lastVerifiedAt: Date.now() - 2 * 3600_000,
    minLength: 24,
    placeholderHint: "Paste webhook HMAC signing secret…",
    docsNote: "Verifies payment callback signatures on the server before marking orders paid.",
  },
  {
    key: "NAGAD_MERCHANT_PRIVATE_KEY",
    label: "Nagad Merchant RSA Private Key",
    service: "Nagad PGW",
    group: "payments",
    env: "production",
    configured: true,
    version: 1,
    fingerprint: "sha256:9b17d4e2",
    rotatedAt: Date.now() - 78 * 86400_000,
    rotatedBy: "Arafat Rahman",
    rotationPolicyDays: 60,
    health: "warning",
    lastVerifiedAt: Date.now() - 3 * 86400_000,
    minLength: 32,
    placeholderHint: "Paste PEM / Base64 private key…",
    docsNote: "Rotation recommended (>60 days). Signs Nagad sensitive checkout payloads on backend.",
  },
  {
    key: "STEADFAST_API_SECRET",
    label: "Steadfast Courier Secret Key",
    service: "Steadfast BD",
    group: "couriers",
    env: "production",
    configured: true,
    version: 4,
    fingerprint: "sha256:58d2a9f0",
    rotatedAt: Date.now() - 9 * 86400_000,
    rotatedBy: "Arafat Rahman",
    rotationPolicyDays: 90,
    health: "healthy",
    lastVerifiedAt: Date.now() - 40 * 60_000,
    minLength: 20,
    placeholderHint: "Paste Steadfast portal Secret-Key…",
    docsNote: "Books nationwide COD & prepaid parcels from server dispatch worker.",
  },
  {
    key: "PATHAO_CLIENT_SECRET",
    label: "Pathao Courier OAuth Client Secret",
    service: "Pathao Merchant",
    group: "couriers",
    env: "production",
    configured: true,
    version: 2,
    fingerprint: "sha256:c4028fa7",
    rotatedAt: Date.now() - 31 * 86400_000,
    rotatedBy: "Arafat Rahman",
    rotationPolicyDays: 90,
    health: "healthy",
    lastVerifiedAt: Date.now() - 5 * 3600_000,
    minLength: 20,
    placeholderHint: "Paste Pathao Hermes client_secret…",
    docsNote: "Server OAuth credential for Dhaka 1–2 day express booking & webhook status sync.",
  },
  {
    key: "SMS_OTP_GATEWAY_API_KEY",
    label: "BD SMS OTP Gateway API Key",
    service: "BulkSMSBD / SSL Wireless",
    group: "messaging",
    env: "production",
    configured: true,
    version: 2,
    fingerprint: "sha256:13fe920b",
    rotatedAt: Date.now() - 21 * 86400_000,
    rotatedBy: "Arafat Rahman",
    rotationPolicyDays: 90,
    health: "healthy",
    lastVerifiedAt: Date.now() - 60 * 60_000,
    minLength: 16,
    placeholderHint: "Paste SMS provider API token…",
    docsNote: "Sends 4-digit login OTPs and order dispatch SMS from backend rate-limited queue.",
  },
  {
    key: "WHATSAPP_CLOUD_ACCESS_TOKEN",
    label: "WhatsApp Cloud System User Token",
    service: "Meta Cloud API",
    group: "messaging",
    env: "production",
    configured: false,
    version: 0,
    fingerprint: "",
    rotatedAt: null,
    rotatedBy: "—",
    rotationPolicyDays: 90,
    health: "untested",
    lastVerifiedAt: null,
    minLength: 24,
    placeholderHint: "Paste EAAG… permanent system user token",
    docsNote: "Optional automated order confirmation messages via WhatsApp Business API.",
  },
  {
    key: "ADMIN_JWT_SIGNING_SECRET",
    label: "Admin Session & RBAC Signing Key",
    service: "Platform Core",
    group: "security",
    env: "production",
    configured: true,
    version: 5,
    fingerprint: "sha256:88a1c6f3",
    rotatedAt: Date.now() - 6 * 86400_000,
    rotatedBy: "Arafat Rahman",
    rotationPolicyDays: 90,
    health: "healthy",
    lastVerifiedAt: Date.now() - 10 * 60_000,
    minLength: 32,
    placeholderHint: "Paste 256-bit random signing secret…",
    docsNote: "Signs HttpOnly admin session tokens and enforces server-side RBAC scopes.",
  },
  {
    key: "VAULT_KMS_MASTER_KEY",
    label: "Envelope Encryption Master Key (AES-256-GCM)",
    service: "Platform Core",
    group: "security",
    env: "production",
    configured: true,
    version: 1,
    fingerprint: "sha256:f2903bc8",
    rotatedAt: Date.now() - 40 * 86400_000,
    rotatedBy: "Arafat Rahman",
    rotationPolicyDays: 180,
    health: "healthy",
    lastVerifiedAt: Date.now() - 10 * 60_000,
    minLength: 32,
    placeholderHint: "Paste 32+ byte base64/hex KMS key…",
    docsNote: "Injected via host KMS / secret manager to encrypt integration secrets at rest.",
  },
];

export interface SecretValidation {
  valid: boolean;
  strength: "weak" | "good" | "strong";
  issues: string[];
}

export function validateSecretDraft(raw: string, minLength: number): SecretValidation {
  const issues: string[] = [];
  if (!raw) return { valid: false, strength: "weak", issues: ["Enter a new secret value to write to the backend vault."] };
  if (raw !== raw.trim()) issues.push("Leading or trailing whitespace detected — trim before committing.");
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    issues.push("Remove wrapping quotes; store only the raw credential.");
  }
  if (/^https?:\/\//i.test(raw.trim())) {
    issues.push("Looks like a URL rather than a secret token or private key.");
  }
  if (raw.trim().length < minLength) {
    issues.push(`Minimum length is ${minLength} characters (currently ${raw.trim().length}).`);
  }
  const classes = [/[a-z]/.test(raw), /[A-Z]/.test(raw), /\d/.test(raw), /[^a-zA-Z0-9]/.test(raw)].filter(Boolean).length;
  const strength: SecretValidation["strength"] = raw.length >= Math.max(32, minLength) && classes >= 3
    ? "strong"
    : raw.length >= minLength && classes >= 2
      ? "good"
      : "weak";

  return { valid: issues.length === 0, strength, issues };
}

export interface VaultCommitResponse {
  fingerprint: string;
  rotatedAt: number;
  mode: "remote-api";
}

/**
 * Write-only secret dispatch.
 * - Sends `rawValue` over HTTPS POST to `VITE_ADMIN_API_URL/admin/secrets/:key` when a backend is attached.
 * - Never writes `rawValue` (or any substring of `rawValue`) to localStorage, sessionStorage, cookies, or logs.
 */
export async function commitSecretToBackendVault(params: {
  key: string;
  rawValue: string;
  env: VaultEnv;
}): Promise<VaultCommitResponse> {
  const apiBase = process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, "");
  if (apiBase) {
    const res = await fetch(`${apiBase}/admin/secrets/${encodeURIComponent(params.key)}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: params.rawValue, env: params.env }),
    });
    if (!res.ok) throw new Error(`Backend vault rejected write (HTTP ${res.status})`);
    const body = (await res.json()) as { fingerprint: string; rotatedAt?: number };
    return {
      fingerprint: body.fingerprint,
      rotatedAt: body.rotatedAt ?? Date.now(),
      mode: "remote-api",
    };
  }

  throw new Error("Backend not connected. No credential has been stored.");
}

export const SERVER_ENV_SPEC = `# ============================================================================
# BACKEND-ONLY SECRETS (.env.server / Host Secret Manager — NEVER prefix VITE_)
# ============================================================================
# Any variable prefixed with VITE_ is bundled into browser JavaScript by Vite.
# Keep ALL credentials below strictly on the backend / Cloudflare Worker / KMS:

VAULT_KMS_MASTER_KEY=
ADMIN_JWT_SIGNING_SECRET=

# bKash Tokenized Checkout (Server-to-Server)
BKASH_APP_KEY=
BKASH_APP_SECRET=
BKASH_WEBHOOK_HMAC_SECRET=

# Nagad Merchant PGW
NAGAD_MERCHANT_PRIVATE_KEY=

# Bangladesh Courier APIs
STEADFAST_API_SECRET=
PATHAO_CLIENT_SECRET=

# OTP & Transactional Messaging
SMS_OTP_GATEWAY_API_KEY=
WHATSAPP_CLOUD_ACCESS_TOKEN=
`;
