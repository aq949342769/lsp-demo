import {
	Diagnostic,
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import { fileURLToPath } from 'url';
import { referencePropsChecker } from './checker/referencePropsChecker';
import { regexChecker } from './checker/regexChecker';
import * as ts from 'typescript';
import { memoComponentChecker } from './checker/memoComponentChecker';
import { ConnectionManager } from './modules/ConnectManager';
import { DocumentManager } from './modules/DocumentManager';
import { isComponentNode } from './utils/common';
import { ProgramManager } from './modules/ProgramManager';
import { lazyComponentChecker } from './checker/lazyComponentChecker';
import { eventHandlerChecker } from './checker/eventHandlerChecker';
import { batchSetStateChecker } from './checker/batchSetStateChecker';
import { onDemandHookChecker } from './checker/demandHookChecker';
import { contextChecker } from './checker/contextChecker';

const connManager = new ConnectionManager()
const docManager = new DocumentManager(connManager)

/** 开发阶段不使用这个钩子，有点卡 */
docManager.documents.onDidOpen(change => {
	checkDocument(change.document);
});
docManager.documents.onDidSave(change => {
	checkDocument(change.document)
})
docManager.documents.onDidChangeContent(change => {
	checkDocument(change.document)
})

let programManager: ProgramManager | null = null

async function checkDocument(textDocument: TextDocument) {
	if (!programManager) {
		programManager = new ProgramManager('src')
	}
	const program = programManager.watchPrograom
	const checker = programManager.checker
	if (!program || !checker) return;
	/** 诊断收集 */
	const diagnostics: Diagnostic[] = [];

	// 正则收集诊断
	diagnostics.push(...regexChecker(textDocument));

	const file = program?.getSourceFile(fileURLToPath(textDocument.uri))

	if (file && !file?.isDeclarationFile) {
		const callSet = new Set<string>();
		visit(file, callSet, diagnostics, checker)
	}
	

	connManager.connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });

}

/** 遍历语法树（AST）生成诊断 
 * @param node 当前 AST 节点
 * @param callSet 函数调用集合
 * @param diagnostics 诊断数组，有副作用
*/
function visit(
	node: ts.Node,
	callSet: Set<string>,
	diagnostics: Diagnostic[],
	checker: ts.TypeChecker) {
	// 收集被调用的函数名，目前只在判断 React.memo 中用到
	if (ts.isCallExpression(node)) {
		const funcName = /memo\((\w+)\)/g.exec(node.getFullText())?.[1]
		funcName && callSet.add(funcName)

		diagnostics.push(...batchSetStateChecker(node, checker))
	}
	if (ts.isImportClause(node)) {
		diagnostics.push(...lazyComponentChecker(node, checker))
	}
	if (ts.isJsxAttribute(node)) {
		diagnostics.push(...eventHandlerChecker(node))
	}
	if (isComponentNode(node)) {
		diagnostics.push(...referencePropsChecker(node, checker))
		diagnostics.push(...memoComponentChecker(node, callSet))
    diagnostics.push(...onDemandHookChecker(node, checker))
		diagnostics.push(...contextChecker(node, checker))

	}

	ts.forEachChild(node, (node) => visit(node, callSet, diagnostics, checker))
}


