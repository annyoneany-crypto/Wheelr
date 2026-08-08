/**
 * Runs the Gradle wrapper in android/ with whatever tasks are passed through.
 *
 * npm scripts run under cmd.exe on Windows, which does not resolve executables
 * from the current directory, so a plain `cd android && gradlew ...` fails with
 * "gradlew is not recognized". Resolving the wrapper to an absolute path avoids
 * that and keeps the script working on POSIX shells too.
 */
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const androidDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'android');
const wrapper = resolve(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');

// Node refuses to spawn .bat/.cmd files without a shell (EINVAL), so Windows goes
// through cmd.exe — hence the quoting, in case the checkout path contains spaces.
const isWindows = process.platform === 'win32';

const { status, error } = spawnSync(isWindows ? `"${wrapper}"` : wrapper, process.argv.slice(2), {
  cwd: androidDir,
  stdio: 'inherit',
  shell: isWindows
});

if (error) {
  console.error(`Could not run the Gradle wrapper at ${wrapper}:`, error.message);
  process.exit(1);
}

process.exit(status ?? 1);
