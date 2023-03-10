import ts = require('typescript')

export function checkJSX(node: ts.Node) {
	const children = node.getChildren()
	if (children.length === 0) {
		return false
	}
	if (node.kind === ts.SyntaxKind.JsxElement) {
		return true
	}
	return children.some(checkJSX)
}