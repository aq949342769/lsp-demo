import * as ts from 'typescript'
import { Diagnostic } from 'vscode-languageserver';
import { ProblemType } from '../problemType';
import { isComponentNode } from '../utils/common';
import { generateDiagosticByNode } from '../utils/diagnosticGenerator';

/** 判断 setState 被使用在异步任务中，
 * 在 react18 之前，异步任务中的 setState 是同步执行的，会导致多次渲染
 * 在 react18 之后，异步任务中的 setState 也默认走批量处理
 * */
export function batchSetStateChecker(node: ts.Node, checker: ts.TypeChecker | undefined) {
	if(!checker) {
		return []
	}
	const diagnostics: Diagnostic[] = []
	if(ts.isCallExpression(node) && !isComponentNode(node)) {
		const d = handleMacroTask(node, checker)
		d && diagnostics.push(d)
		const dd = handlePromiseLikeTask(node)
		dd && diagnostics.push(dd)
	}
	return diagnostics
}

/** 处理宏任务造成的异步任务 */
function handleMacroTask(node: ts.CallExpression, checker: ts.TypeChecker): Diagnostic | undefined {
	/** 两种常见的宏任务 */
	const MacroTask = new Set(['setTimeout', 'setInterval'])
	const expr = node.expression;
	if(ts.isIdentifier(expr) && MacroTask.has(expr.getText())) {
		const cbNode = checker.getSymbolAtLocation(node.arguments[0])?.declarations?.[0]
		const g = cbNode && checkNotBatchedSetStateCallExpression(cbNode, cbNode, checker)
		if (g) {
			return generateDiagosticByNode(node, ProblemType.ASYNC_TASK_STATE_CHANGE)
		}
	}
	return undefined
}

/** 处理 Promise 造成的异步任务 */
function handlePromiseLikeTask(node: ts.CallExpression): Diagnostic | undefined {
	return undefined
}

/** 检查函数体中是否包含没有批量更新的 setState 语句
 * @param ref 用于参照的顶层 Node，即函数体对应的 NodeObject
 */
function checkNotBatchedSetStateCallExpression(node: ts.Node, ref: ts.Node, checker: ts.TypeChecker): boolean | undefined {
	if(ts.isCallExpression(node)) {
		const expr = node.expression
		let identifier = expr;
		// 类组件需要转换一下
		if(ts.isPropertyAccessExpression(expr)) {
			identifier = expr.name
		}
		if(ts.isIdentifier(identifier)) {
			const typeStr = checker.typeToString(checker.getTypeAtLocation(identifier)).toLowerCase()
			const isSetStateAction = typeStr.includes('setstate') || identifier.escapedText === 'setState'
			if(!isSetStateAction) {
				return;
			}
			const batched = checkIsBatched(node, ref)
			if(isSetStateAction && !batched) {
				return true;
			}
		}
	
	}
	
	return ts.forEachChild(node, (node) => checkNotBatchedSetStateCallExpression(node, ref, checker))
}

/** 遍历节点的父节点，直到参照接点，判断 setState 语句是否有被批量更新 API 包裹 */
function checkIsBatched(node: ts.Node, ref: ts.Node) {
	const parent = ts.findAncestor(node, (parent) => {
		if(parent === ref) {
			return 'quit';
		}
		if(parent !== node && ts.isCallExpression(parent)) {
			return true
		}
		return false
	})
	const identifier = parent && (parent as ts.CallExpression).expression.getText()
	return identifier === 'unstable_batchedUpdates'
}