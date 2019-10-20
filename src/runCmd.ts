const spawnCMD = require("spawn-command");

export default function runCmd(shell: string, cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = cwd === undefined ? {} : { cwd };
    const process = spawnCMD(shell, options);
    let data = "";
    let error = "";
    process.stdout.on("data", (d: string) => {
      data += d;
    });
    process.stderr.on("data", (d: string) => {
      error += d;
    });
    process.stdout.on("close", (status: boolean) => {
      return status ? reject(error) : resolve(data);
    });
  });
}
