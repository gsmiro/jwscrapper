var htmlparser = require('htmlparser2');
var https = require('https');
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
var urls = ['/web/2014*/http://jw.org/en']//,'/web/2013*/http://jw.org/en','/web/2012*/http://jw.org/en'];
function it(urls,regex,attr,endF){
	var cache = {};
	var arr = [];
	for( idx in urls ){
	//	var req = get(base,urls[idx],np('href','.*http://www.jw.org',function(val){
	//		get(base,val,np('data-img-size-lg','.*http://assets.jw.org/.*/[0-9]+.*lg.jpg',function(val){
	//			var parts = val.split('/');
	//			var fname = parts[parts.length-1];
	//			console.log('Writing '+fname);
	//			get(base,'/web/'+val,function(res){
	//				console.log('Creating stream for '+fname);
	//				var stream = fs.createWriteStream(fname);
	//				stream.on('error',function(err){
	//						console.log('Whoops!');
	//						console.log(err);
	//				});
	//				return stream;
	//			},cache);
	//		}),cache);	
	//	}),cache);
	//
		var reg = new RegExp(regex);
		var parser = new htmlparser.Parser({
			onattribute:function(name,val){
				if(name == attr && reg.test(val)){
					arr.push(val);
				}
			}
		});
		var req = https.get(base+urls[idx],function(res){
			res.on('data',function(data){parser.write(data)}).on('end',function(){endF(arr)});
		});
	}
	return arr;

}
console.log(it(urls,'.*http://www.jw.org/','href',function(arr){
	it(arr,'.*http://assets.jw.org/.*/[0-9]+.*lg.jpg','data-img-size-lg',function(arr){
		console.log(arr);	
	});
}));
