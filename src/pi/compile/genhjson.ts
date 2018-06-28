/**
 * 生成  生成vdom的函数
 * VirtualNode才有children
 * VirtualWidgetNode只有child
 * VirtualTextNode没有子节点
 */
/**
 * 改进:
 * 1. 加上staticid
 * 2. json的hash值可以提前计算
 */
/**
 * json每层的每层ParserNode都计算了childHash,但是反映到函数上则只有最外层需要计算
 */
/**
 * syntax上的preType专门用于JS，用于存储在进入JS之前所属的type类型
 */
// ====================================== 导入
import {Syntax} from "../compile/parser";
import * as hash from '../util/hash';
import {calTextHash} from '../util/tpl';
import { logLevel, warn } from '../util/log';
import { commonjs } from '../lang/mod';

// ====================================== 导出
export let level = logLevel;

const setParent = (syntax: Syntax, parent: Syntax) => {
    syntax.parent = parent;
    let right = syntax.right;
    if(!right)
        return;
    
    for(var i = 0; i < right.length; i++){
        setParent(right[i], syntax);
    }
}

export const gen = (syntax:Syntax) => {
	nodeIndex = 0;
	sid = 0;
	funcStrArr = [`let _$temp, node; let _set = new Set();`];
	funcStrIndex = 1;
	setParent(syntax, null);
	preorder(syntax, null);
	return joinStr();
}

//判断父节点是否是widget
export const parentIsWidget = (syntax:Syntax): boolean => {
	if(!syntax)
		return false;
	let type = syntax.type;
	if(type === "tag" || type === "html"){
		let flag = false;
		if(type === "tag"){
			let tagName = syntax.right[0].value;
			if( tagName.indexOf("-") > 0 || tagName.indexOf("$") > 0 || tagName.indexOf("widget") >= 0 ){
				flag = true;
			}
		}
		return flag;
	}
	let parent = syntax.parent;
	return parentIsWidget(parent);
}


let nodeIndex = 0; //根节点为1， 第二层子为2，第三层为3...

// ====================================== 本地
//先序遍历
// child -> node -> pre -> suf
const preorder = (syntax:Syntax, parent:Syntax)=>{
	let index:number = funcStrIndex;
	let funcs = seekFunc(syntax, parent);
	let childs:Array<Syntax> = funcs.child();
	let childNodes:Array<ParserNode> = [];
	funcStrIndex++; 
	if(syntax.type === "jobj" || syntax.type === "jarr" ||  syntax.type === "jpair" || syntax.type === "text" || syntax.type === "jsexpr"){
		nodeIndex++;
	}
	for(let i = 0; i < childs.length; i++){
		let childNode = preorder(childs[i], syntax);
		if(childNode)childNodes.push(childNode);//存在空文本节点的情况		
	}
	let node:ParserNode = funcs.node(childNodes);
	funcStrArr[index] = funcs.pre(node);
	funcStrArr[funcStrIndex++] = funcs.suf(node);
	if(syntax.type === "jobj" || syntax.type === "jarr" ||  syntax.type === "jpair" || syntax.type === "text" || syntax.type === "jsexpr"){
		nodeIndex--;
	}	
	return node;
}

interface interParser{
	pre:(node:ParserNode)=>String;
	suf:(node:ParserNode)=>String;
	child:()=>Array<Syntax>;
	node:(childs:Array<ParserNode>)=>ParserNode;
}

//每一个节点都有pre字符串和suf字符串
const seekFunc = (syntax:Syntax, parent:Syntax):interParser=>{
	try {
		return parserFunc[<any>syntax.type](syntax, parent);
	} catch (error) {
		throw `parserFunc[${<any>syntax.type}]不是一个方法！`
	}
	
}

const joinStr = ()=> {
	return `(function(_cfg,it,it1){${funcStrArr.join("")} })`;
};
// 用来存储位置的
let funcStrIndex:number = 0;
// 需要拼接成函数字符串
let funcStrArr:Array<String> = [];
//还没想好里面存什么
class ParserNode{
	childHash:number = 0;
	attrs:any = {};
	attrHash:number = 0;
	hash:number = 0;  
	str:string = "";//当前节点对应的文本值,暂时只在js中拼表达式用到
	v?:string = "";//v字段专门处理value是jsexpr的情况
	cs:boolean = false;//判断子节点中是否存在脚本
	hashstr?:string;//当前节点计算hash值的文本
	attrHashStr?:string;//当前节点计算属性hash值得文本
	childs?:Array<ParserNode>;
	// childfuncstr:Array<String> = [];
}

const baseFunc = (syntax:Syntax)=>{
	return Object.assign({}, defaultParse,{
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode();
			node.str = syntax.value;
			node.hash = hash.anyHash(node.str);
			return node;
		},
		"pre":(node:ParserNode):String=>{
			let p = findJsonContainer(syntax.parent);
			if(p){
				let str = getJarrJpair(p, node.str);
				let ps = findSJpairJarr(syntax.parent);
				if(ps.type === "script"){
					str += `node["_$hash"] = _nextHash(node["_$hash"], ${node.hash});`
				}
				return str;
			}
		}
	})
}

