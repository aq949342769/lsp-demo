import * as ts from 'typescript'
import { Diagnostic } from 'vscode-languageserver'
import { ProblemType } from '../problemType'
import { isComponentNode } from '../utils/common'
import { generateDiagosticByNode } from '../utils/diagnosticGenerator'

type UsedPropMap = Map<string,number>
export function contextChecker(node: ts.Node, checker: ts.TypeChecker) {
	const diagnostics: Diagnostic[] = []
	const usedPropMap = new Map<string, number>()
	if (!isComponentNode(node)) {
		return diagnostics;
	}
	if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
		const funcParams = node.parameters
		if (funcParams.length === 0) {
			return diagnostics
		}
		initUsedMapByParams(funcParams[0], usedPropMap)
		checkNode(node, checker, usedPropMap)
	}

	usedPropMap.forEach((v, k) => {
		if (v > 0) {
			diagnostics.push(generateDiagosticByNode(node, ProblemType.CONTEXT_COMPONENT))
		}
	})

	return diagnostics
}

/** 判断变量声明的右侧是不是 props */
function checkInitializerIsProp(initializer: ts.Node | undefined) {
	if (!initializer) {
		return false
	}
	if (ts.isIdentifier(initializer) && initializer.getText() === 'props') {
		return true
	}
	if (ts.isPropertyAccessExpression(initializer) && initializer.expression.getText() == 'props') {
		return true
	}
	return false
}
/** 假设是函数式组件或者类组件的 node */
function checkNode(node: ts.Node, checker: ts.TypeChecker, usedPropsMap: UsedPropMap) {

	if (ts.isVariableDeclaration(node) && checkInitializerIsProp(node.initializer)) {
		const left = node.name
		if (ts.isObjectBindingPattern(left)) {
			left.elements.forEach(node => {
				const property = node.propertyName
				if (property) {
					usedPropsMap.set(property.getText(), 1 + (usedPropsMap.get(property.getText()) as number) || 1)
				} else {
					usedPropsMap.set(node.name.getText(), 1 + (usedPropsMap.get(node.name.getText()) as number) || 1)
				}
			})
		}
		if (ts.isIdentifier(left)) {
			usedPropsMap.set(left.getText(), 1 + (usedPropsMap.get(left.getText()) as number) || 1)
		}
	}
	// if (ts.isJsxOpeningElement(node)) {
	// 	if (!isNativeJSXElement(node)) {
	// 		return
	// 	}
	// 	const attrs = node.attributes
	// 	attrs.forEachChild(attr => {
	// 		if (ts.isJsxAttribute(attr)) {
	// 			const name = attr.name.getText()
	// 			const initializer = attr.initializer
	// 			if (!initializer || !ts.isJsxExpression(initializer)) {
	// 				return
	// 			}
	// 			const expr = initializer.expression
	// 			if (!expr) {
	// 				return;
	// 			}
	// 			if (ts.isPropertyAccessExpression(expr)) {
	// 				const name = expr.name.getText()
	// 				const propsTime = usedPropsMap.get(name)
	// 				if (propsTime) {
	// 					usedPropsMap.set(name, propsTime - 1)
	// 				}
	// 			}
	// 			if (ts.isIdentifier(expr)) {
	// 				const propsTime = usedPropsMap.get(name)
	// 				if (propsTime) {
	// 					usedPropsMap.set(name, propsTime - 1)
	// 				}
	// 			}
	// 		}
	// 	})
	// }
	if (ts.isJsxExpression(node)) {
		const expr = node.expression
		const propsTime = expr && usedPropsMap.get(expr.getText())
		if(!propsTime) {
			return
		}
		const parentJSXElemnet = ts.findAncestor(node, (node) => {
			if(ts.isReturnStatement(node)) {
				return 'quit'
			}
			if(ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
				return true
			}
			return false
		})

		if(!isNativeJSXElement(parentJSXElemnet)) {
			return
		}
		if (ts.isIdentifier(expr)) {
			return usedPropsMap.set(expr.getText(), propsTime - 1)
		}
		if (ts.isPropertyAccessExpression(expr)) {
			const name = expr.name.getText()
			usedPropsMap.set(name, propsTime - 1)
		}
	}

	ts.forEachChild(node, (node) => checkNode(node, checker, usedPropsMap))
}

/**
 * 传入一个 jsxElement NodeObject
 */
function isNativeJSXElement(node: ts.Node | undefined): boolean {
	if(!node) {
		return false
	}
	let tagName: string = ''
	if(ts.isJsxElement(node)) {
		tagName = node.openingElement.tagName.getText()
	}
	if(ts.isJsxSelfClosingElement(node)) {
		tagName = node.tagName.getText();
	}
	return /\b[a-z]/g.test(tagName);
}


/** 获取 props 包含的属性 */
function initUsedMapByParams(propsNode: ts.ParameterDeclaration, usedPropMap: UsedPropMap){
	const name = propsNode.name
	const type = propsNode.type
	
	if(ts.isObjectBindingPattern(name)) {
		return name.elements.forEach(element => {
			usedPropMap.set(element.name.getText(), 1)
		})
	}
	if(type && ts.isTypeLiteralNode(type)) {
		type.members.forEach(m => {
			const name = m.name?.getText()
			name && usedPropMap.set(name, 1)
		})
	}

}
