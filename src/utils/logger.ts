type LogLevels = "debug" | "info" | "warning" | "error" | "fatal";

const ENABLE_LOGGING = true;

export function logger(func: () => void, level: LogLevels) {
  if (level === "fatal" || level === "error") {
    console.error(`${Date.now} (${level})`);
    func();
  } else if (ENABLE_LOGGING) {
    console.log(`${new Date().toLocaleTimeString()} (${level})`);
    func();
  }
}
