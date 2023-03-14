import {
	TextDocuments,
	Diagnostic,
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import { ComponentType } from './problemType';
import { fileURLToPath } from 'url';
import { checkJSX } from './checker/checkJSX';
import { referencePropsChecker } from './checker/referencePropsChecker';
import { regexChecker } from './checker/regexChecker';
import { createProgram, forEachChild, ModuleKind, Node, ScriptTarget, SyntaxKind } from 'typescript';
import { memoComponentChecker } from './checker/memoComponentChecker';
import { ConnectionManager } from './modules/ConnectManager';
import { DocumentManager } from './modules/DocumentManager';

const connManager = new ConnectionManager()
const docManager = new DocumentManager(connManager)
docManager.documents.onDidChangeContent(change => {
	checkDocument(change.document);
});

async function checkDocument(textDocument: TextDocument): Promise<void> {
	/** 诊断收集 */
	const diagnostics: Diagnostic[] = [];

	let program = createProgram([
		fileURLToPath(textDocument.uri),
		fileURLToPath('file:///Users/xiaoyidao/lunwen/my-app/src/type.d.ts'),
		// fileURLToPath('file:///Users/xiaoyidao/lunwen/my-app/src/index.tsx'),
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

					const dd = memoComponentChecker(node, callSet)
					diagnostics.push(...dd);

				}
			}

			childrens.forEach(node => visit(node, callSet))
		}
	}
	diagnostics.push(...regexChecker(textDocument));

	connManager.connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });

}



