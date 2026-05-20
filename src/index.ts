#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

import * as applyCert from "./tools/applyCert.js";
import * as aliDnsVerify from "./tools/aliDnsVerify.js";
import * as deployCert from "./tools/deployCert.js";
import * as execRemote from "./tools/execRemote.js";
import * as sendEmail from "./tools/sendEmail.js";

const TOOLS: Tool[] = [
  {
    name: applyCert.name,
    description: applyCert.description,
    inputSchema: {
      type: "object",
      properties: {
        domain: { type: "string", description: "The domain name to request a certificate for" },
        email: { type: "string", description: "Contact email for the ACME account" },
        staging: { type: "boolean", description: "Use Let's Encrypt staging environment" },
        saveToDir: { type: "string", description: "Local directory to save certificate files" },
      },
      required: ["domain", "email"],
    },
  },
  {
    name: aliDnsVerify.name,
    description: aliDnsVerify.description,
    inputSchema: {
      type: "object",
      properties: {
        domain: { type: "string", description: "The root domain managed in Aliyun DNS" },
        rr: { type: "string", description: "The record name / host" },
        value: { type: "string", description: "The TXT record value" },
        action: { type: "string", enum: ["add", "remove"], description: "Add or remove the TXT record" },
      },
      required: ["domain", "rr", "value", "action"],
    },
  },
  {
    name: deployCert.name,
    description: deployCert.description,
    inputSchema: {
      type: "object",
      properties: {
        host: { type: "string", description: "Remote server hostname or IP" },
        port: { type: "number", description: "SSH port" },
        username: { type: "string", description: "SSH username" },
        privateKeyPath: { type: "string", description: "Path to SSH private key" },
        password: { type: "string", description: "SSH password" },
        cert: { type: "string", description: "Certificate PEM content or local file path" },
        key: { type: "string", description: "Private key PEM content or local file path" },
        remoteDir: { type: "string", description: "Remote directory to upload certificates (auto-created)" },
        certFilename: { type: "string", description: "Remote filename for certificate (used with remoteDir)" },
        keyFilename: { type: "string", description: "Remote filename for private key (used with remoteDir)" },
        certRemotePath: { type: "string", description: "Full remote path for certificate (overrides remoteDir+certFilename)" },
        keyRemotePath: { type: "string", description: "Full remote path for private key (overrides remoteDir+keyFilename)" },
      },
      required: ["host", "cert", "key"],
    },
  },
  {
    name: execRemote.name,
    description: execRemote.description,
    inputSchema: {
      type: "object",
      properties: {
        host: { type: "string", description: "Remote server hostname or IP" },
        port: { type: "number", description: "SSH port" },
        username: { type: "string", description: "SSH username" },
        privateKeyPath: { type: "string", description: "Path to SSH private key" },
        password: { type: "string", description: "SSH password" },
        command: { type: "string", description: "Shell command to execute" },
        timeout: { type: "number", description: "Timeout in milliseconds" },
      },
      required: ["host", "command"],
    },
  },
  {
    name: sendEmail.name,
    description: sendEmail.description,
    inputSchema: {
      type: "object",
      properties: {
        to: {
          oneOf: [
            { type: "string", description: "Recipient email address" },
            { type: "array", items: { type: "string" }, description: "Recipient email addresses" },
          ],
          description: "Recipient email address(es)",
        },
        subject: { type: "string", description: "Email subject" },
        body: { type: "string", description: "Email body text" },
        attachments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              filename: { type: "string" },
              content: { type: "string" },
            },
            required: ["filename", "content"],
          },
          description: "Optional file attachments",
        },
      },
      required: ["to", "subject", "body"],
    },
  },
];

const server = new Server(
  { name: "ssl-cert-manager-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name: toolName, arguments: args } = request.params;

  try {
    switch (toolName) {
      case applyCert.name:
        return await applyCert.handler(applyCert.inputSchema.parse(args));
      case aliDnsVerify.name:
        return await aliDnsVerify.handler(aliDnsVerify.inputSchema.parse(args));
      case deployCert.name:
        return await deployCert.handler(deployCert.inputSchema.parse(args));
      case execRemote.name:
        return await execRemote.handler(execRemote.inputSchema.parse(args));
      case sendEmail.name:
        return await sendEmail.handler(sendEmail.inputSchema.parse(args));
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message || String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SSL Cert Manager MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
