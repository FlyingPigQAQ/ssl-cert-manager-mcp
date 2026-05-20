import dotenv from "dotenv";
import { z } from "zod";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(projectRoot, ".env") });

const configSchema = z.object({
  aliAccessKeyId: z.string().min(1),
  aliAccessKeySecret: z.string().min(1),
  aliRegionId: z.string().default("cn-hangzhou"),

  smtpHost: z.string().optional().default(""),
  smtpPort: z.coerce.number().default(587),
  smtpSecure: z.coerce.boolean().default(false),
  smtpUser: z.string().optional().default(""),
  smtpPass: z.string().optional().default(""),
  smtpFrom: z.string().optional().default(""),

  sshPrivateKeyPath: z.string().default(path.join(os.homedir(), ".ssh", "id_rsa")),
  sshUser: z.string().default("root"),
  sshPort: z.coerce.number().default(22),

  acmeDirectoryUrl: z.string().url().default("https://acme-v02.api.letsencrypt.org/directory"),

  certSaveDir: z.string().optional().default(""),
  defaultRemoteCertDir: z.string().optional().default("/etc/ssl/certs"),
  defaultRemoteKeyDir: z.string().optional().default("/etc/ssl/private"),
});

export const config = configSchema.parse({
  aliAccessKeyId: process.env.ALI_ACCESS_KEY_ID,
  aliAccessKeySecret: process.env.ALI_ACCESS_KEY_SECRET,
  aliRegionId: process.env.ALI_REGION_ID,

  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  smtpSecure: process.env.SMTP_SECURE,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM,

  sshPrivateKeyPath: process.env.SSH_PRIVATE_KEY_PATH,
  sshUser: process.env.SSH_USER,
  sshPort: process.env.SSH_PORT,

  acmeDirectoryUrl: process.env.ACME_DIRECTORY_URL,

  certSaveDir: process.env.CERT_SAVE_DIR,
  defaultRemoteCertDir: process.env.DEFAULT_REMOTE_CERT_DIR,
  defaultRemoteKeyDir: process.env.DEFAULT_REMOTE_KEY_DIR,
});

export type Config = z.infer<typeof configSchema>;