const jstringFunc = (syntax:Syntax)=>{
	return Object.assign({}, defaultParse,{
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode();
			if(syntax.right === null && syntax.right.length === 0){
				node.str = `""`;
			}else{
				node.str =`"${syntax.right[0].value}"`;
			}
			node.hash = hash.anyHash(node.str);
			return node;
		},
		"pre":(node:ParserNode):String=>{
			let p = findJsonContainer(syntax.parent);
			if(p){
				let str = ``;
				let ps = findSJpairJarr(syntax.parent);;
				if(p.type != "jpair" || p.right[0] !== syntax){
					str = getJarrJpair(p, node.str);
					
				}
				if(ps.type === "script"){
					str += `node["_$hash"] = _nextHash(node["_$hash"], ${node.hash});`
				}
				return str;
			}
		}
	})
}


const jpairFunc = (syntax:Syntax, parent:Syntax)=>{//|"identifier", "jstring"|, ":"#?, |"jstring", "number","bool","null", jobj, jarr, script, jscript|
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=>{
			return syntax.right;
		},
		"node":(childs:Array<ParserNode>)=>{
			let node = containScript(childs);
			node.childs = childs;
			node.hash = hash.nextHash(node.hash,  node.childs[0].hash); //计算key的hash值
			if(node.cs ===  false || syntax.right[1].type === "jscript"){
				node.hash = hash.nextHash(node.hash, node.childs[1].hash); //计算值的hash值
			}
			return node;
		},
		"pre":(node:ParserNode):String=>{
			let str = ``;
			const findP = (syntax:Syntax): Syntax => {
				if(!syntax){
					return null;
				}
				if(syntax.type === "script" || syntax.type === "jobj"){
					return syntax;
				}
				return findP(syntax.parent);
			}
			let p = findP(syntax);
			if(p.type === "script"){
				str += `node["_$hash"] = _nextHash(node["_$hash"], ${node.hash});`;
			}
			return str;
		}
	})
}

//单指json中的数组
//且数组中的元素必须为同一类型
// 暂时没有处理["aa","aa {{it.name}}"]这种情况
// jarr其实有BUG,无法处理数组嵌套，且其中有变量的情况,除非变量放在尾部，不然顺序会被换掉
//"["#?10, [|"jstring", "number","bool","null", jobj, jarr, script, jscript|, [{","#?, |"jstring", "number","bool","null", jobj, jarr, script, jscript|}]], "]"#?back;
const jarrFunc = (syntax:Syntax, parent:Syntax)=>{
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=>{
			return syntax.right;
		},
		"node":(childs:Array<ParserNode>)=>{
			let node = containScript(childs);
			node.childs = childs;
			for(let i = 0; i < syntax.right.length; i++){
				if(isBuildIn(syntax.right[i]) || syntax.right[i].type ==="jscript"){//所有静态子节点的hash组成该节点的静态hash
					node.hash = hash.nextHash(node.hash,node.childs[i].hash);
				}
			}
			return node;
		},
		"pre":(node:ParserNode):String=>`_$temp=node;{let _$parent = _$temp;let node = [];node["_$hash"] = ${node.hash};`,
		"suf":(node:ParserNode):String=>{
			let str = ``;
			let p = findJsonContainer(syntax.parent);
			if(!p){
				str += "return node;"
			}else{
				if(node.cs === true){//如果含有script,父节点hash应该计算子节点hash， 否则， 子节点的hash为静态hash，已经被包含在父节点中
					str +=`_$parent["_$hash"] = _nextHash(_$parent["_$hash"],node["_$hash"]);`
				}else{
					let pp = findSJpairJarr(syntax.parent);
					if(pp.type === "script"){
						str +=`_$parent["_$hash"] = _nextHash(_$parent["_$hash"],node["_$hash"]);`
					}
				}
				if(p.type === "jarr"){
					str +=`_$parent.push(node);`;
				}else{//jpair
					let key = getJsonKey(p.right[0]);
					str +=`_$parent[${key}] = node;`;
				}
			}
			return str + "};";
		}
	})
}

const findSJpairJarr = (syntax:Syntax): Syntax => {
	if(!syntax){
		return null;
	}
	if(syntax.type === "script" || syntax.type === "jpair" || syntax.type === "jarr"){
		return syntax;
	}
	return findSJpairJarr(syntax.parent);
}

//"{"#?10,  [|jpair,script|], [{[","#?], |jpair,script|}], "}"#?back ;
const jobjFunc = (syntax:Syntax, parent:Syntax)=>{
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=>syntax.right,
		"node":(childs:Array<ParserNode>)=>{
			let node = containScript(childs);
			calHash(childs, node); //jpair和script都需要计算静态hash，因为，jobj环境中script的body也是jpair
			return node;
		},
		"pre":(node:ParserNode):String=>`_$temp=node;{let _$parent = _$temp;let node = {};node["_$hash"] = ${node.hash};`,
		"suf":(node:ParserNode):String=>{
			let str = ``;
			let p = findJsonContainer(syntax);
			if(!p){
				str += `return node;`
			}else{
				if(node.cs === true){//如果含有script,父节点hash应该计算子节点hash， 否则， 子节点的hash为静态hash，已经被包含在父节点中
					str +=`_$parent["_$hash"] = _nextHash(_$parent["_$hash"],node["_$hash"]);`
				}else{
					let pp = findSJpairJarr(syntax.parent);
					if(pp.type === "script"){
						str +=`_$parent["_$hash"] = _nextHash(_$parent["_$hash"],node["_$hash"]);`
					}
				}
				if(p.type === "jarr"){
					str +=`_$parent.push(node);`;
				}else{//jpair
					let key = getJsonKey(p.right[0]);
					str +=`_$parent[${key}] = node;`;
				}
			}
			return str + "};";
		}		
	})
}

