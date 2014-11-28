function extnd(base,inh){
  inh.prototype = Object.create(base.prototype);
  inh.prototype.inherits = []
  if(base.prototype.inherits && base.prototype.inherits.length)
    inh.prototype.inherits.concat(base)

  var l = base.inherits && base.inherits.length || 0;
  console.log(inh.prototype.inherits)
  inh.prototype.super = function(){
    console.log(l)
    console.log(this.inherits.length)
    this.inherits[l].apply(this,arguments);
  }
  return inh;
}

function A(arg){
  console.log('A')
  this._arg = arg;
  this.name = 'A'
}

A.prototype = {names:['a','b','c']}
C = extnd(A,function(){
console.log('C')
  this.super('C');
  this.names = [6,7,8].concat(this.names)
})
D = extnd(C,function(){
  console.log('D')
  this.super()
  this.names = [1,2,3]
})
console.log(C)
a = new A();
c = new C();
d = new D();

console.log(c.names)
console.log(c._arg)
console.log(c.name)
console.log(d.names)
console.log(d._arg)
console.log(d.name)
