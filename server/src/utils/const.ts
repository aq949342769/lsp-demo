import * as ts from 'typescript'

/** react 组件类型的语法类型 */
export const ComponentType = [
	ts.isFunctionDeclaration,
	ts.isFunctionExpression,
	ts.isClassDeclaration,
	ts.isArrowFunction,
]

export const BASETYPE = ['string', 'number', 'boolean', 'undefined', 'null', 'symbol'];