const jsExprFunc = (syntax:Syntax, parent:Syntax) => {
	let find = (syntax:Syntax): Syntax => {
		if(syntax.type === "jarr" || syntax.type === "jpair" || syntax.type === "jscript"){
			return syntax;
		}
		return find(syntax.parent);
	}
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=> syntax.right,
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			node.str = childs[0].str.trim();
			return node;
		},
		"suf":(node:ParserNode):String=>{ 
			let str = ``;
			let p = find(parent);
			if(!p){
				throw "jsExpr必须是在jarr，jpair环境中 "
			}
			let ptype = p.type;
			if(syntax.parent.parent.type === "jscript"){
				str = `jvalue += ` + node.str +`;`;
			}else{//script
				str = getJarrJpair(p, node.str);
			}
			str += `_set.clear();node["_$hash"] = _nextHash(node["_$hash"],_anyHash(${node.str}, 0,_set));`;//计算script的hash
			return str;
		}
	})
}

const jscriptFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=> {
			return syntax.right;
		},
		"node":(childs: Array<ParserNode>): ParserNode => {
			let node = new ParserNode();
			node.cs = true;
			for(let i = 0; i < syntax.right.length; i++){
				if(syntax.right[i].type === "stringstr"){
					node.hash = hash.nextHash(node.hash, childs[i].hash);
				}
			}
			return node;
		},
		"pre":(node:ParserNode):String=>{ 
			return `{let jvalue = "";`
		},
		"suf":(node:ParserNode):String=>{ 
			let p = findJsonContainer(syntax);
			if(!p){
				throw "jscript类型必须以jarr或jpair做为容器";
			}
			let str = getJarrJpair(p, "jvalue");
			str += "}";
			return str;
		}

	})
}

const stringstrFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"node":(childs: Array<ParserNode>): ParserNode => {
			let node = new ParserNode();
			node.str = `"${syntax.value}"`;
			node.hash = hash.strHashCode(node.str, 0);
			return node;
		},
		"pre":(node: ParserNode): string=> {
			return `jvalue += ${node.str};`;
		}

	})
}

const bodyFunc = (syntax:Syntax, parent:Syntax)=>{
	return Object.assign({}, defaultParse, {
		"child":():Array<Syntax>=>{
			return syntax.right;
		},
		"node":(childs:Array<ParserNode>):ParserNode=>{
			let node = containScript(childs);
			node.childs = childs;
			calHash(childs, node); 
			return node;
		},
		"pre":(node: ParserNode):string=>{
			let str = ``;
			if(parent && isBuildIn(syntax)){//基础类型
				let p = findJsonContainer(syntax);
				if(!p){
					throw "基础类型必须以jarr或jpair做为容器"
				}
				if(p.type === "jpair"){
					let key = getJsonKey(p.right[0]);
					str += `node[${key}] = ${node.childs[0].str};`;
				}else{//jarr
					str += `node.push(${node.childs[0].str});`;
				}
				str += `node["_$hash"] = _nextHash(node["_$hash"], ${node.childs[0].hash})};`;
			}else if(parent && (parent.type == "if" || parent.type == "elseif" || parent.type == "else"))
				str = `{`;
			return str;
		},
		"suf":():string=>{
			let str = ``;
			if(parent && (parent.type == "if" || parent.type == "elseif" || parent.type == "else"))
				str = `}`;
			return str;
		}
	})
}

const genMathChildFunc = (syntax:Syntax) => {
	return ():Array<Syntax> => {
			let childs = [];
			if(syntax.left !== null && !isBuildIn(syntax.left))
				childs.push(syntax.left)
			if(!isBuildIn(syntax.right[0]))
				childs.push(syntax.right[0])
			return childs;
		}
}

const genMathNodeFunc = (operator:string, syntax:Syntax) => {
	return (childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			if(syntax.left === null){
				node.str = operator;
			}else if(!isBuildIn(syntax.left)){
				node.str = childs[0].str + operator;
			}else{
				node.str = syntax.left.value + operator;
			}
			if(!isBuildIn(syntax.right[0])){
				node.str += childs[childs.length - 1].str;
			}else{
				node.str += syntax.right[0].value;
			}
			return node;
		}
}

const genMathFunc = (operator:string) => {
	return (syntax:Syntax, parent:Syntax) => {
		return Object.assign({}, defaultParse,{
			"child":genMathChildFunc(syntax),
			"node":genMathNodeFunc(operator, syntax)
		})
	}
}

