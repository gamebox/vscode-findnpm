// Pure, functional utilities

import { NPMPackage, Dictionary, PackageDetails, PackageAction } from "./types";

export function packagesFromString(data: string): NPMPackage[] {
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

export function packageToQuickPick(pkg: PackageDetails) {
  return {
    label: pkg.package["name"] || "No name",
    package: pkg
  };
}

export function flagsFromAction(action: PackageAction): string | undefined {
  switch (action) {
    case PackageAction.install:
      return undefined;
    case PackageAction.installSave:
      return "-S";
    case PackageAction.installDev:
      return "-D";
  }
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

function rawPackageMap(line: string, columns: string[]): Dictionary {
  return processLine(line).reduce((map, val, idx) => {
    return {
      ...map,
      [columns[idx]]: val === "" ? undefined : val
    };
  }, {});
}

function npmPackage(pkg: Dictionary): NPMPackage {
  return {
    label: pkg["NAME"] || "[No name]",
    detail: pkg["DESCRIPTION"] || "[No Description]",
    packageName: pkg["NAME"],
    description: pkg["VERSION"] || "[No Version]"
  };
}

function mergePackage(npm: NPMPackage, pkg: Dictionary): NPMPackage {
  return {
    ...npm,
    detail: [npm.detail, pkg["DESCRIPTION"]].join(" ").trim()
  };
}

function hasNoName(pkg: Dictionary): boolean {
  return pkg["NAME"] === undefined;
}
