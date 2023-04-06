import ts = require("typescript");

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: path => path,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => ts.sys.newLine
};

export function watchMain(configPath: string | undefined) {
  if (!configPath) {
    throw new Error("Could not find a valid 'tsconfig.json'.");
  }

  const createProgram = ts.createSemanticDiagnosticsBuilderProgram;

  const host = ts.createWatchCompilerHost(
    configPath,
    {},
    ts.sys,
    createProgram,
    reportDiagnostic,
    reportWatchStatusChanged
  );


  return ts.createWatchProgram(host);

}

function reportDiagnostic(diagnostic: ts.Diagnostic) {
  // console.error("Error", diagnostic.code, ":", ts.flattenDiagnosticMessageText( diagnostic.messageText, formatHost.getNewLine()));
}


function reportWatchStatusChanged(diagnostic: ts.Diagnostic) {
  // console.info(ts.formatDiagnostic(diagnostic, formatHost));
}