const genAutoFunc = (operator:string) => {
	return (syntax:Syntax, parent:Syntax)=> {
		return Object.assign({}, defaultParse,{
			"child":():Array<Syntax>=> {
				let childs = [];
				if(syntax.left && !isBuildIn(syntax.left)){
					childs.push(syntax.left);
				}
				if(syntax.right && syntax.right[0] && !isBuildIn(syntax.right[0])){
					childs.push(syntax.right[0]);
				}
				return childs;
			},
			"node":(childs:Array<ParserNode>)=>{
				let node = new ParserNode;			
				if(childs.length == 1){
					if(syntax.left){
						node.str = childs[0].str + operator;
					}
					else{
						node.str = operator + childs[0].str;
					}
				}else{
					if(syntax.left){
						node.str = syntax.left.value + operator;
					}
					else{
						node.str = operator + syntax.right[0].value;
					}
				}			
				return node;
			}
		})
	}
}

const genKvDvChildFunc = (syntax:Syntax) => {
	return ():Array<Syntax>=> isBuildIn(syntax.right[1]) ? [] :  [syntax.right[1]]
}

const genKvDvNodeFunc = (operator:string, syntax:Syntax) => {
	return (childs:Array<ParserNode>)=>{
		let node = new ParserNode;			
		node.str = syntax.right[0].value + operator + (childs.length == 0 ? syntax.right[1].value : childs[0].str);
		calHash(childs, node);
		return node;
	}
}


const genifelseifChildFunc = (syntax:Syntax) => {
	return ():Array<Syntax>=> {
		let childs = [];
		if(!isBuildIn(syntax.right[0])){
			syntax.right[0].parent = syntax;
			childs.push(syntax.right[0]);
		}
			

		for(let i = 1; i < syntax.right.length; i++){
			syntax.right[i].parent = syntax;
			childs.push(syntax.right[i]);
		}
			
		return childs;
	}
}

const genifelseifNodeFunc = (operator:string, syntax:Syntax) => {
	return (childs:Array<ParserNode>)=>{
		let node = new ParserNode;
		if(!isBuildIn(syntax.right[0]))
			node.str = operator + `(${ childs[0].str})`;
		else
			node.str = operator + `(${syntax.right[0].value})`;
		return node;
	}
}

const scriptFunc = (syntax:Syntax, parent:Syntax)=>{
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=>{
			syntax.parent = parent;
			for(let i = 0; i < syntax.right.length; i++){
				syntax.right[i].parent = syntax;
			}
			return syntax.right;
		},
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			//node.str = childs[0].str;
			node.cs = true;
			return node;
		}
	})
}

const execFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=>syntax.right,
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			node.str = childs[0].str;
			return node;
		},
		"suf":(node:ParserNode):String=> node.str+`;`
	})
}

const fieldeFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=>{
			let childs =[];
			(!isBuildIn(syntax.left)) && childs.push(syntax.left);
			(!isBuildIn(syntax.right[0])) && childs.push(syntax.right[0]);
			return childs;
		},
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			let left = "";
			let right = "";
			if(childs.length == 2){
				left = childs[0].str;
				right = childs[1].str;
			}else if(childs.length == 1){
				if(isBuildIn(syntax.left)){
					left = syntax.left.value;
					right = childs[0].str;
				}else{
					left = childs[0].str;
					right = syntax.right[0].value;					
				}
			}
			else{
				left = syntax.left.value;
				right = syntax.right[0].value;
			}
			node.str = left + `[` + right + `]`;
			return node;
		}
	})
}

const fieldFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=>{
			let childs = [];
			if(!isBuildIn(syntax.left))
				childs.push(syntax.left);
			if(!isBuildIn(syntax.right[0]))//理论上右边肯定是identifier
				childs.push(syntax.right[0]);
			return childs;
		},
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			if(!isBuildIn(syntax.left)){
				node.str += childs[0].str  + `.`;
			}else{
				node.str += syntax.left.value + `.`;
			}
			if(!isBuildIn(syntax.right[0])){
				node.str += childs.length == 2 ? childs[1].str : childs[0].str ;
			}else{
				node.str += syntax.right[0].value;
			}
			return node;
		}
	})
}

const callFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=>{
			let childs = [];
			if(!isBuildIn(syntax.left))
				childs.push(syntax.left);
			for(let i = 0; i < syntax.right.length; i ++){
				if(!isBuildIn(syntax.right[i]))
					childs.push(syntax.right[i]);
			}
			return childs;
		},
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			let index = 0;
			if(!isBuildIn(syntax.left))
				node.str += childs[index++].str + "(";
			else
				node.str +=syntax.left.value + "(";

			for(let i = 0; i < syntax.right.length - 1; i ++){
				if(!isBuildIn(syntax.right[i]))
					node.str += childs[index++].str + ",";
				else
					node.str+=syntax.right[i].value + ",";
			}

			if(syntax.right.length > 0){
				if(!isBuildIn(syntax.right[syntax.right.length - 1]))
					node.str += childs[childs.length - 1].str;
				else
					node.str += syntax.right[syntax.right.length - 1].value
			}
			node.str+=")";
			return node;
		}
	})
}

//子节点一定是一个dv
const defFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=>[syntax.right[0]],
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			node.str = `let ` + childs[0].str + `;`;
			return node;
		},
		"suf":(node:ParserNode):String=>node.str
	})
}

const dvFunc = (syntax:Syntax, parent:Syntax)=> {
	return Object.assign({}, defaultParse,{
		"child":genKvDvChildFunc(syntax),
		"node":genKvDvNodeFunc(`=`, syntax)
	})
}

