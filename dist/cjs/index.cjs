"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.js
var index_exports = {};
__export(index_exports, {
  invokeFromDir: () => invokeFromDir
});
module.exports = __toCommonJS(index_exports);

// src/invoke-from-dir.js
var import_node_path = __toESM(require("node:path"), 1);
var import_promises = __toESM(require("node:fs/promises"), 1);
var import_node_url = require("node:url");
async function getFilesRecursively(dirPath, arrayOfFiles = []) {
  const entries = await import_promises.default.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = import_node_path.default.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await getFilesRecursively(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  }
  return arrayOfFiles;
}
__name(getFilesRecursively, "getFilesRecursively");
async function invokeFromDir(directoryPath, ...args) {
  const allFiles = await getFilesRecursively(directoryPath);
  const allowedExtensions = [".js", ".mjs", ".cjs"];
  const validFiles = allFiles.filter((file) => {
    const ext = import_node_path.default.extname(file).toLowerCase();
    const isAllowedExt = allowedExtensions.includes(ext);
    const isTestFile = file.endsWith(".test.js") || file.endsWith(".spec.js");
    return isAllowedExt && !isTestFile;
  });
  validFiles.sort(
    (a, b) => a.localeCompare(b, void 0, { numeric: true, sensitivity: "base" })
  );
  for (const filePath of validFiles) {
    const fileUrl = (0, import_node_url.pathToFileURL)(filePath).href;
    const module2 = await import(fileUrl);
    const isFunction = typeof module2.default === "function";
    const isClass = isFunction && module2.default.toString().startsWith("class");
    if (isFunction && !isClass) {
      await module2.default(...args);
    }
  }
}
__name(invokeFromDir, "invokeFromDir");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  invokeFromDir
});
