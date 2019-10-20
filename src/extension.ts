import * as vscode from "vscode";
import * as fs from "fs";
import runCmd from "./runCmd";
import {
  PackageDetails,
  QuickPickPackage,
  NPMPackage,
  PackageAction
} from "./types";
import {
  packagesFromString,
  packageToQuickPick,
  flagsFromAction
} from "./utils";
const spawnCMD = require("spawn-command");

let channel: vscode.OutputChannel | undefined;

export function activate(context: vscode.ExtensionContext) {
  channel = vscode.window.createOutputChannel("FindNPM");
  const disposables: vscode.Disposable[] = [
    vscode.commands.registerCommand("extension.findnpm.view", viewCommand),
    vscode.commands.registerCommand("extension.findnpm.install", () =>
      installCommand(PackageAction.install)
    ),
    vscode.commands.registerCommand("extension.findnpm.installDev", () =>
      installCommand(PackageAction.installDev)
    ),
    vscode.commands.registerCommand("extension.findnpm.installSave", () =>
      installCommand(PackageAction.installSave)
    ),
    channel
  ];
  context.subscriptions.push(...disposables);
}

async function installCommand(action: PackageAction) {
  const packages: PackageDetails[] = await getPackages();

  const query = await getQuery();
  if (query === undefined) {
    return;
  }

  const selection = await getSelection(query);
  if (selection === undefined) {
    return;
  }

  const target = await getTarget(packages);
  if (target === undefined) {
    vscode.window.showErrorMessage(
      `Can only install packages to npm packages inside of a workspace folder`
    );
    return;
  }

  await installPackage(
    selection.packageName,
    // Below we use the length of '/package.json' to find the root path of the
    // project so we don't rely on OS specific details.  I.e., '\package.json' is
    // the same length.
    target.uri.path.slice(0, target.uri.path.length - "/package.json".length),
    flagsFromAction(action)
  );
}

async function viewCommand() {
  const query = await getQuery();
  if (query === undefined) {
    return;
  }

  const selection = await getSelection(query);
  if (selection === undefined) {
    return;
  }

  vscode.env.openExternal(
    vscode.Uri.parse(`https://www.npmjs.org/package/${selection.packageName}`)
  );
}

async function getPackages(): Promise<PackageDetails[]> {
  const packageJsonUris = await vscode.workspace.findFiles(
    "**/package.json",
    "**/node_modules/**"
  );
  if (channel !== undefined) {
    channel.appendLine(
      `Here are the workspace folders: ${(
        vscode.workspace.workspaceFolders || []
      ).map(f => f.name)}`
    );
  }
  return await Promise.all(
    packageJsonUris.map(uri => fs.promises.readFile(uri.fsPath))
  ).then(buffers => {
    return buffers.map((b, idx) => {
      return {
        uri: packageJsonUris[idx],
        package: JSON.parse(b.toString("UTF-8"))
      };
    });
  });
}

function getQuery(): Thenable<string | undefined> {
  return vscode.window.showInputBox({
    prompt: "Search terms"
  });
}

function getSelection(query: string): Thenable<NPMPackage | undefined> {
  return vscode.window.showQuickPick<NPMPackage>(search(query));
}

async function getTarget(
  packages: PackageDetails[]
): Promise<PackageDetails | undefined> {
  if (packages.length === 1) {
    return packages[0];
  } else if (packages.length > 1) {
    const selected = await vscode.window.showQuickPick<QuickPickPackage>(
      packages.map(packageToQuickPick)
    );
    if (selected === undefined) {
      return;
    }
    return selected.package;
  }

  return undefined;
}

async function installPackage(
  pkg: string,
  cwd: string,
  flags?: string
): Promise<void> {
  try {
    const output = await runCmd(`npm install ${flags || ""} ${pkg}`, cwd);
    vscode.window.showInformationMessage(`Installed ${pkg} successfully.`);
    if (channel !== undefined) {
      channel.appendLine(output);
    }
  } catch (err) {
    if (channel !== undefined) {
      channel.appendLine(`Could not install package to ${cwd}: ${err}`);
    }
  }
}

async function search(packageName: string): Promise<NPMPackage[]> {
  try {
    const data = await runCmd(`npm s --long ${packageName}`);
    return packagesFromString(data);
  } catch (err) {
    if (channel !== undefined) {
      channel.appendLine(`NPM search failed.\n${err}`);
    }
    return [];
  }
}

export function deactivate() {}
