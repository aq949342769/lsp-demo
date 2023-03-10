import {
	createConnection,
	TextDocuments,
	Diagnostic,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	TextDocumentSyncKind,
	InitializeResult,
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import { ComponentType, ProblemType } from './problemType';
import { fileURLToPath } from 'url';
import { checkJSX } from './checker/checkJSX';
import { referencePropsChecker } from './checker/referencePropsChecker';
import { regexChecker } from './checker/regexChecker';
import { createProgram, forEachChild, ModuleKind, Node, ScriptTarget, SyntaxKind, TypeChecker } from 'typescript';
import * as ts from 'typescript'
import { generateDiagosticByNode } from './utils/diagnosticGenerator';


// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// // Tell the client that this server supports code completion.
			// completionProvider: {
			// 	resolveProvider: true
			// }
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
export interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.languageServerExample || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'languageServerExample'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	const settings = await getDocumentSettings(textDocument.uri);
	/** 诊断收集 */
	const diagnostics: Diagnostic[] = [];

	let program = createProgram([
		fileURLToPath(textDocument.uri),
		fileURLToPath('file:///Users/xiaoyidao/lunwen/my-app/src/type.d.ts'
		)
	], { target: ScriptTarget.ES2015, module: ModuleKind.CommonJS })
	let checker = program.getTypeChecker()

	const fileList = program.getSourceFiles()
	for (const file of fileList) {
		if (!file.isDeclarationFile) {
			/** 收集调用表达式，如 memo(foo), 那么 foo 函数的签名放入 set */
			const callSet = new Set<string>()
			forEachChild(file, (node) => visit(node, callSet))
		}
	}
	function visit(node: Node, callSet: Set<string>) {
		const childrens = node.getChildren();
		if (childrens.length === 0) {
			return;
		} else {
			// 收集被调用的函数名
			if (node.kind === SyntaxKind.CallExpression) {
				const funcName = /memo\((\w+)\)/g.exec(node.getFullText())?.[1]
				funcName && callSet.add(funcName)
			}
			// 判断组件的警告
			if (ComponentType.includes(node.kind)) {
				if (checkJSX(node)) {
					const d = referencePropsChecker(node, checker)
					diagnostics.push(...d)

					const dd = generateMemoDiag(node, callSet)
					diagnostics.push(...dd);


					/** 判断函数组件有无用 memo 包裹 */
					function generateMemoDiag(node: Node, callSet: Set<string>) {
						console.log(SyntaxKind[node.kind]);
						
						if(node.kind === SyntaxKind.ClassDeclaration) {
							return [];
						}
						const parentKind = node.parent.kind
						const parentSignature = node.parent.getFullText();
						const type = ['React.memo', 'memo'];
						const isCallByMemo = parentKind === SyntaxKind.CallExpression && type.includes(parentSignature);
						const isCallByContext = callSet.has(node.getFullText());
						if(!isCallByMemo && !isCallByContext) {
							return [generateDiagosticByNode(node, ProblemType.NO_MEMO_COMPONENTS)]
						}
						return []
					}
				}
			}

		
			childrens.forEach(node => visit(node, callSet))
		}
	}
	diagnostics.push(...regexChecker(textDocument, settings));

	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });

}


connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// 绑定文档对象和 lsp connector
documents.listen(connection);

connection.listen();
