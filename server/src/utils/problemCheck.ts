import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { ProblemType, ProblemObj } from '../problemType'


export const getProblemMSg = (type: ProblemType) => ProblemObj[type].msg
export function diagnosticFactory(textdocument: TextDocument, m: RegExpExecArray, message: string) {
	return {
		severity: DiagnosticSeverity.Warning,
		range:{
			start: textdocument.positionAt(m.index) ,
			end: textdocument.positionAt(m.index + m[0].length)
		},
		message,
		source: 'react-perf-extention'	
	} as Diagnostic
}

