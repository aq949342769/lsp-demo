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
import { generateDiagosticByNode } from './utils/diagnosticGenerator';
import { ProblemType } from './problemType';
import { ProgramManager } from './modules/ProgramManager';
import { lazyComponentChecker } from './checker/lazyComponentChecker';
import { eventHandlerChecker } from './checker/eventHandlerChecker';
import { batchSetStateChecker } from './checker/batchSetStateChecker';

const connManager = new ConnectionManager()
const docManager = new DocumentManager(connManager)

/** 开发阶段不使用这个钩子，有点卡 */
// docManager.documents.onDidChangeContent(change => {
// 	checkDocument(change.document);
// });
docManager.documents.onDidSave(change => {
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
function visit(node: ts.Node, callSet: Set<string>, diagnostics: Diagnostic[], checker: ts.TypeChecker) {
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
		diagnostics.push(...memoComponentChecker(node, callSet));

		// const ddd = middlePropsChecker(node, checker)

		function middlePropsChecker(node: ts.Node, checker: ts.TypeChecker) {
			const typeNode = getComponentPropsNode(node)
			const map = typeNode && propsToIdentifierMap(typeNode, checker)
			getPropsUsedInComponents(node)
		}

		/**
		 * 传入一个 jsxElement NodeObject
		 */
		function isNativeJSXElement(node: ts.Node): boolean {
			const openJSXElment = node.getChildAt(0)
			if (!ts.isJsxOpeningElement(openJSXElment)) {
				return false
			}
			return /\b[a-z]/g.test(openJSXElment.tagName.getText());
		}

		function getUsedProp(node: ts.Node, usedSet: Set<string>) {
			if (ts.isJsxElement(node)) {
				if (!isNativeJSXElement(node)) {
					return;
				}
				const attibutes = node.getChildAt(1)
				attibutes.forEachChild(node => {
					usedSet.add(node.getText())
				})

			}


		}
		/** 获取 JSX 中使用过的 props */
		function getPropsUsedInComponents(node: ts.Node) {
			const usedSet = new Set<string>();
			walk(node, usedSet)
			function walk(node: ts.Node, usedSet: Set<string>) {
				const childrens = node.getChildren();
				if (childrens.length === 0) {
					return
				}
				if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxExpression(node)) {
					getUsedProp(node, usedSet)
				}
				childrens.forEach(child => {
					walk(child, usedSet)
				})
			}

		}
		/** 获取 props 节点 */
		function getComponentPropsNode(node: ts.Node): ts.Node | undefined {
			if (!isComponentNode(node)) {
				return
			}
			const childrens = node.getChildren()
			if (childrens.length === 0) {
				return undefined
			}
			for (let child of childrens) {
				if (ts.isParameter(child) && child.name.getText() === 'props') {
					return node.getChildAt(2)
				}
			}
		}
		/** 获取 props 包含的属性 */
		function propsToIdentifierMap(node: ts.Node, checker: ts.TypeChecker): Map<string, string> | undefined {
			const identifiers = new Map<string, string>();
			const type = checker.getTypeAtLocation(node);

			if (ts.isTypeReferenceNode(node)) {

				const members = type.symbol?.members
				if (members) {
					members.forEach((v, k) => identifiers.set((k as string), 'props'))
				}
				return identifiers
			}
			if (ts.isTypeLiteralNode(node)) {
				const propertys = node.getChildren();
				propertys.forEach(prop => {
					if (ts.isPropertySignature(prop))
						identifiers.set(prop.name.getText(), 'props')
				})
				return identifiers
			}
		}

	}

	ts.forEachChild(node, (node) => visit(node, callSet, diagnostics, checker))
}


