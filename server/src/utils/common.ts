import * as ts from 'typescript'
import { ComponentType } from './const';


/** 查看节点是否含有 jsx 元素 */
export function checkJSX(node: ts.Node) {
	const children = node.getChildren()
	if (children.length === 0) {
		return false
	}
	if (ts.isJsxElement(node)) {
		return true
	}
	return children.some(checkJSX)
}

/** 判断节点是否是组件 */
export function isComponentNode(node: ts.Node) {
	return ComponentType.some(fn => fn(node)) && checkJSX(node)
}