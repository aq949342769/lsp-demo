import * as ts from 'typescript'
import { ComponentType } from './const';


/** 查看节点是否含有 jsx 元素 */
export function checkJSX(node: ts.Node): any {
	if (ts.isJsxElement(node)) {
		return true
	}
	return ts.forEachChild(node, checkJSX)
}
export type ComponentsType = ts.FunctionDeclaration | ts.FunctionExpression | ts.ClassDeclaration | ts.ArrowFunction

/** 判断节点是否是组件 */
export function isComponentNode(node: ts.Node) {
	return ComponentType.some(fn => fn(node)) && !!checkJSX(node)
}