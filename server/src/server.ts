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

const connManager = new ConnectionManager()
const docManager = new DocumentManager(connManager)
docManager.documents.onDidChangeContent(change => {
	checkDocument(change.document);
});

function checkDocument(textDocument: TextDocument) {
	/** 诊断收集 */
	const diagnostics: Diagnostic[] = [];

	let program = ts.createProgram([
		fileURLToPath(textDocument.uri),
		fileURLToPath('file:///Users/xiaoyidao/lunwen/my-app/src/type.d.ts'),
	], { target: ts.ScriptTarget.ES2015, module: ts.ModuleKind.CommonJS })
	let checker = program.getTypeChecker()

	const fileList = program.getSourceFiles()
	for (const file of fileList) {
		if (!file.isDeclarationFile) {
			/** 收集调用表达式，如 memo(foo), 那么 foo 函数的签名放入 set */
			const callSet = new Set<string>()
			ts.forEachChild(file, (node) => visit(node, callSet))
		}
	}
	function visit(node: ts.Node, callSet: Set<string>) {
		const childrens = node.getChildren();
		if (childrens.length === 0) {
			return;
		} else {
			// 收集被调用的函数名
			if (ts.isClassExpression(node)) {
				const funcName = /memo\((\w+)\)/g.exec(node.getFullText())?.[1]
				funcName && callSet.add(funcName)
			}
			// 判断组件的警告
			if (isComponentNode(node)) {
				diagnostics.push(...referencePropsChecker(node, checker))
				diagnostics.push(...memoComponentChecker(node, callSet));

				const ddd = middlePropsChecker(node, checker)

				function middlePropsChecker(node: ts.Node, checker: ts.TypeChecker) {
					const typeNode = getComponentPropsNode(node)
					const moe = typeNode && getPropsIdentifierMap(typeNode, checker)
				}
				// diagnostics.push(...ddd)
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
				function getPropsIdentifierMap(node: ts.Node, checker: ts.TypeChecker): Map<string, string> | undefined {
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

				/** 获取 JSX 中使用过的 props */
				function getComponentsJSXElement(node: ts.Node) {
					const childrens = node.getChildren();
					if (childrens.length === 0) {
						return
					}

					childrens.forEach(child => {
						getComponentsJSXElement(child)
					})

				}

			}

			childrens.forEach(node => visit(node, callSet))
		}
	}
	diagnostics.push(...regexChecker(textDocument));

	connManager.connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });

}



