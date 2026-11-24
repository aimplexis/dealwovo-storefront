const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"dw-amazon-"));
try{
 cp.execFileSync(process.execPath,[require.resolve("typescript/bin/tsc"),"--target","ES2022","--module","commonjs","--strict","--skipLibCheck","--outDir",dir,"src/lib/catalog/amazon-link.ts"],{stdio:"inherit"});
 const {parseAmazonProduct:p}=require(path.join(dir,"amazon-link.js")),tag="fixture-20",asin="TEST000001",canonical="https://www.amazon.com/dp/"+asin+"?tag="+tag;
 for(const input of [asin,asin.toLowerCase(),"https://amazon.com/dp/"+asin,"https://www.amazon.com/Editorial-name/dp/"+asin+"/ref=abc?tag="+tag+"&other=unused","https://www.amazon.com/gp/product/"+asin+"?tag="+tag])assert.deepEqual(p(input,tag),{ok:true,asin,url:canonical});
 for(const input of ["https://amazon.com.evil.com/dp/"+asin,"https://www.amazon.co.uk/dp/"+asin,"https://www.amazon.com@evil.com/dp/"+asin,"https://evil.com@www.amazon.com/dp/"+asin,"http://www.amazon.com/dp/"+asin,"https://www.amazon.com:444/dp/"+asin,"https://www.amazon.com/s?k="+asin,"https://www.amazon.com/dp/short","https://www.amazon.com/dp/"+asin+"/extra/path","https://www.amazon.com\\@evil.com/dp/"+asin])assert.equal(p(input,tag).ok,false);
 for(const query of ["tag=other-20","tag=","tag="+tag+"&tag="+tag])assert.deepEqual(p("https://www.amazon.com/dp/"+asin+"?"+query,tag),{ok:false,reason:"tag"});
 for(const host of ["amzn.to","a.co"])assert.deepEqual(p("https://"+host+"/example",tag),{ok:false,reason:"short"});
 assert.equal(p(asin,"bad-tag").ok,false);
 console.log("PASS Amazon link intake: ASIN extraction, direct URLs, tracking match, strict host and path, shortened link rejection");
}finally{fs.rmSync(dir,{recursive:true,force:true});}
