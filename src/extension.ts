import * as vscode from "vscode";
const spawnCMD = require("spawn-command");

interface NPMPackage extends vscode.QuickPickItem {
  packageName: string;
}

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "extension.findnpm",
    async () => {
      vscode.window.showInformationMessage("Hello World!");
      const query = await vscode.window.showInputBox({
        prompt: "Search terms"
      });
      if (query === undefined) {
        return;
      }

      const selection:
        | NPMPackage
        | undefined = await vscode.window.showQuickPick<NPMPackage>(
        search(query)
      );

      if (selection === undefined) {
        return;
      }

      vscode.env.openExternal(
        vscode.Uri.parse(
          `https://www.npmjs.org/package/${selection.packageName}`
        )
      );
    }
  );

  context.subscriptions.push(disposable);
}

function search(packageName: string): Promise<NPMPackage[]> {
  return new Promise((resolve, reject) => {
    const process = spawnCMD(`npm s --long ${packageName}`);
    let data = "";
    const channel = vscode.window.createOutputChannel("findnpm");
    process.stdout.on("data", (d: string) => {
      data += d;
    });
    process.stdout.on("close", (status: boolean) => {
      if (status === false) {
        const packages = packagesFromString(data);
        channel.appendLine(JSON.stringify(packages));
        resolve(packages);
      } else {
        reject(
          `NPM search failed ${
            status ? "status code" + status : "for some reason."
          }.  Data was ${data}`
        );
      }
    });
  });
}

function processLine(line: string): string[] {
  return line.split(" | ").map(l => l.trim());
}

function processRawString(
  data: string
): { lines: string[]; columns: string[] } {
  const rawLines = data.split("\n");
  const [firstLine, lines] = [rawLines[0], rawLines.slice(1)];
  const columns = processLine(firstLine);
  return { lines, columns };
}

function rawPackageMap(
  line: string,
  columns: string[]
): { [key: string]: string } {
  return processLine(line).reduce((map, val, idx) => {
    return {
      ...map,
      [columns[idx]]: val === "" ? undefined : val
    };
  }, {});
}

function npmPackage(pkg: { [key: string]: string }): NPMPackage {
  return {
    label: pkg["NAME"] || "[No name]",
    detail: pkg["DESCRIPTION"] || "[No Description]",
    packageName: pkg["NAME"],
    description: pkg["VERSION"] || "[No Version]"
  };
}

function mergePackage(
  npm: NPMPackage,
  pkg: { [key: string]: string }
): NPMPackage {
  return {
    ...npm,
    detail: [npm.detail, pkg["DESCRIPTION"]].join(" ").trim()
  };
}

function hasNoName(pkg: { [key: string]: string }): boolean {
  return pkg["NAME"] === undefined;
}

function packagesFromString(data: string): NPMPackage[] {
  const { lines, columns } = processRawString(data);
  return lines.reduce((packages: NPMPackage[], line: string) => {
    const pkg = rawPackageMap(line, columns);
    if (hasNoName(pkg)) {
      return [mergePackage(packages[0], pkg), ...packages.slice(1)];
    } else {
      return [npmPackage(pkg), ...packages];
    }
  }, []);
}

export function deactivate() {}
