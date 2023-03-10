import { Node } from 'typescript';
import { Position } from 'vscode-languageserver';
import { ProblemObj, ProblemType } from '../problemType';

export function generateDiagosticByNode(node: Node, warnType: ProblemType) {
	const sourceFile = node.getSourceFile()
	const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
	const severity = ProblemObj[warnType].severity;
	const start = Position.create(line, character)
	const end = Position.create(line, character + node.getWidth())
	const message = ProblemObj[warnType].msg 
	return {
		severity,
		range: {
			start,
			end,
		},
		message
	}
} 