const kvFunc = (syntax:Syntax, parent:Syntax)=> {
	return Object.assign({}, defaultParse,{
		"child":genKvDvChildFunc(syntax),
		"node":genKvDvNodeFunc(`:`, syntax)
	})
}

//自增自减
const mulmulFunc = genAutoFunc(`--`);
const addaddFunc = genAutoFunc(`++`);
const negFunc = genAutoFunc(`!`);

//赋值是不会被嵌套的，可以等到返回了再赋值
const assignFunc = genMathFunc(`=`);
const addFunc = genMathFunc(`+`);
const subFunc = genMathFunc(`-`);
const mulFunc = genMathFunc(`*`);
const divFunc = genMathFunc(`/`);
const remFunc = genMathFunc(`%`);
const addEqualFunc = genMathFunc(`+=`);
const subEqualFunc = genMathFunc(`-=`);
const mulEqualFunc = genMathFunc(`*=`);
const divEqualFunc = genMathFunc(`/=`);
const remEqualFunc = genMathFunc(`%=`);
const tripleEqualFunc = genMathFunc(`===`);
const tripleUnequalFunc = genMathFunc(`!==`);
const doubleEqualFunc = genMathFunc(`==`);
const doubleUnequalFunc = genMathFunc(`!=`);
const lessEqualFunc = genMathFunc(`<=`);
const bigEqualFunc = genMathFunc(`>=`);
const lessFunc = genMathFunc(`<`);
const bigFunc = genMathFunc(`>`);
const orFunc = genMathFunc(`|`);
const andFunc = genMathFunc(`&`);
const ororFunc = genMathFunc(`||`);
const andandFunc = genMathFunc(`&&`);

const bracketFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=> isBuildIn(syntax.right[0]) ? [] :  [syntax.right[0]],
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;			
			node.str = `(` + (childs.length == 0 ? syntax.right[0].value : childs[0].str)+ `)`;
			return node;
		}
	})
}

const objFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=> syntax.right,
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;			
			node.str = `{`;
			for(let i = 0; i < childs.length - 1; i ++){
				node.str += childs[i].str + `,`;
			}
			if(childs.length > 0){
				node.str += childs[childs.length - 1].str;
			}
			node.str +=`}`;
			return node;
		}
	})	
}

const arrFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=> syntax.right,
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			let lastIndex = childs.length - 1;			
			node.str = `[`; 
			for(let i = 0; i < lastIndex; i++){
				node.str += childs[i].str + ",";
			}
			if(childs[lastIndex]){
				node.str += childs[lastIndex].str;
			}			
			node.str +=`]`;
			return node;
		}
	}) 
}



const ifFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":genifelseifChildFunc(syntax),
		"node":genifelseifNodeFunc(`if`, syntax),
		"pre":(node:ParserNode):String=>node.str
	})
}

const elseifFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":genifelseifChildFunc(syntax),
		"node":genifelseifNodeFunc(`else if`, syntax),
		"pre":(node:ParserNode):String=>node.str
	})
}

const elseFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=> syntax.right,
		"pre":(node:ParserNode):String=>`else`
	})
}

const forFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=>{
			let childs = [], expr, body, right = syntax.right;
			if(right.length === 5){
				expr = right[3];
				body = right[4]
			}else if(right.length === 4){
				expr = right[2];
				body = right[3];
			}
			if(!isBuildIn(expr)){
				childs.push(expr)
			}
			childs.push(body)
			return childs;
		},
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode, expr, body, type, right = syntax.right, forRet, extra;
			node.str = "";
			if(right.length === 5){					
				type = right[2].value;
				if(type === "of"){
					forRet = right[1].value;
					extra = right[0].value;
				}else if(type === "in"){
					forRet = right[0].value		
					extra = right[1].value;
				}
				expr = childs.length == 2?childs[0].str:right[3].value;
				body = right[4];
			}else if(right.length === 4){
				type = right[1].value;
				forRet = right[0].value;
				expr = childs.length == 2?childs[0].str:right[2].value;
				body = right[3];
			}

			
			if(type === "of" && right.length === 5){
				node.str += `{let _$i = 0;
				`;
			}
			node.str += `for(let ${forRet} ${type} ${expr}){`;
			if(type === "of" && right.length === 5){
				node.str += `let ${extra} = _$i++;`;
			}else if(type === "in" && right.length === 5){
				node.str += `let ${extra} = ${expr}[${forRet}];`;
			}				
			return node;
		},
		"pre":(node:ParserNode):String=> node.str,
		"suf":(node:ParserNode):String=>{
			let str = "}";
			if(syntax.right[2].value === "of"){
				str += "}";
			}
			return str;
		}
	})
}

const whileFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=>{
			let childs = [];
			if(!isBuildIn(syntax.right[0])){
				childs.push(syntax.right[0]);
			}
			childs.push(syntax.right[1])
			return childs;
		},
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			node.str = `while(`;
			if(childs.length == 2)
				node.str+=childs[0].str + `){`;
			else
				node.str+=syntax.right[0] + `){`;										
			return node;
		},
		"pre":(node:ParserNode):String=> node.str,
		"suf":(node:ParserNode):String=>`}`
	})
}

const jscontinueFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"pre":(node:ParserNode):String=> `continue;`
	})
}

const regularFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"node":(node:ParserNode):String=> syntax.value
	})
}

const jsbreankFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"pre":(node:ParserNode):String=> `break;`
	})
}

const newFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=>isBuildIn(syntax.right[0]) ? [] : syntax.right,
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			if(!isBuildIn(syntax.right[0]))
				node.str = `new ` + childs[0].str + `;`;
			else
				node.str = `new ` + syntax.right[0].value + `;`;
			return node;
		}
	})
}

const condFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=>{
			let childs = [];
			if(!isBuildIn(syntax.left))
				childs.push(syntax.left)
			if(!isBuildIn(syntax.right[0]))
				childs.push(syntax.right[0])
			if(!isBuildIn(syntax.right[1]))
				childs.push(syntax.right[1])
			return childs;
		},
		"node":(childs:Array<ParserNode>)=>{
			let index = 0;
			let node = new ParserNode;
			if(!isBuildIn(syntax.left))
				node.str = childs[index++].str + `?`;
			else
				node.str = syntax.left.value + `?`;
			if(!isBuildIn(syntax.right[0]))
				node.str += childs[index++].str + `:`;
			else
				node.str += syntax.right[0].value + `:`;
			if(!isBuildIn(syntax.right[1]))
				node.str += childs[index].str;
			else
				node.str += syntax.right[1].value;							
			return node;
		}
	})
}

const attrsFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=>syntax.right,
		"node":(childs:Array<ParserNode>)=>{
			let node = containScript(childs);
			calHash(childs, node);								
			return node;
		},
		"pre":(node:ParserNode) =>{
			let size = 0;
			let str = ``;
			for(let i = 0; i < syntax.right.length; i++){
				let name = syntax.right[i].right[0].value;
				if(name != "w-tag" && name != "w-did"){
					size++;
				}
			}
			if(size > 0){
				str += `node.attrSize = ${size};`;
			}
			str += `node.attrHash = ${node.hash};`
			return str;
			
		}
	})
}

const containScript = (childs:Array<ParserNode>, node?: ParserNode) =>{
	node = node? node: new ParserNode;
	for(let i = 0; i < childs.length; i ++){
		if(childs[i].cs === true){
			node.cs = true;
		}
	}			
	return node;
}

//汇总静态hash
const calHash = (childs:Array<ParserNode>, node: ParserNode) =>{
	for(let i = 0; i < childs.length; i ++){
		if(childs[i].hash){
			node.hash = hash.nextHash(node.hash, childs[i].hash) ;
		}
	}	
}

const lstringFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			node.hash = calTextHash(syntax.value);	
			return node;
		},
		"pre":(node:ParserNode):String=>{
			let str = ``;
			let parentType = ""
			if(syntax.parent.type == "body"){
				if(syntax.parent.parent.type == "else"){
					parentType = syntax.parent.parent.parent.parent.parent.type
				}else{
					parentType = syntax.parent.parent.parent.parent.type
				}
			}else{
				parentType = syntax.parent.type;
			}
			if(parentType == "attrscript"){
				str = `attrvalue += "` + syntax.value + `";`			
			}else if(parentType == "singleattrscript"){
				str = `attrvalue += '` + syntax.value + `';`
			}else if(parentType == "jscript"){
				str = `jvalue += "` + syntax.value + `";`  								
			}			
			return str;
		}		
	})
}

const jsfnFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=>{
			syntax.parent = parent;
			for(let i = 0; i < syntax.right.length; i++){
				syntax.right[i].parent = syntax;
			}
			return syntax.right;
		},
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			node.str = "function" + childs[0].str + childs[1].str;	
			return node;
		}
	})
}

const jsfnargsFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			let lastIndex = syntax.right.length - 1;
			node.str = "(";
			for(let i = 0; i < lastIndex; i++){
				node.str += syntax.right[i].value + ",";
			}
			if(syntax.right[lastIndex])
				node.str += syntax.right[lastIndex].value;
			node.str += ")";	
			return node;
		}
	})
}

const jsblockFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=> syntax.right,
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			let index = 0;
			node.str = "{";	
			for(let i = 0; i < syntax.right.length; i ++){
				if(!isBuildIn(syntax.right[i]))
					node.str += childs[index++].str + ";";
				else
					node.str += syntax.right[i].value + ";";
			}
			node.str += "}";	
			return node;
		}
	})
}

const jsbodyFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=> syntax.right,
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			let index = 0;
			node.str = "{";	
			for(let i = 0; i < syntax.right.length; i ++){
				if(!isBuildIn(syntax.right[i]))
					node.str += childs[index++].str + ";";
				else
					node.str += syntax.right[i].value + ";";
			}
			node.str += "}";
			return node;
		}
	})
}

const jsdefFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=>syntax.right,
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			let index = 0;
			node.str = "let ";
			for(let i = 0; i < childs.length - 1; i++){
				node.str += childs[i].str + ",";
			}
			if(childs.length > 0){
				node.str += childs[childs.length - 1].str;
			}
			return node;
		}
	})
}

