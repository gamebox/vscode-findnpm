import * as vscode from "vscode";

export interface NPMPackage extends vscode.QuickPickItem {
  packageName: string;
}

export type Dictionary = {
  [key: string]: string;
};

export interface PackageDetails {
  uri: vscode.Uri;
  package: Dictionary;
}

export interface QuickPickPackage extends vscode.QuickPickItem {
  package: PackageDetails;
}

export enum PackageAction {
  install,
  installSave,
  installDev
}
