const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"dw-awin-"));
try{cp.execFileSync(process.execPath,[require.resolve("typescript/bin/tsc"),"--target","ES2022","--module","commonjs","--strict","--skipLibCheck","--outDir",dir,"src/lib/catalog/awin-feed.ts","src/lib/catalog/awin-feed-batches.ts"],{stdio:"inherit"});const {parseAwinCSV}=require(path.join(dir,"awin-feed.js")),{awinLinkMatches}=require(path.join(dir,"awin-link.js"));
const good="https://www.awin1.com/pclick.php?p=456&a=123&m=789",binding={publisher:"123",advertiser:"789"};
assert.ok(awinLinkMatches(good,"123","789"));assert.ok(awinLinkMatches("https://www.awin1.com/cread.php?awinmid=789&awinaffid=123&ued=https%3A%2F%2Fmerchant.com","123","789"));
for(const url of [good+"&a=999",good.replace("a=123","a=999"),good.replace("m=789","m=999"),good.replace("awin1.com","awin1.com.evil.com"),good.replace("https:","http:"),good.replace("a=123","%61=123"),good+"&A=123"])assert.equal(awinLinkMatches(url,"123","789"),false);
const header="merchant_product_id,product_name,aw_deep_link,merchant_id,currency,price",csv=header+"\nSKU-1,Coffee maker,"+good+",789,USD,19.99";
const row=parseAwinCSV(csv,binding)[0];assert.equal(row.external_product_id,"SKU-1");assert.equal(row.price_cents,1999);assert.throws(()=>parseAwinCSV(csv.replace(",789,USD",",999,USD"),binding));assert.throws(()=>parseAwinCSV(csv.replace("a=123","a=999"),binding));const {prepareAwinBatches}=require(path.join(dir,"awin-feed-batches.js"));
const make=(count)=>header+"\n"+Array.from({length:count},(_,i)=>"SKU-"+i+",Coffee maker,"+good+",789,USD,19.99").join("\n");
for(const count of [1,100,101,1000,5000]){
 const prepared=prepareAwinBatches(make(count),binding);
 assert.equal(prepared.products,count);assert.equal(prepared.batches.length,Math.ceil(count/100));
 const mapped=prepared.batches.flatMap(batch=>{assert.ok(Buffer.byteLength(batch)<=102400);const rows=parseAwinCSV(batch,binding);assert.ok(rows.length<=100);return rows;});
 assert.deepEqual(mapped.map(r=>r.external_product_id),Array.from({length:count},(_,i)=>"SKU-"+i));assert.ok(mapped.every(r=>r.price_cents===1999));
}
assert.throws(()=>prepareAwinBatches(make(5001),binding));
assert.throws(()=>prepareAwinBatches(make(101).replace("SKU-100,","SKU-0,"),binding));
assert.throws(()=>prepareAwinBatches(make(101).replace("SKU-100,Coffee maker","SKU-100,X"),binding));
assert.throws(()=>prepareAwinBatches(make(101).replace(/789,USD,19.99$/,"789,EUR,19.99"),binding));
assert.throws(()=>prepareAwinBatches(make(101).replace(/789,USD,19.99$/,"999,USD,19.99"),binding));
assert.throws(()=>prepareAwinBatches(make(1),{publisher:"0",advertiser:"789"}));
assert.throws(()=>prepareAwinBatches(make(1)+"\n\"unterminated",binding));
const longHeader=header+",description",longFeed=longHeader+"\n"+Array.from({length:100},(_,i)=>"SKU-"+i+",Coffee maker,"+good+",789,USD,19.99,\""+("é".repeat(1100))+"\"").join("\n");
const split=prepareAwinBatches(longFeed,binding);assert.ok(split.batches.length>1);assert.equal(split.products,100);assert.ok(split.batches.every(b=>Buffer.byteLength(b)<=102400));
const quoted=prepareAwinBatches(header+",description\nSKU-1,\"Coffee, maker\","+good+",789,USD,19.99,\"line one\nline \"\"two\"\"\"",binding);
assert.equal(parseAwinCSV(quoted.batches[0],binding)[0].description,'line one\nline "two"');
assert.throws(()=>prepareAwinBatches("x".repeat(5*1024*1024+1),binding));
console.log("PASS bulk feed: 5000 rows, byte limits, ordering, multiline quotes, duplicates and late invalid rows");
console.log("PASS Awin scoped CSV: stable merchant ID, publisher and advertiser matching, link validation, USD price");
}finally{fs.rmSync(dir,{recursive:true,force:true});}