const genjsifNodeFunc = (op: string, syntax:Syntax) => {
	return (childs:Array<ParserNode>)=>{
		let n = new ParserNode;
		n.str = op;
		if(syntax.right[0].type === "identifier" || isBuildIn(syntax.right[0])){
			n.str += `(${syntax.right[0].value})`;
			if(childs[0]){
				n.str += childs[0].str;
			}
		}else{
			n.str += `(${childs[0].str})`;
		}

		for(var i = 1; i < childs.length; i++){
			if(childs[i]){
				n.str += childs[i].str;
			}
		}		
		return n;
	}
}

const genBaseFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"node": (childs: Array<ParserNode>) => {
			let node = new ParserNode;
			node.str = syntax.value;
			calHash(childs, node);	
			return node;
		}
	})
}


const genRightBuiltIn = (syntax:Syntax):Array<Syntax> => {
	let childs = [];
	for(let i = 0; i < syntax.right.length; i ++){
		if(!isBuildIn(syntax.right[i]))
			childs.push(syntax.right[i]);
	}
	return childs;
}

const jsifFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":genifelseifChildFunc(syntax),
		"node":genjsifNodeFunc("if", syntax)
	})
}

const jselseifFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":genifelseifChildFunc(syntax),
		"node":genjsifNodeFunc("else if", syntax)
	})
}

const jselseFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=> syntax.right,
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			if(childs[0]){
				node.str = `else `;
				node.str += childs[0].str;
			}
			return node;
		}
	})
}

const jsforFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=> syntax.right,
		"node":(childs:Array<ParserNode>)=>{
			if(syntax.right.length != 4){
				throw "for语句,必须且只能包含三个条件和一个代码块！"
			}

			let node = new ParserNode;
			node.str = `for(${childs[0].str};${childs[1].str};${childs[2].str})${childs[3].str}`;
			return node;
		}
	})
}

const jswhileFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=> genRightBuiltIn(syntax),
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			node.str = `while(`;
			if(isBuildIn(syntax.right[0])){
				node.str += syntax.right[0].value + ")";
				node.str += childs[0].str;
			}else{
				node.str += childs[0].str + ")";
				node.str += childs[1].str;
			}
			return node;
		}
	})
}

const jsswitchFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=> genRightBuiltIn(syntax),
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			let index = 0;
			node.str = `switch(`;
			if(isBuildIn(syntax.right[0])){
				node.str += syntax.right[0].value;
			}else{
				node.str += childs[0].str;
				index = 1;
			}
			node.str += `){`;
			
			for(let i = index; i < childs.length; i++){
				node.str += childs[i].str + ";";
			}
			node.str += `}`;
			return node;
		}
	})
}

const jscaseFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=> genRightBuiltIn(syntax),
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			node.str = `case ${syntax.right[0].value}:
			`;
			for(let i = 0; i < childs.length; i++){
				node.str += childs[i].str + ";";
			}
			return node;
		}
	})
}

const jsdefaultFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=> syntax.right,
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			node.str = `default:`;
			for(let i = 0; i < childs.length; i++){
				node.str += childs[i].str + ";";
			}
			return node;
		}
	})
}

const jstryFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=> syntax.right,
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			node.str = `try${childs[0].str}`;
			for(let i = 1; i < childs.length; i++){
				node.str += childs[i].str;
			}
			return node;
		}
	})
}

const jscatchFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=> genRightBuiltIn(syntax),
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			node.str = `catch(${syntax.right[0].value})${childs[0].str}`;
			return node;
		}
	})
}

const jsfinallyFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=> syntax.right,
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			node.str = `finally${childs[0].str}`;
			return node;
		}
	})
}

const jsreturnFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=> syntax.right,
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			node.str = `return`;
			if(childs[0].str)
				node.str += " " + childs[0].str;
			return node;
		}
	})
}

const exprgroupFunc = (syntax:Syntax, parent:Syntax) => {
	return Object.assign({}, defaultParse,{
		"child":():Array<Syntax>=> syntax.right,
		"node":(childs:Array<ParserNode>)=>{
			let node = new ParserNode;
			node.str = "";
			if(childs === null)
				return node;

			let lastIndex = childs.length - 1;
			for(var i  =0; i < lastIndex; i++){
				node.str += childs[i].str + ",";
			}
			if(childs[lastIndex]){
				node.str += childs[lastIndex].str;
			}
			return node;
		}
	})
}


const singlelstringFunc = lstringFunc;

