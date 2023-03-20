import { Diagnostic } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ProblemObj, ProblemType } from '../problemType';
/**
 * 通过正则匹配，检查错误
 * 如果需要正则判断，在定义 problemObj 对应的 problemType 的时候要提供正则表达式和对应的 checker
 * 目前支持：
 * 1、pureComponent
 */
export function regexChecker(textDocument: TextDocument) {
	const diagnostics: Diagnostic[] = []
	const supportType = [ProblemType.NO_PURE_COMPONENTS]
  // 遍历支持正则诊断的问题类型
	supportType.forEach((key) => {
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

