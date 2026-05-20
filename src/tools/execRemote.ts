import { z } from "zod";
import * as ssh from "../clients/sshClient.js";

export const name = "execute_remote_command";

export const description =
  "Execute a shell command on a remote server via SSH and return stdout, stderr, and exit code.";

export const inputSchema = z.object({
  host: z.string().describe("Remote server hostname or IP"),
  port: z.number().optional().describe("SSH port (default: 22)"),
  username: z.string().optional().describe("SSH username"),
  privateKeyPath: z.string().optional().describe("Path to SSH private key"),
  password: z.string().optional().describe("SSH password"),
  command: z.string().describe("Shell command to execute"),
  timeout: z.number().optional().default(60000).describe("Timeout in milliseconds"),
});

export async function handler(args: z.infer<typeof inputSchema>): Promise<any> {
  const sshOptions: ssh.SSHOptions = {
    host: args.host,
    port: args.port,
    username: args.username,
    privateKeyPath: args.privateKeyPath,
    password: args.password,
  };

  const result = await ssh.executeCommand(sshOptions, args.command, args.timeout);

  return {
    content: [
      {
        type: "text",
        text:
          `Exit code: ${result.exitCode}\n\n` +
          (result.stdout ? `STDOUT:\n${result.stdout}\n` : "") +
          (result.stderr ? `STDERR:\n${result.stderr}` : ""),
      },
    ],
    structuredContent: {
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    },
  };
}