const parserFunc:any = {
	"jarr":jarrFunc,
	"jobj":jobjFunc,
	"jpair":jpairFunc,
	"stringstr":stringstrFunc,
	"jscript":jscriptFunc,
	"jstring":jstringFunc,
	"number": baseFunc,
	"bool": baseFunc,
	"null": baseFunc,

	"body":bodyFunc,	
	"script":scriptFunc,
	"exec":execFunc,	
	"fielde":fieldeFunc,
	"field":fieldFunc,
	"call":callFunc,
	"def":defFunc,
	"dv":dvFunc,
	"!":negFunc,
	"--":mulmulFunc,
	"++":addaddFunc,
	"=":assignFunc,
	"+":addFunc,
	"-":subFunc,
	"*":mulFunc,
	"/":divFunc,
	"%":remFunc,
	"+=":addEqualFunc,
	"-=":subEqualFunc,
	"*=":mulEqualFunc,
	"/=":divEqualFunc,
	"%=":remEqualFunc,
	"===":tripleEqualFunc,
	"!==":tripleUnequalFunc,
	"==":doubleEqualFunc,
	"!=":doubleUnequalFunc,
	"<=":lessEqualFunc,
	">=":bigEqualFunc,
	"<":lessFunc,
	">":bigFunc,
	"|":orFunc,
	"&":andFunc,
	"||":ororFunc,
	"&&":andandFunc,
	"bracket":bracketFunc,
	"obj":objFunc,//obj比jobj简单
	"kv":kvFunc,//kv比jpair简单
	"arr":arrFunc,//比jarr简单
	"jsexpr":jsExprFunc,
	"if":ifFunc,
	"else":elseFunc,
	"elseif":elseifFunc,
	"for":forFunc,
	"while":whileFunc,
	"jscontinue":jscontinueFunc,
	"jsbreak":jsbreankFunc,
	"return":genBaseFunc,
	"new":newFunc,
	"cond":condFunc,//三元运算符

	"jsblock":jsblockFunc,
	"jsbody":jsbodyFunc,
	"jsfnargs":jsfnargsFunc,//
	"jsfn":jsfnFunc,//
	"jsdef":jsdefFunc,
	"jsif":jsifFunc,
	"jselseif":jselseifFunc,
	"jselse":jselseFunc,
	"jsfor":jsforFunc,
	"jswhile":jswhileFunc,
	"jsswitch":jsswitchFunc,
	"jscase":jscaseFunc,
	"jsdefault":jsdefaultFunc,
	"jstry":jstryFunc,
	"jscatch":jscatchFunc,
	"jsfinally":jsfinallyFunc,
	"jsreturn": jsreturnFunc,
	"exprgroup":exprgroupFunc,

	"identifier":genBaseFunc,
	"float":genBaseFunc,
	"floate":genBaseFunc,
	"integer16":genBaseFunc,
	"integer":genBaseFunc,
	"integer10":genBaseFunc,
	"string":genBaseFunc,
	"true":genBaseFunc,
	"false":genBaseFunc,
	";":genBaseFunc
	// "identifier":identifierFunc//identifier,只在js中可能被解析到
} 
parserFunc.html = parserFunc.body;
parserFunc.el = parserFunc.body;

/**
 * 将child的hash汇总为childhash
 */
const sumChildHash = (node:ParserNode, childs:Array<ParserNode>)=>{	
	for(let i = 0; i< childs.length; i++){
		node.childHash ^= hash.nextHash(calTextHash(childs[i].hash+""),i+1);
	}
	node.hash ^= node.childHash;
}

/**
 * 只有tag才需要用到的
 */
const calTagHash = (node:ParserNode, tagName:string)=>{
	node.hash = hash.nextHash(node.hash, calTextHash(tagName));
}

//字符都有双层引号，并不需要去掉，因为在字符串转函数的时候会自动去掉一层
const trimQuo = (str:String) => str.substring(1, str.length-1)

const isBuildIn = (syntax:Syntax):boolean => syntax.type == "string" || syntax.type == "number" || syntax.type == "bool" || syntax.type == "true" || syntax.type == "false" || syntax.type == "null" || syntax.type == "undefined" || 
syntax.type == "integer" || syntax.type == "integer16" || syntax.type == "float" || syntax.type == "identifier" || syntax.type == "singlequotestring" || syntax.type == "regular";

const isScript = (syntax:Syntax):boolean => syntax.type == "script";
const isjstrjscript = (syntax:Syntax):boolean => syntax.type == "jscript" || syntax.type == "jstr";
//本身就有引号了
const parseBuildIn = (syntax:Syntax) => {
	return syntax.value;
}
const isAttrStr = (syntax:Syntax):boolean => syntax.type == "attrStr";

// ================ JS的处理整体要简单很多
// child -> node->pre -> suf
let defaultParse = {
	"child":():Array<Syntax>=>[],
	"node":(childs:Array<ParserNode>)=>{
		let node = new ParserNode();
		return node;
	},
	"pre":(node:ParserNode):String=>``,
	"suf":(node:ParserNode):String=>``
}


let sid = 0;

const getJsonKey = (syntax: Syntax) => {
	if(syntax.type === "jstring"){
		return `"${syntax.right[0].value}"`;
	}else if(syntax.type === "identifier"){
		return `"${syntax.value}"`;
	}
}

const findJsonContainer = (syntax:Syntax): Syntax => {
	if(!syntax){
		return null;
	}
	if(syntax.type === "jarr" || syntax.type === "jpair"){
		return syntax;
	}
	return findJsonContainer(syntax.parent);
}

const getJarrJpair = (p:Syntax, value: any): string => {
	if(p.type === "jarr"){
		return `node.push(${value});`
	}else{//jpair
		let key = getJsonKey(p.right[0]);
		return `node[${key}] = ${value};`
	}
}

/**
 * @description 转换字符串成模板函数
 * @example
 */
export const toFun = (s: string, path?: string) => {
	try{
	return (new Function("_nextHash", "_anyHash","_get","return" + s.slice(0, s.length-1)))(hash.nextHash, hash.anyHash, commonjs ? commonjs.relativeGet:null);
	}catch(e) {
		warn(level, "tpl toFun, path: "+path+", s: ", s, e);
		throw(e);
	}
}

