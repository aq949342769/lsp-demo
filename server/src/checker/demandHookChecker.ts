import * as ts from 'typescript'
import { Diagnostic } from 'vscode-languageserver'
import { ProblemType } from '../problemType'
import { generateDiagosticByNode } from '../utils/diagnosticGenerator'
export function onDemandHookChecker(node: ts.Node, checker: ts.TypeChecker) {
	const diagnostics: Diagnostic[] = []
	findHook(node, checker, diagnostics)
	
	return diagnostics
}

function findHook(node: ts.Node, checker:ts.TypeChecker, diagnostic: Diagnostic[]) {
	if(ts.isCallExpression(node)){
		const expr = node.expression
		if(!ts.isIdentifier(expr)) {
			return;
		}
		const hookRegex = /use[A-Z]\w*/g
		const exprText = expr.getText()
		if(!hookRegex.test(exprText)) {
			return;	
		}
		const signature = checker.getResolvedSignature(node)
		const returnType = signature && checker.getReturnTypeOfSignature(signature)

		const parent = ts.findAncestor(node, ts.isVariableDeclaration)
		if(!parent || ts.isIdentifier(parent.name)) {
			return
		}
		if(ts.isObjectBindingPattern(parent.name)) {
			const typeArgumentsArr = returnType?.getProperties()
			if(typeArgumentsArr?.length !== parent.name.elements.length) {
				diagnostic.push(generateDiagosticByNode(node, ProblemType.ON_DEMAND_HOOK))
			}
		}
		if( ts.isArrayBindingPattern(parent.name)) {
			const typeArgumentsArr = returnType && checker.getTypeArguments(returnType as ts.TypeReference)
			// @ts-ignore
			if(typeArgumentsArr?.length !== parent.name.elements.length) {
				diagnostic.push(generateDiagosticByNode(node, ProblemType.ON_DEMAND_HOOK))
			}
		}
		

		
	}
	ts.forEachChild(node, (node) => findHook(node, checker, diagnostic))
}
