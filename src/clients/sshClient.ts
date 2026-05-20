import { Client } from "ssh2";
import fs from "fs/promises";
import { config } from "../config.js";

export interface SSHOptions {
  host: string;
  port?: number;
  username?: string;
  privateKeyPath?: string;
  password?: string;
}

async function getPrivateKey(options: SSHOptions): Promise<string | Buffer> {
  if (options.password) {
    return options.password;
  }
  const keyPath = options.privateKeyPath || config.sshPrivateKeyPath;
  return await fs.readFile(keyPath, "utf-8");
}

export async function executeCommand(
  options: SSHOptions,
  command: string,
  timeoutMs = 60000
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const privateKey = await getPrivateKey(options);

  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      conn.end();
      reject(new Error(`SSH command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    conn.on("ready", () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(timer);
          conn.end();
          reject(err);
          return;
        }

        stream
          .on("close", (code: number) => {
            clearTimeout(timer);
            conn.end();
            resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code ?? -1 });
          })
          .on("data", (data: Buffer) => {
            stdout += data.toString();
          })
          .stderr.on("data", (data: Buffer) => {
            stderr += data.toString();
          });
      });
    });

    conn.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    conn.connect({
      host: options.host,
      port: options.port || config.sshPort,
      username: options.username || config.sshUser,
      privateKey: typeof privateKey === "string" && !options.password ? privateKey : undefined,
      password: options.password ? privateKey as string : undefined,
      readyTimeout: timeoutMs,
    });
  });
}

export async function uploadFile(
  options: SSHOptions,
  localPath: string,
  remotePath: string
): Promise<void> {
  const privateKey = await getPrivateKey(options);

  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on("ready", () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          reject(err);
          return;
        }

        sftp.fastPut(localPath, remotePath, (err2) => {
          conn.end();
          if (err2) {
            reject(err2);
          } else {
            resolve();
          }
        });
      });
    });

    conn.on("error", (err) => {
      reject(err);
    });

    conn.connect({
      host: options.host,
      port: options.port || config.sshPort,
      username: options.username || config.sshUser,
      privateKey: typeof privateKey === "string" && !options.password ? privateKey : undefined,
      password: options.password ? privateKey as string : undefined,
    });
  });
}

export async function ensureRemoteDir(
  options: SSHOptions,
  remoteDir: string
): Promise<void> {
  await executeCommand(options, `mkdir -p ${remoteDir}`, 10000);
}

export async function writeRemoteFile(
  options: SSHOptions,
  remotePath: string,
  content: string
): Promise<void> {
  const privateKey = await getPrivateKey(options);

  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on("ready", () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          reject(err);
          return;
        }

        const stream = sftp.createWriteStream(remotePath);
        stream.on("error", (e: Error) => {
          conn.end();
          reject(e);
        });
        stream.on("close", () => {
          conn.end();
          resolve();
        });
        stream.end(content);
      });
    });

    conn.on("error", (err) => {
      reject(err);
    });

    conn.connect({
      host: options.host,
      port: options.port || config.sshPort,
      username: options.username || config.sshUser,
      privateKey: typeof privateKey === "string" && !options.password ? privateKey : undefined,
      password: options.password ? privateKey as string : undefined,
    });
  });
}
