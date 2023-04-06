import { Node } from 'typescript';
import { Diagnostic, Position } from 'vscode-languageserver';
import { ProblemObj, ProblemType } from '../problemType';
import * as ts from 'typescript'

export function generateDiagosticByNode(node: Node, problemType: ProblemType): Diagnostic {
	const sourceFile = node.getSourceFile()
	const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
	const severity = ProblemObj[problemType].severity;
	const start = Position.create(line, character)
	const end = Position.create(line, character + node.getWidth())
	const message = ProblemObj[problemType].msg 
	return {
		severity,
		range: {
			start,
			end,
		},
		message
	}
} 