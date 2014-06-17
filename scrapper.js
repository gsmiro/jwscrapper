var htmlparser = require('htmlparser2');
var https = require('https');
var http = require('http');
var fs = require('fs');
function np(attrib,regexVal,cb){
	var reg = new RegExp(regexVal);
	var parser = new htmlparser.Parser({
		onattribute:function(name,val){
			if(name === attrib && reg.test(val)){
				cb(val);		
			}
		}
	});
	return parser;
}
function get(base,val,cb,cache){
	if(cache && cache[base+val]){
		console.log('cached ' + base+val);
		return cache[base+val];
	}else console.log('requesting '+base+val)
	var req = https.get(base + val,function(res){
		console.log(base+val+' '+res.statusCode);
		if(res.statusCode === 200){
			res.pipe(typeof cb === 'Function'?cb(res):cb);
		}else if(res.statusCode === 302){
			get('',res.headers.location,cb,cache);
		}else
		  console.log(res); 
	}).on('error',function(err){console.log(err)}).on('end',function(){
		console.log('Closing stream '+base+val);
		cb.end();
	});;
	if(cache) cache[base+val] = req;
	return req;
	
}
var base = 'https://web.archive.org';
var urls = {'/web/2014*/http://jw.org/en':true,'/web/2013*/http://jw.org/en':true,'/web/2012*/http://jw.org/en':true};
var cache = {};
function it(urls,regex,attr,endF){
	console.log(urls);
	var reg = new RegExp(regex);
	
	function _do(idx){
		var arr = {};
		var parser = new htmlparser.Parser({
			onattribute:function(name,val){
				if(name == attr && reg.test(val)){
					console.log('read '+idx+' '+val);
					arr[val] = true;
				}
			}
		});
		if(!cache[idx]){
			console.log('cache miss '+idx);
			var req = https.get(base+idx,function(res){
				res.on('data',function(data){
					parser.write(data)
				}).on('end',function(){
					console.log('parsed '+this.req.path+' '+idx+ ' '+(this.req.path === idx));
					console.log(arr);
					parser.end();
					cache[this.req.path] = true;
					endF(arr)
				}).on('error',function(err){console.log(err)});
			}).on('error',function(err){console.log(err)});
		}else console.log('cached '+idx);
	}
	for( idx in urls ){
		_do(idx);
	}

}
it(urls,'.*http://www.jw.org/','href',function(arr){
	it(arr,'.*assets/.*/[0-9]+.*(pnr|cnt).*lg.jpg','data-img-size-lg',function(arr){
		console.log(arr);
		function _get(url){
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
		for(url in arr)_get(url);
	});
});
