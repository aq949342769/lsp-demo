import { Node, SyntaxKind } from 'typescript';
import { ProblemType } from '../problemType';
import { generateDiagosticByNode } from '../utils/diagnosticGenerator';

/** 判断函数组件有无用 memo 包裹 */
export function memoComponentChecker(node: Node, callSet: Set<string>) {
	console.log(SyntaxKind[node.kind]);
	if (node.kind === SyntaxKind.ClassDeclaration) {
		return [];
	}
	const parentKind = node.parent.kind
	const parentSignature = node.parent.getFullText();
	const regex = /memo/g
	const isCallByMemo = parentKind === SyntaxKind.CallExpression && regex.test(parentSignature);
	const isCallByContext = callSet.has(node.getFullText());
	if (!isCallByMemo && !isCallByContext) {
		return [generateDiagosticByNode(node, ProblemType.NO_MEMO_COMPONENTS)]
	}
	return []
}