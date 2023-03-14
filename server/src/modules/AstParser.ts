import { createProgram, forEachChild, ModuleKind, Node, Program, ScriptTarget, SyntaxKind } from 'typescript';
import { fileURLToPath } from 'url';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic } from 'vscode-languageserver/node';
import { checkJSX } from '../checker/checkJSX';
import { memoComponentChecker } from '../checker/memoComponentChecker';
import { referencePropsChecker } from '../checker/referencePropsChecker';
import { regexChecker } from '../checker/regexChecker';
import { ComponentType } from '../problemType';

export class AstParser {
	private _program: Program | null = null;
	/** 诊断收集 */
	private diagnostics: Diagnostic[] = [];

	get typechecker() {
		return this._program?.getTypeChecker()
	}
	getProgram(uri: string) {
		const compileOptions = { target: ScriptTarget.ES2015, module: ModuleKind.CommonJS }
		const exampleUrl = [
			fileURLToPath(uri),
			fileURLToPath('file:///Users/xiaoyidao/lunwen/my-app/src/type.d.ts'),
		]
		if (!this._program) {
			return createProgram(exampleUrl, compileOptions)
		}
		// 复用 program
		return createProgram(exampleUrl, compileOptions, undefined, this._program)
	}
	async parser(textDocument: TextDocument): Promise<Diagnostic[]> {
		const program = this.getProgram(textDocument.uri)

		const fileList = program?.getSourceFiles()
		if (!fileList) {
			throw new Error('no fileList')
		}
		for (const file of fileList) {
			if (!file.isDeclarationFile) {
				/** 收集调用表达式，如 memo(foo), 那么 foo 函数的签名放入 set */
				const callSet = new Set<string>()
				forEachChild(file, (node) => visit(node, this, callSet))
			}
		}
		function visit(node: Node, ref: AstParser, callSet: Set<string>) {
			const childrens = node.getChildren();
			if (childrens.length === 0) {
				return;
			} else {
				// 收集被调用的函数名
				if (node.kind === SyntaxKind.CallExpression) {
					const funcName = /memo\((\w+)\)/g.exec(node.getFullText())?.[1]
					funcName && callSet.add(funcName)
				}
				// 判断组件的警告
				if (ComponentType.includes(node.kind)) {
					if (checkJSX(node)) {
						const d = referencePropsChecker(node, ref.typechecker!)
						ref.diagnostics.push(...d)
						const dd = memoComponentChecker(node, callSet)
						ref.diagnostics.push(...dd);
					}
				}
	
				childrens.forEach(node => visit(node, ref, callSet))
			}
		}
		this.diagnostics.push(...regexChecker(textDocument));
		return this.handleDiagnostics()
	}

  handleDiagnostics() {
		return this.diagnostics; 
	}

}