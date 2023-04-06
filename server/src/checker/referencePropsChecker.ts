import * as ts from 'typescript'
import { Diagnostic } from 'vscode-languageserver';
import { ProblemType } from '../problemType';
import { BASETYPE } from '../utils/const';
import { generateDiagosticByNode } from '../utils/diagnosticGenerator';

// export class ReferencePropsChecker extends Checker {
// 	visit = (node: ts.Node, checker: ts.TypeChecker) => {
// 		/** 递归标记 */
// 		const o = {
// 			hasDiagnostic: false,
// 			diagnostic: [] as Diagnostic[],
// 		}
// 		recursion(o, node)
// 		function recursion(o: any, node: ts.Node) {
// 			const children = node.getChildren();
// 			if (children.length === 0) {
// 				return
// 			}
// 			if (node.kind === ts.SyntaxKind.TypeReference) {
// 				const type = checker.getTypeAtLocation(node)
// 				const typestr = checker.typeToString(type);
// 				type.getSymbol()?.members?.forEach(m => {
// 					const n = m.declarations?.[0]
// 					if (!n || o.hasDiagnostic) {
// 						return;
// 					}
// 					const mtype = checker.getTypeOfSymbolAtLocation(m, n)
// 					const mtypeStr = checker.typeToString(mtype)
// 					if (!BASETYPE.includes(mtypeStr)) {
// 						if (!o.hasDiagnostic) {
// 							o.diagnostic.push(generateDiagosticByNode(node, ProblemType.HAVING_REF_PROPS))
// 						}
// 						o.hasDiagnostic = true;
// 					}
// 				})
// 			}
// 			// 如果已经生成诊断，则不再继续递归了
// 			!o.hasDiagnostic && children.forEach(ch => recursion(o, ch))
// 		}

// 		return o.diagnostic
// 	}
// }
/** 判断 props 中是否含有引用类型 */
export function referencePropsChecker(node: ts.Node, checker: ts.TypeChecker | undefined) {
	/** 递归标记 */
	const o = {
		hasDiagnostic: false,
		diagnostic: [] as Diagnostic[],
	}
	if(!checker) {
		return o.diagnostic
	}
	recursion(o, node, checker)
	function recursion(o: any, node: ts.Node, checker: ts.TypeChecker) {
		const children = node.getChildren();
		if (children.length === 0) {
			return
		}
		if (node.kind === ts.SyntaxKind.TypeReference) {
			const type = checker.getTypeAtLocation(node)
			// const typestr = checker.typeToString(type);
			type.getSymbol()?.members?.forEach(m => {
				const n = m.declarations?.[0]
				if (!n || o.hasDiagnostic) {
					return;
				}
				const mtype = checker.getTypeOfSymbolAtLocation(m, n)
				const mtypeStr = checker.typeToString(mtype)
				// 如果类型不是基本类型，生成诊断
				if (!BASETYPE.includes(mtypeStr)) {
					if (!o.hasDiagnostic) {
						o.diagnostic.push(generateDiagosticByNode(node, ProblemType.HAVING_REF_PROPS))
					}
					o.hasDiagnostic = true;
				}
			})
		}
		// 如果已经生成诊断，则不再继续递归了
		!o.hasDiagnostic && children.forEach(ch => recursion(o, ch, checker))
	}

	return o.diagnostic
}