var htmlparser = require('htmlparser2');
var https = require('https');
var http = require('http');
var fs = require('fs');
var crypto = require('crypto');
var mongo = require('mongodb');
var cron = require('node-schedule');


var base = 'https://web.archive.org';
var urls = {'https://web.archive.org/web/2014*/http://jw.org/en':true,'https://web.archive.org/web/2013*/http://jw.org/en':true,'https://web.archive.org/web/2012*/http://jw.org/en':true};
var cache = {};
function it(base,urls,regex,attr,end){
	console.log(urls);
	var reg = new RegExp(regex);
	var cnt = 0;
	var  max = urls.length;
	if(max === udefined){
		max = 0;
		for( url in urls)max++;
	}
	var arr = {};
	function _do(url){
		var parser = new htmlparser.Parser({
			onattribute:function(name,val){
				if(name == attr && reg.test(val)){
					if(val.indexOf(base) == 0)
						arr[val] = url;
					else
						arr[base+val] = url;
				}
			}
		});
		if(!cache[url]){
			console.log('cache miss '+url);
			var req = https.get(url,function(res){
				res.on('data',function(data){
					parser.write(data)
				}).on('end',function(){
					console.log('parsed '+this.req.path+' for '+url);
					parser.end();
					console.log(arr);
					cache[this.req.path] = true;
					cnt++;
					if(cnt == max)
						end(arr)
					else console.log(cnt +' '+max);
				}).on('error',function(err){console.log(err);cnt++;});
			}).on('error',function(err){console.log(err);cnt++});
		}else {console.log('cached '+url);cnt++}
	}
	for( url in urls ){
		_do(url);
	}
}

it(base,urls,'.*http://www.jw.org/','href',function(arr){
	it('http://assets.jw.org/',arr,'.*assets/.*/[0-9]+.*(pnr|cnt).*lg.jpg','data-img-size-lg',function(arr){
		mongo.connect('mongodb://localhost:27017/jwscrapper',function(err,db){
			console.log('saving');
			console.log(arr);
			if(err)throw err;
			console.log('connected');
			var docs = [];
			function _from(val){
				var arr = [];
				var value = val.match(/web.([0-9]+).http/)[1];
				for(var idx in [4,2,2,2]){
					arr.push()
				}
				return
			}
			for(var url in arr) docs.push({'_id':url,'from':_from(arr[url])});
			db.collection('imgs').insert(docs,{w:1},function(err,result){
				console.log(result);
			});
			db.close();
		});
	});
});

function foreach(arr,proc,end){
	var res = [];
	this.arr = [];
	for(var idx in arr){
		if(idx === arr.length)
		  proc.call(this,idx,arr[idx]);
		else proc.call(this,idx,arr[idx],end);
	}
	return res;
}

function invoke(idx,item,res,end){
	console.log(this.arr);
  var self = this;
	var parser = new htmlparser.Parser({
		onopentag:function(name,attribs){
			if(this._token === 'init' && name === 'li' && attribs.class && attribs.class.match(/\s*sliderItem\s*/)){
				this._token = name;
			}else if(this._token === 'li'){
				if(name === 'div' && attribs.class && attribs.class.match(/\s*jsImgDescr\s*/){
					this._token = 'facts';
				}
			}else if(this._token === 'facts'){
				if(name === 'h2' || name === 'h3'){
					this._token = name;
				}else if(name === 'p'){
					if(attribs.id === 'p2')this._token = 'population'
					else if(attribs.id === 'p3')this._token = 'ministers'
					else if(attribs.id === 'p4')this._token = 'congregations'
					else if(attribs.id === 'p5')this._token = 'rate'
				}
			}
			if(name === 'span' && attribs.class && attribs.class.match(/\s*jsRespImg\s*/)){
				var o = {};
				for(var att in attribs)
					if(att.match(/data-image-size-\w{2}/)){
						o[att] = attribs[att];
					}
				this.arr.push(o);
			}
		},
		ontext:function(text){
			if(this._readtext)
				this._item[this._token] = text;
				if(this._token === 'population' ||
					this._token === 'ministers' ||
					this._token === 'congregations' ||
					this._token === 'rate'){
						this._token = 'facts';
				}
			}
		},
		onclosetag:function(name){
			if(this._token === 'end'){
				this._arr.push(this._item);
				this._token = 'init';
			}else if(name === 'h2' || name === 'h3')
				this._token = 'facts';
		}
	});
	parser._token = 'init';
	parser._readtext = false;
	parser._item = {};
	parser._arr = arr;
	if(!cache[url]){
		console.log('cache miss '+url);
		var req = https.get(url,function(res){
			res.on('data',function(data){
				parser.write(data)
			}).on('end',function(){
				console.log('parsed '+this.req.path+' for '+url);
				parser.end();
				console.log(arr);
				cache[this.req.path] = true;
				if(end)
					end(arr)
			}).on('error',function(err){console.log(err);cnt++;});
		}).on('error',function(err){console.log(err);cnt++});
	}else {console.log('cached '+url);cnt++}

	if(end)end(this.arr);
  return res;
}
