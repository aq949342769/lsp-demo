import * as ts from 'typescript'
import { Diagnostic } from 'vscode-languageserver'
import { ProblemType } from '../problemType'
import { generateDiagosticByNode } from '../utils/diagnosticGenerator'

/** 判断事件处理是否需要防抖节流 */
export function eventHandlerChecker(node: ts.Node) {
	const HANDLER = new Set(['onClick', 'onChange', 'onScroll'])
	const diagnostic: Diagnostic[] = []
	if(ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && HANDLER.has(node.name.getText())) {
		diagnostic.push(generateDiagosticByNode(node, ProblemType.SHOULD_DEBOUNCE))
	}
	return diagnostic
}