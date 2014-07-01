var htmlparser = require('htmlparser2');
//var https = require('https');
//var http = require('http');
var fs = require('fs');
var crypto = require('crypto');
var mongo = require('mongodb');
var cron = require('node-schedule');


var base = 'https://web.archive.org';
var urls = ['http://www.jw.org/en/']//['https://web.archive.org/web/2014*/http://jw.org/en',
						//'https://web.archive.org/web/2013*/http://jw.org/en',
						//'https://web.archive.org/web/2012*/http://jw.org/en'];
var cache = {};

function foreach(arr,proc,end){
	(function(){
	this._arr = [];
	for(var idx in arr){
		console.log('%d %d',idx,arr.length)
		if(idx == arr.length - 1)
		  proc.call(this,idx,arr[idx],end);
		else proc.call(this,idx,arr[idx]);
	}})();
}

function invoke(idx,url,end){
	this._token = 'init';
	this._readtext = false;
	this._item = {};
	var self = this;
	var parser = new htmlparser.Parser({
		onopentag:function(name,attribs){
			function dbg(){
				console.log('onopentag %s %s %s',name,self._token,self._readtext);
				console.log(self._item);
				console.log(attribs);
			}
			if(name === 'li' && attribs.class && attribs.class.match(/\s*sliderItem\s*/)){
				dbg();
				if(self._item.images !== undefined){
					self._arr.push(self._item);
					self._item = {};
				}
				self._token = name;
			}else if(self._token === 'li'){
				if(name === 'div' && attribs.class && attribs.class.match(/\s*jsImgDescr\s*/)){
					dbg();
					self._token = 'facts';
				}
			}else if(self._token === 'facts'){
			 if(name === 'p' || name === 'h2' || name === 'h3'){
					dbg();
					if(attribs.id === 'p2')self._token = 'population'
					else if(attribs.id === 'p3')self._token = 'ministers'
					else if(attribs.id === 'p4')self._token = 'congregations'
					else if(attribs.id === 'p5')self._token = 'rate'
					else self._token = name;
					self._readtext = true;
					self._item[self._token] = [];
				}
			}
			if(name === 'span' && attribs.class && attribs.class.match(/\s*jsRespImg\s*/)){
				dbg();
				var o = {};
				var add = false;
				for(var att in attribs)
					if(att.match(/data-img-size-\w{2}/)){
						o[att] = attribs[att];
						add = true;
					}
				if(add)
					self._item.images = o;
				console.log(self._item);
			}
		},
		ontext:function(text){
			if(self._readtext){
				console.log('ontext %s %s %s',text,self._token,self._readtext);
				self._item[self._token].push(text);
				console.log(self._item);
			}

		},
		onclosetag:function(name){
			function dbg(){
				console.log('onclosetag %s %s %s',name,self._token,self._readtext);
				console.log(self._item);
				console.log(self._arr);
			}
			if(self._readtext){
				dbg();
				self._token = 'facts';
				self._readtext = false;

			}
		}
	});
	if(!cache[url]){
		console.log('cache miss '+url);
		var proto = url.match(/https:.*/)?require('https'):require('http');
		var req = proto.get(url,function(res){
			res.on('data',function(data){
				parser.write(data)
			}).on('end',function(){
				console.log('parsed '+this.req.path+' for '+url);
				parser.end();
				cache[this.req.path] = true;
				console.log(end);
				if(end)
					end(self._arr)
			}).on('error',function(err){console.log(err);cnt++;});
		}).on('error',function(err){console.log(err);cnt++});
	}else {console.log('cached '+url);cnt++}
}
foreach(urls,invoke,function(arr){
	console.log(arr);
})
