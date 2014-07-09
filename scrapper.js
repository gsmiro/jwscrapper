var htmlparser = require('htmlparser2');
var fs = require('fs');
var crypto = require('crypto');
var mongo = require('mongodb');
var cron = require('node-schedule');

var arr = ['https://web.archive.org/web/2014*/http://www.jw.org/en/',
						'https://web.archive.org/web/2013*/http://www.jw.org/en/',
						'https://web.archive.org/web/2012*/http://www.jw.org/en/'];
var cache = {};
var ids = {};
function foreach(arr,proc,end){
	for(var idx in arr){
		//console.log('process [%d, %s] of %d',idx,arr[idx],arr.length)
		if(idx == arr.length - 1){
			proc(idx,arr[idx],end);
		}else proc(idx,arr[idx]);
	}
}

function UrlParser(procc){
	var arr = [];
	if(procc === undefined)
		procc = function(item){return item;};
	var parser = new htmlparser.Parser({
		onopentag:function(name,attribs){
		if(attribs.href && attribs.href.match(/.+http:\/\/www.jw.org.*/)){
				arr.push(procc(attribs.href));
			}
		}
	});
	parser.items = function(){ return arr; };
	return parser;
}

function FactsParser(procc){
	var _token = 'init';
	var _readtext = false;
	var _item = {};
	var _licnt = 0;
	var arr = [];
	if(procc === undefined)
		procc = function(item){ return item };
	var parser = new htmlparser.Parser({
		onopentag:function(name,attribs){
			if(_token === 'init' && name === 'li' && attribs.class && attribs.class.match(/\s*sliderItem\s*/)){
				ids[attribs['data-slide-id']] = true;
				_token = name;
				_licnt++;
			}else if(_licnt){
				if(name === 'h2' || name === 'h3' || name === 'ul'){
					_token = name;
					_readtext = true;
					_item[_token] = [];
				}else if(name === 'span' && attribs.class && attribs.class.match(/\s*jsRespImg\s*/)){
					var o = {};
					var images = _item.images === undefined?{}:_item.images;
					var add = false;
					for(var att in attribs)
						if(att.match(/data-img-size-\w{2}/)){
							o[att] = attribs[att];
							add = true;
						}else if(att.match(/data-img-type/)){
							images[attribs[att]] = o;
						}
					if(add)
						_item.images = images;
				}
			}
		},
		ontext:function(text){
			if(_readtext && text.replace(/[\n\s\t]/g,'').length)
					_item[_token].push(text);
		},
		onclosetag:function(name){
			if(_readtext && name === 'ul'){
				console.log(_item);
				if(_item.images)
					arr.push(procc(_item));
				_token = 'init';
				_readtext = false;
				_item = {};
			}
			if(name === 'li' && _licnt){
				_licnt--;
			}
		}
	});
	parser.d_end = parser.end;
	parser.end = function(){
		var _arr = arr;
		_token = 'init';
		_readtext = false;
		_item = {};
		_licnt = 0;
		arr = [];
		parser.d_end();
		return _arr;
	}
	parser.items = function(){ return arr; };
	return parser;
}

function Requestor(parser, maxrdrct){
	if(maxrdrct === undefined)maxrdrct = 3;
	var arr = [];
	var redirects = 0;
	var req = function(idx,url,end){
		if(!cache[url]){
			console.log(cache);
			function err(err){console.log(url);console.log(err)};
			var proto = url.match(/https:.*/)?require('https'):require('http');
			parser.end();
			proto.get(url,function(res){
				if(res.statusCode === 200)
					res.on('data',function(data){
						parser.write(data)
					}).on('end',function(){
						console.log('parsed '+this.req.path+' for '+url);
						parser.end();
						cache[url] = this.req.path;
						if(end)end(parser.items())
					}).on('error',err);
				else if(res.statusCode > 301 && res.statusCode < 309){
					if(redirects < maxrdrct){
						redirects++;
						console.log('Redirecting to '+res.headers.location)
						return req(idx,res.headers.location,end);
					}else console.log('Maximum redirects reached for '+url)
				}else console.log('Unable to process response ' + res.statusCode);
			}).on('error',err);
		}else {console.log('cached '+url);}
	}
	return req;
}

foreach(arr,Requestor(UrlParser(function(item){return 'https://web.archive.org' + item;})),function(arr){
	foreach(arr,Requestor(FactsParser()),function(arr){
		function conn(){
			mongo.connect('mongodb://localhost:27017/jwscrapper',function(err,db){
    		if(err)throw err;
				db.collection('imgs').remove({},function(err,result){
						console.log(result);
						db.collection('imgs').insert(arr,{w:1},function(err,result){
								console.log(result);
								db.close();
						});
				});
      });
		}
		conn();
	});
});
