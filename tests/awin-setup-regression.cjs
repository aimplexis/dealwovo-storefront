const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"dw-awin-"));
try{cp.execFileSync(process.execPath,[require.resolve("typescript/bin/tsc"),"--target","ES2022","--module","commonjs","--strict","--skipLibCheck","--outDir",dir,"src/lib/catalog/awin-feed.ts"],{stdio:"inherit"});const {parseAwinCSV}=require(path.join(dir,"awin-feed.js")),{awinLinkMatches}=require(path.join(dir,"awin-link.js"));
const good="https://www.awin1.com/pclick.php?p=456&a=123&m=789",binding={publisher:"123",advertiser:"789"};
assert.ok(awinLinkMatches(good,"123","789"));assert.ok(awinLinkMatches("https://www.awin1.com/cread.php?awinmid=789&awinaffid=123&ued=https%3A%2F%2Fmerchant.com","123","789"));
for(const url of [good+"&a=999",good.replace("a=123","a=999"),good.replace("m=789","m=999"),good.replace("awin1.com","awin1.com.evil.com"),good.replace("https:","http:"),good.replace("a=123","%61=123"),good+"&A=123"])assert.equal(awinLinkMatches(url,"123","789"),false);
const header="merchant_product_id,product_name,aw_deep_link,merchant_id,currency,price",csv=header+"\nSKU-1,Coffee maker,"+good+",789,USD,19.99";
const row=parseAwinCSV(csv,binding)[0];assert.equal(row.external_product_id,"SKU-1");assert.equal(row.price_cents,1999);assert.throws(()=>parseAwinCSV(csv.replace(",789,USD",",999,USD"),binding));assert.throws(()=>parseAwinCSV(csv.replace("a=123","a=999"),binding));console.log("PASS Awin scoped CSV: stable merchant ID, publisher and advertiser matching, link validation, USD price");
}finally{fs.rmSync(dir,{recursive:true,force:true});}
