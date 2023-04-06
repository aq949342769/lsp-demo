import * as ts from 'typescript'
import { isComponentNode } from '../utils/common';
class AstParser {
	componentsNodeSet = new Set<ts.Node>();
	typeLiteraleNodeSet = new Set<ts.Node>();
	typeReferenceNodeSet = new Set<ts.Node>();
	constructor(file: ts.SourceFile) {
		this.init(file)
	}
	private init(file: ts.SourceFile) {
		ts.forEachChild(file, (node) => this.parse(node))
	}
	private parseComponentNode(node: ts.Node) {
		const childrens = node.getChildren()
		if(childrens.length === 0) {
			return
		}	

		if(ts.isTypeLiteralNode(node)) {
			this.typeLiteraleNodeSet.add(node)
		}
		if(ts.isTypeReferenceNode(node)) {
			this.typeReferenceNodeSet.add(node)
		}
		childrens.forEach(this.parseComponentNode)
	}
	private parse(node: ts.Node) {
		const childrens = node.getChildren()
		if(childrens.length === 0) {
			return
		}
		if(isComponentNode(node)) {
			this.componentsNodeSet.add(node)
			this.parseComponentNode(node)
		}
		childrens.forEach(this.parse)
	}
}

