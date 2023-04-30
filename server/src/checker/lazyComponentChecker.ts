import * as ts from 'typescript'
import { Diagnostic } from 'vscode-languageserver';
import { ProblemType } from '../problemType';
import { generateDiagosticByNode } from '../utils/diagnosticGenerator';

/** 判断引入的组件是否可以使用懒加载策略  */
export function lazyComponentChecker(node: ts.ImportClause, checker: ts.TypeChecker | undefined) {
	const diagnostics: Diagnostic[] = []
	if(!checker) {
		return diagnostics;
	}
	if (node.name) {
		const type = checker!.getTypeAtLocation(node)
		const typestr = checker!.typeToString(type)
		if (typestr.includes('props') || typestr.includes('Element')) {
			diagnostics.push(generateDiagosticByNode(node, ProblemType.LAZY_IMPORT))
		}
	}
	// 还差命名 import
	return diagnostics
}