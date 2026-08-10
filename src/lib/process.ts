import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function run(
  executable: string,
  args: string[],
  options: { cwd?: string } = {},
): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execFileAsync(executable, args, {
      cwd: options.cwd,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    const details = error as Error & { stdout?: string; stderr?: string };
    throw new Error(
      [
        `Command failed: ${executable} ${args.join(" ")}`,
        details.message,
        details.stdout,
        details.stderr,
      ]
        .filter(Boolean)
        .join("\n"),
      { cause: error },
    );
  }
}
