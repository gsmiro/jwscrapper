function A(){
	console.log('ctor A');
	this.name = 'A';
	this.test = function(){
		console.log('parent '+this.name);
		return this;
	}
}
function ovr(func,f){
	var ctx = this;
	var sup = this[func];
	if(sup === f)return sup;
	f.super = function(){
		console.log('super '+func + ' in ctx '+this.name);
		return sup.apply(ctx,arguments);
	}
	this[func] = f;
	return f;
}
function execinherited(){
	if(this.inherits.length){
		var f = this.inherits.pop();
		console.log('invoking ')
		console.log(f);
		f.apply(this,arguments);
		console.log(this);
	}else delete this.inherits;
}
function extend(sup,inh){
	inh.prototype = Object.create(sup.prototype);
	var stack = [];
	stack = stack.concat(sup.prototype.inherits || []);
	stack.push(sup);	
	console.log(stack)
	inh.prototype.inherits = stack;
	inh.prototype.super = execinherited;
	inh.prototype.override = ovr;
	console.log(inh);
	console.log(inh.prototype.inherits)
	return inh;
}

var B = extend(A,function b(){
	this.super();
	this.name += 'B';
});

var C = extend(B,function c(){
	this.super();
	this.name += 'C';
});

var arr = [new A(),new B(),new C()]
for(var i in arr)console.log(arr[i].test());
