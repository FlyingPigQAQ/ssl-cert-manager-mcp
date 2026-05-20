import acme from "acme-client";
import { config } from "../config.js";
import * as aliDns from "./aliDnsClient.js";
import fs from "fs/promises";
import path from "path";

// Minimal interface matching acme-client's Challenge type for DNS-01
interface Challenge {
  type: string;
  url: string;
  status: string;
  token: string;
}

export interface ApplyCertResult {
  cert: string;
  key: string;
  chain: string;
  expiresAt: string;
  certPath?: string;
  keyPath?: string;
  chainPath?: string;
}

function getDomainFromAuthz(authz: acme.Authorization): string {
  return authz.identifier.value;
}

function getRecordName(domain: string): string {
  return `_acme-challenge.${domain}`;
}

function getRootDomain(domain: string): string {
  const parts = domain.split(".");
  if (parts.length <= 2) return domain;
  return parts.slice(-2).join(".");
}

async function createDnsChallenge(
  _authz: acme.Authorization,
  _challenge: Challenge,
  keyAuthorization: string
): Promise<void> {
  const domain = getDomainFromAuthz(_authz);
  const recordName = getRecordName(domain);
  const rootDomain = getRootDomain(domain);
  const rr = recordName.replace(`.${rootDomain}`, "");

  await aliDns.addDomainRecord(rootDomain, rr, keyAuthorization, "TXT");

  // Wait for DNS propagation
  await new Promise((resolve) => setTimeout(resolve, 15000));
}

async function removeDnsChallenge(
  _authz: acme.Authorization,
  _challenge: Challenge,
  _keyAuthorization: string
): Promise<void> {
  const domain = getDomainFromAuthz(_authz);
  const recordName = getRecordName(domain);
  const rootDomain = getRootDomain(domain);

  const records = await aliDns.describeDomainRecords(rootDomain, recordName, "TXT");
  for (const record of records) {
    if (record.Value === _keyAuthorization) {
      await aliDns.deleteDomainRecord(record.RecordId);
    }
  }
}

export async function applyCertificate(
  domain: string,
  email: string,
  staging = false,
  saveToDir?: string
): Promise<ApplyCertResult> {
  const directoryUrl = staging
    ? "https://acme-staging-v02.api.letsencrypt.org/directory"
    : config.acmeDirectoryUrl;

  const accountKey = await acme.forge.createPrivateKey();
  const client = new acme.Client({
    directoryUrl,
    accountKey,
  });

  const [key, csr] = await acme.forge.createCsr({
    commonName: domain,
  });

  const cert = await client.auto({
    csr,
    email,
    termsOfServiceAgreed: true,
    challengePriority: ["dns-01"],
    challengeCreateFn: createDnsChallenge,
    challengeRemoveFn: removeDnsChallenge,
  });

  // client.auto() returns the full certificate chain
  const certInfo = await acme.forge.readCertificateInfo(cert);
  const expiresAt = certInfo.notAfter?.toISOString() || "";

  const result: ApplyCertResult = {
    cert,
    key: String(key),
    chain: cert,
    expiresAt,
  };

  if (saveToDir) {
    await fs.mkdir(saveToDir, { recursive: true });
    const sanitizedDomain = domain.replace(/^\*\./, "wildcard_").replace(/\./g, "_");
    const certPath = path.join(saveToDir, `${sanitizedDomain}_cert.pem`);
    const keyPath = path.join(saveToDir, `${sanitizedDomain}_key.pem`);
    const chainPath = path.join(saveToDir, `${sanitizedDomain}_chain.pem`);

    await fs.writeFile(certPath, cert, "utf-8");
    await fs.writeFile(keyPath, String(key), "utf-8");
    await fs.writeFile(chainPath, cert, "utf-8");

    result.certPath = certPath;
    result.keyPath = keyPath;
    result.chainPath = chainPath;
  }

  return result;
}
