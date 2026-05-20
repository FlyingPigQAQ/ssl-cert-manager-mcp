import { z } from "zod";
import * as ssh from "../clients/sshClient.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

export const name = "deploy_certificate";

export const description =
  "Deploy an SSL certificate and private key to a remote server via SSH/SFTP. Supports PEM content directly or local file paths.";

export const inputSchema = z.object({
  host: z.string().describe("Remote server hostname or IP"),
  port: z.number().optional().describe("SSH port (default: 22)"),
  username: z.string().optional().describe("SSH username (default: root or SSH_USER env)"),
  privateKeyPath: z.string().optional().describe("Path to SSH private key"),
  password: z.string().optional().describe("SSH password (if not using key auth)"),
  cert: z.string().describe("Certificate PEM content or local file path"),
  key: z.string().describe("Private key PEM content or local file path"),
  remoteDir: z.string().optional().describe("Remote directory to upload certificates (e.g., /etc/nginx/ssl). Will be auto-created if it does not exist."),
  certFilename: z.string().optional().default("cert.pem").describe("Remote filename for certificate (used with remoteDir)"),
  keyFilename: z.string().optional().default("key.pem").describe("Remote filename for private key (used with remoteDir)"),
  certRemotePath: z.string().optional().describe("Full remote path for the certificate file (e.g., /etc/nginx/ssl/example.com.crt). Overrides remoteDir + certFilename."),
  keyRemotePath: z.string().optional().describe("Full remote path for the private key file (e.g., /etc/nginx/ssl/example.com.key). Overrides remoteDir + keyFilename."),
});

function looksLikeFilePath(input: string): boolean {
  return input.includes(path.sep) || input.startsWith("~/") || input.startsWith("/");
}

async function resolveContent(input: string): Promise<string> {
  if (!looksLikeFilePath(input)) {
    return input;
  }
  const resolved = input.startsWith("~") ? input.replace("~", os.homedir()) : input;
  return await fs.readFile(resolved, "utf-8");
}

function normalizeRemoteDir(dir: string): string {
  return dir.replace(/\/$/, "");
}

function getParentDir(remotePath: string): string {
  const lastSlash = remotePath.lastIndexOf("/");
  return lastSlash > 0 ? remotePath.slice(0, lastSlash) : "/";
}

export async function handler(args: z.infer<typeof inputSchema>): Promise<any> {
  const certContent = await resolveContent(args.cert);
  const keyContent = await resolveContent(args.key);

  const sshOptions: ssh.SSHOptions = {
    host: args.host,
    port: args.port,
    username: args.username,
    privateKeyPath: args.privateKeyPath,
    password: args.password,
  };

  // Determine final remote paths
  const remoteCertPath = args.certRemotePath || `${normalizeRemoteDir(args.remoteDir || "/tmp")}/${args.certFilename}`;
  const remoteKeyPath = args.keyRemotePath || `${normalizeRemoteDir(args.remoteDir || "/tmp")}/${args.keyFilename}`;

  // Ensure parent directories exist
  const certDir = getParentDir(remoteCertPath);
  const keyDir = getParentDir(remoteKeyPath);
  await ssh.ensureRemoteDir(sshOptions, certDir);
  if (keyDir !== certDir) {
    await ssh.ensureRemoteDir(sshOptions, keyDir);
  }

  await ssh.writeRemoteFile(sshOptions, remoteCertPath, certContent);
  await ssh.writeRemoteFile(sshOptions, remoteKeyPath, keyContent);

  return {
    content: [
      {
        type: "text",
        text: `Certificate deployed to ${args.host}\n- ${remoteCertPath}\n- ${remoteKeyPath}`,
      },
    ],
    structuredContent: {
      host: args.host,
      remoteDir: args.remoteDir,
      uploadedFiles: [remoteCertPath, remoteKeyPath],
    },
  };
}
