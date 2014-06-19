var htmlparser = require('htmlparser2');
var https = require('https');
var http = require('http');
var fs = require('fs');
var crypto = require('crypto');
var mongo = require('mongodb');

var base = 'https://web.archive.org';
var urls = {'https://web.archive.org/web/2014*/http://jw.org/en':true,'https://web.archive.org/web/2013*/http://jw.org/en':true,'https://web.archive.org/web/2012*/http://jw.org/en':true};
var cache = {};
function it(base,urls,regex,attr,endF,process){
	console.log(urls);
	var reg = new RegExp(regex);
	var cnt = 0;
	var  max = 0;
	for( url in urls)max++;
	var arr = {};
	function _do(idx){
		var parser = new htmlparser.Parser({
			onattribute:function(name,val){
				if(name == attr && reg.test(val)){
					if(val.indexOf(base) == 0)
						arr[val]=true;
					else
						arr[base+val] = true;
				}
			}
		});
		if(!cache[idx]){
			console.log('cache miss '+idx);
			var req = https.get(idx,function(res){
				res.on('data',function(data){
					parser.write(data)
				}).on('end',function(){
					console.log('parsed '+this.req.path+' for '+idx);
					parser.end();
					console.log(arr);
					cache[this.req.path] = true;
					cnt++;
					if(cnt == max)
						endF(arr)
					else console.log(cnt +' '+max);
				}).on('error',function(err){console.log(err);cnt++;});
			}).on('error',function(err){console.log(err);cnt++});
		}else {console.log('cached '+idx);cnt++}
	}
	for( idx in urls ){
		_do(idx);
	}

}
function persist(url){
	var parts = url.split('/');
	var fname = parts[parts.length-1];
	if(!cache[url] && !cache[fname]){
		var proto = /^https:\/\/.*/.test(url)?https:http;
		return proto.get(url,function(res){
			if(res.statusCode === 200){
				if(!cache[url] && !cache[fname]){
					cache[fname] = true;
					var stream = fs.createWriteStream(fname);
					stream.on('error',function(err){console.log(err);cache[fname]=false;}).on('finish',function(){console.log('wrote '+fname);});
					res.pipe(stream);
				}else console.log('cached '+url+' '+fname);
			}else if(res.statusCode === 302){
				console.log('REDIRECTING '+url+' to '+res.headers.location);
				_get(res.headers.location);
			}else console.log(res);
		}).on('error',function(err){console.log(err)});
	}else console.log('cached '+url+ ' '+fname);
}

it(base,urls,'.*http://www.jw.org/','href',function(arr){
	it('http://assets.jw.org/',arr,'.*assets/.*/[0-9]+.*(pnr|cnt).*lg.jpg','data-img-size-lg',function(arr){
		console.log(arr);
		mongo.connect('mongodb://localhost:27017/jwscrapper',function(err,db){
		  if(err)throw err;
			var docs = [];
			for(url in arr) docs.push({'_id':url});
			db.collection('imgs').insert(docs,{w:1},function(err,result){
				console.log(result);
			});
		});
	});
});
