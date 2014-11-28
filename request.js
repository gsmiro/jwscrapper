function Requestor(ctor,proc,maxrdrct){
  if(maxrdrct === undefined)maxrdrct = 3;
  var arr = [];
  var redirects = 0;
  var req = function(idx,url,end){
    if(!cache[url]){
      function err(err){console.log(url);console.log(err)};
      var proto = url.match(/https:.*/)?require('https'):require('http');
      proto.get(url,function(res){
        if(res.statusCode === 200){
          var parser = new ctor(proc);
          res.on('data',function(data){
            parser.write(data)
          }).on('end',function(){
            console.log('parsed '+this.req.path+' for '+url);
            parser.end();
            cache[url] = this.req.path;
            arr.concat(parser.items());
            if(end)end(arr);
          }).on('error',err);
        }else if(res.statusCode > 301 && res.statusCode < 309){
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
