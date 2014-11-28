var htmlparser = require('htmlparser2');
var fs = require('fs');
var mongo = require('mongodb');
var m = require('mustache');
var cron = require('node-schedule');

//var arr = ['https://web.archive.org/web/2014*/http://www.jw.org/en/',
//						'https://web.archive.org/web/2013*/http://www.jw.org/en/',
//						'https://web.archive.org/web/2012*/http://www.jw.org/en/'];

var arr = ['https://web.archive.org/web/2014*/http://www.jw.org/'];
process.argv.forEach(function (val, index, array) {
  if(index > 1)arr.push(val);
});
var cache = {};

function foreach(arr,proc,end){
  if(!arr.length)end(arr);
	for(var idx in arr){
		console.log('process [%d, %s] of %d',idx,arr[idx],arr.length)
		if(idx == arr.length -1 )proc(idx,arr[idx],end);
		else proc(idx,arr[idx]);
	}
}



function BaseParser(arg){
  htmlparser.Parser.call(this,arg);
  this._cbs._items = [];
  this._cbs.items = function(item){
    if(item){
      this._items.push(item);
    }
    return this._items;
  }
  this.items = function(){
    return this._cbs.items()
  }
}

BaseParser.prototype = Object.create(htmlparser.Parser.prototype);


function UrlParser(){
  BaseParser.call(this,{
    onopentag:function(name,attribs){
    if(!attribs['data-year'] && attribs.href && attribs.href.match(/.+http:\/\/www.jw.org.*/)){
          this.items('https://web.archive.org'+attribs.href);
      }
    }
  });

}
UrlParser.prototype = Object.create(BaseParser.prototype);


function FactsParser(){
  BaseParser.call(this,{
    state:{
      token:'init',
      readtext:false,
      item:{langs:[],images:[]},
      linct:0
    },
    onopentag:function(name,attribs){
      if(this.state.token === 'init' && name === 'li' && attribs.class && attribs.class.match(/\s*sliderItem\s*/)){
        this.state.token = name;
        this.state.licnt++;
      }else if(this.state.licnt){
        if(name === 'h2' || name === 'h3' || name === 'ul'){
          this.state.token = name;
          this.state.readtext = true;
          this.state.item[this.state.token] = [];
        }else if(name === 'span' && attribs.class && attribs.class.match(/\s*jsRespImg\s*/)){
          var o = {};
          var images = this.state.item.images;
          var add = false;
          var id = null;
          for(var att in attribs)
            if(att.match(/data-img-size-\w{2}/)){
              id = attribs[att].match(/\/([0-9]+).*$/);
              if(id)id = id[1];
              o[att] = attribs[att];
              add = true;
            }else if(att.match(/data-img-type/)){
              images[attribs[att]] = o;
            }
          if(add && !isNaN(id))this.state.item._id = id;
        }
      }
    },
    ontext:function(text){
      if(this.state.readtext && text.replace(/[\n\s\t]/g,'').length)
          this.state.item[this.state.token].push(text);
    },
    onclosetag:function(name){
      if(this.state.readtext && name === 'ul'){
        if(this.state.item.images.length)
          this.items(this.state.item);
        this.state = new State();
      }
      if(name === 'li' && this.state.licnt){
        this.state.licnt--;
      }
    }
  });
}

function LangParser(){
  BaseParser.call(this,{
    parse:false,
    onopentag:function(name,attribs){
      if(!this.parse && name === 'head')this.parse = true;
      else
      if(this.parse && name === 'link' && attribs.hreflang && attribs.href){
        this.items(this._ctx.replace(/\/en\/$/,attribs.href))
      }
    },
    onclosetag:function(name){
      if(this.parse && name === 'head'){
        this.parse = false;
      }
    }
  });
}
LangParser.prototype = Object.create(BaseParser.prototype);

function Requestor(Parser,maxrdrct){
  var urlp = require('url')
	if(maxrdrct === undefined)maxrdrct = 3;
	var arr = [];
	var req = function(idx,url,end){
    if(!cache[url]){
			function err(err){console.log(url);console.log(err);if(end)end([])};
      var proto = url.match(/https:.*/)?require('https'):require('http');
      purl = urlp.parse(url)

      console.log('Parsing '+url+ (redirects?' redirect '+redirects:''));
      var redirects = 0;

      proto.get(url,function(res){
      	if(res.statusCode === 200){
          var parser = new Parser();
          res.on('data',function(data){
          	parser.write(data)
					}).on('end',function(){
						console.log('parsed '+this.req.path+' for '+url);
						parser.end();
						cache[url] = this.req.path;
						arr = arr.concat(parser.items());
            if(end)
							end(arr);
					}).on('error',err);
				}else if(res.statusCode > 300 && res.statusCode < 309){
          console.log(res.headers.location)
					if(redirects < maxrdrct){
						redirects++;
            var redir = purl.protocol+'//'+purl.hostname+res.headers.location
            console.log(redirects + ' redirect from '+url+' to '+redir+ ' '+res.statusCode)
            return req(idx,redir,end);
					}else {
            err('Maximum redirects reached for '+url);
          }
				}else{
           err('Unable to process response ' + res.statusCode + ' for '+ url);
        }
			}).on('error',err);
		}else {console.log('cached '+url);}
	}
	return req;
}

mongo.connect('mongodb://localhost:27017/jwscrapper',function(err,db){
	try{
  	db.collection('imgs').remove({},{w:1},function(err,result){
      if(err)throw err;
      console.log('Removed imgs');
      console.log(result);
      foreach(arr,Requestor(UrlParser),function(result){
        foreach(result,Requestor(LangParser),function(result){
          foreach(result,Requestor(FactsParser),function(result){
            db.close();
          })
        });
  		});
  	});
  }catch(e){
    console.log(e);
    db.close();
  }
});
