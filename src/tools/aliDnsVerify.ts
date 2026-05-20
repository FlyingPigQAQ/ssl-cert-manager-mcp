import { z } from "zod";
import * as aliDns from "../clients/aliDnsClient.js";

export const name = "verify_dns";

export const description =
  "Add or remove a DNS TXT record in Aliyun DNS for domain verification. Typically used for ACME DNS-01 challenges.";

export const inputSchema = z.object({
  domain: z.string().describe("The root domain managed in Aliyun DNS (e.g., example.com)"),
  rr: z.string().describe("The record name / host (e.g., _acme-challenge or _acme-challenge.www)"),
  value: z.string().describe("The TXT record value"),
  action: z.enum(["add", "remove"]).describe("Whether to add or remove the TXT record"),
});

export async function handler(args: z.infer<typeof inputSchema>): Promise<any> {
  if (args.action === "add") {
    const recordId = await aliDns.addDomainRecord(args.domain, args.rr, args.value, "TXT");
    return {
      content: [
        {
          type: "text",
          text: `DNS TXT record added. Record ID: ${recordId}`,
        },
      ],
      structuredContent: {
        recordId,
        status: "added",
      },
    };
  } else {
    const records = await aliDns.describeDomainRecords(args.domain, args.rr, "TXT");
    let deletedCount = 0;
    for (const record of records) {
      if (record.Value === args.value) {
        await aliDns.deleteDomainRecord(record.RecordId);
        deletedCount++;
      }
    }
    return {
      content: [
        {
          type: "text",
          text: `Removed ${deletedCount} matching DNS TXT record(s).`,
        },
      ],
      structuredContent: {
        deletedCount,
        status: "removed",
      },
    };
  }
}
