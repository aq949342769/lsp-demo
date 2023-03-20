import * as ts from 'typescript';
import { ProblemType } from '../problemType';
import { generateDiagosticByNode } from '../utils/diagnosticGenerator';

/** 判断函数组件有无用 memo 包裹 */
export function memoComponentChecker(node: ts.Node, callSet: Set<string>) {
	if (ts.isClassDeclaration(node)) {
		return [];
	}
	const regex = /memo/g
	const isCallByMemo = ts.isCallExpression(node.parent) && regex.test(node.parent.getFullText())
	const isCallByContext = callSet.has(node.getFullText());
	if (!isCallByMemo && !isCallByContext) {
		return [generateDiagosticByNode(node, ProblemType.NO_MEMO_COMPONENTS)]
	}
	return []
}