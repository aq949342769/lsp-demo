import { Diagnostic } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ProblemObj, ProblemType } from '../problemType';
/**
 * 通过正则匹配，检查错误，支持：
 * 1、pureComponent
 */
export function regexChecker(textDocument: TextDocument) {
	const diagnostics: Diagnostic[] = []
	const support = [ProblemType.NO_PURE_COMPONENTS]
	Object.keys(ProblemType)
		.filter(v => !isNaN(Number(v)) && support.includes(Number(v)))
		.forEach((key) => {
			const body = ProblemObj[key]
			if(!body.pattern || !body.checker) {
				return;
			}
			let m: RegExpExecArray | null;
			let problems = 0;
			const text = textDocument.getText();
			while ((m = body.pattern.exec(text))) {
				if (m && !body.checker(m)) {
					problems++;
					const diagnostic = body.diagnosticFactory(textDocument, m)
					diagnostics.push(diagnostic);
				}
			}
		})
	return diagnostics;
}

