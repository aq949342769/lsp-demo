import ts = require('typescript')
import { DiagnosticSeverity } from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { diagnosticFactory } from './utils/problemCheck'


export enum ProblemType {
	/** 没有用 pureComponent 包裹 */
	NO_PURE_COMPONENTS,
	/** 没有使用 React.memo 包裹 */
	NO_MEMO_COMPONENTS,
	/** props 中含有引用类型，而没有用 useMemo/useCallback 包裹 */
	HAVING_REF_PROPS,
	/** 使用按需加载 */
	LAZY_IMPORT,
	/** 事件处理器可能需要防抖节流 */
	SHOULD_DEBOUNCE,
	/** 异步任务中使用 setState */
	ASYNC_TASK_STATE_CHANGE
}
interface problem {
	severity: DiagnosticSeverity,
	msg: string,
	type: ProblemType,
	accessible?: Array<string>,
	pattern?: RegExp,
	checker?: (...arg: any) => any,
	diagnosticFactory?: any,

}
export const ProblemObj: {[key: string]: problem} = {
	[ProblemType.NO_PURE_COMPONENTS]: {
		severity: DiagnosticSeverity.Warning,
		msg: "使用`React.PureComponent`对组件进行包裹，从而可以对 props 进行浅层比较，减少不必要的重渲染",
		type: ProblemType.NO_PURE_COMPONENTS,
		accessible: ['React.PureComponent', 'PureComponent'],
		pattern: /class\s+(\w*)\s+extends\s+([\w.]+)/g,
		checker(m: RegExpExecArray) {
			return this.accessible!.includes(m[2])
		},
		diagnosticFactory(doc: TextDocument, m: RegExpExecArray) {
			return diagnosticFactory(doc, m, this.msg)
		}
	},
	[ProblemType.NO_MEMO_COMPONENTS]: {
		severity: DiagnosticSeverity.Warning,
		msg: "使用`React.memo`对函数组件进行包裹，从而可以对 props 进行浅层比较，减少不必要的重渲染",
		type: ProblemType.NO_MEMO_COMPONENTS,
		accessible: ['React.memo', 'memo'],
		/**
		 * 支持识别：箭头函数，匿名函数，具名函数，函数名
		 */
		pattern: /(React\.memo|memo)(\((?:\(.*\)=>\{.*\}|(?:function\(.*\)\{.*\})|(function\s*(?<fname>\w+)\(.*\)\{.*\})|(?<fname2>\w+))\))/g,
		checker(m: RegExpExecArray) {
			return this.accessible!.includes(m[1])
		},
		diagnosticFactory(doc: TextDocument, m: RegExpExecArray) {
			return diagnosticFactory(doc, m, this.msg)
		}
	},
	[ProblemType.HAVING_REF_PROPS]: {
		severity: DiagnosticSeverity.Warning,
		msg: "props 中包含引用类型，使用 useMemo/useCallback 包裹可以避免重渲染",
		type: ProblemType.HAVING_REF_PROPS,
	},
	[ProblemType.LAZY_IMPORT]: {
		severity: DiagnosticSeverity.Warning,
		msg: "改组件可以使用 React.lazy 等懒加载策略",
		type: ProblemType.LAZY_IMPORT
	},
	[ProblemType.SHOULD_DEBOUNCE]: {
		severity: DiagnosticSeverity.Warning,
		msg: "该事件回调需要使用防抖节流等措施",
		type: ProblemType.SHOULD_DEBOUNCE,
	},
	[ProblemType.ASYNC_TASK_STATE_CHANGE]: {
		severity: DiagnosticSeverity.Warning,
		msg: '在 react18 之前如果在异步任务中使用 setState 方法会造成组件多次渲染',
		type: ProblemType.ASYNC_TASK_STATE_CHANGE
	}
}



