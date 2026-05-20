import axios from "axios";
import crypto from "crypto";
import { config } from "../config.js";

const ALIDNS_ENDPOINT = "https://alidns.aliyuncs.com";

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function sign(params: Record<string, string>, accessKeySecret: string): string {
  const sortedKeys = Object.keys(params).sort();
  const canonicalQueryString = sortedKeys
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join("&");

  const stringToSign = `GET&${percentEncode("/")}&${percentEncode(canonicalQueryString)}`;
  const signature = crypto
    .createHmac("sha1", `${accessKeySecret}&`)
    .update(stringToSign)
    .digest("base64");

  return signature;
}

function buildCommonParams(action: string): Record<string, string> {
  return {
    Format: "JSON",
    Version: "2015-01-09",
    AccessKeyId: config.aliAccessKeyId,
    SignatureMethod: "HMAC-SHA1",
    Timestamp: new Date().toISOString(),
    SignatureVersion: "1.0",
    SignatureNonce: crypto.randomUUID(),
    Action: action,
  };
}

async function request(action: string, params: Record<string, string>): Promise<any> {
  const commonParams = buildCommonParams(action);
  const allParams = { ...commonParams, ...params };
  allParams.Signature = sign(allParams, config.aliAccessKeySecret);

  const queryString = Object.entries(allParams)
    .map(([k, v]) => `${percentEncode(k)}=${percentEncode(v)}`)
    .join("&");

  const url = `${ALIDNS_ENDPOINT}/?${queryString}`;
  const response = await axios.get(url, { timeout: 30000 });
  return response.data;
}

export async function addDomainRecord(
  domainName: string,
  rr: string,
  value: string,
  type = "TXT"
): Promise<string> {
  const data = await request("AddDomainRecord", {
    DomainName: domainName,
    RR: rr,
    Type: type,
    Value: value,
  });
  return data.RecordId as string;
}

export async function deleteDomainRecord(recordId: string): Promise<void> {
  await request("DeleteDomainRecord", {
    RecordId: recordId,
  });
}

export async function describeDomainRecords(
  domainName: string,
  rr?: string,
  type?: string
): Promise<Array<{ RecordId: string; RR: string; Value: string; Type: string }>> {
  const params: Record<string, string> = { DomainName: domainName };
  if (rr) params.RRKeyWord = rr;
  if (type) params.TypeKeyWord = type;

  const data = await request("DescribeDomainRecords", params);
  return data.DomainRecords?.Record || [];
}
