import { z } from "zod";
import { applyCertificate } from "../clients/acmeClient.js";

export const name = "apply_certificate";

export const description =
  "Apply for an SSL/TLS certificate from an ACME CA (e.g., Let's Encrypt) using DNS-01 challenge via Aliyun DNS. Returns the certificate, private key, certificate chain, and expiration date.";

export const inputSchema = z.object({
  domain: z.string().describe("The domain name to request a certificate for (e.g., example.com or *.example.com)"),
  email: z.string().email().describe("Contact email for the ACME account"),
  staging: z.boolean().optional().default(false).describe("Use Let's Encrypt staging environment for testing"),
  saveToDir: z.string().optional().describe("Local directory to save the certificate files (cert.pem, key.pem, chain.pem). If omitted, files are not saved locally."),
});

export async function handler(args: z.infer<typeof inputSchema>): Promise<any> {
  const result = await applyCertificate(args.domain, args.email, args.staging, args.saveToDir);

  const textParts = [
    `Certificate applied successfully for ${args.domain}. Expires at: ${result.expiresAt}`,
  ];
  if (result.certPath) {
    textParts.push(`\nSaved to:`);
    textParts.push(`  Certificate: ${result.certPath}`);
    textParts.push(`  Private key: ${result.keyPath}`);
    textParts.push(`  Chain:       ${result.chainPath}`);
  }

  return {
    content: [
      {
        type: "text",
        text: textParts.join("\n"),
      },
    ],
    structuredContent: {
      domain: args.domain,
      expiresAt: result.expiresAt,
      certLength: result.cert.length,
      keyLength: result.key.length,
      chainLength: result.chain.length,
      certPath: result.certPath,
      keyPath: result.keyPath,
      chainPath: result.chainPath,
    },
  };
}
