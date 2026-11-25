const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"dw-seo-"));
try{cp.execFileSync(process.execPath,[require.resolve("typescript/bin/tsc"),"--target","ES2022","--module","commonjs","--strict","--skipLibCheck","--outDir",dir,"src/lib/marketing/seo-readiness.ts"],{stdio:"inherit"});
const m=require(path.join(dir,"seo-readiness.js"));const paths=Object.keys(m.seoPages);
assert.equal(paths.length,12);for(const p of paths){const v=m.pageMetadata(p);assert.equal(v.alternates.canonical,"https://dealwovo.com"+p);assert.deepEqual(v.robots,{index:false,follow:false});}
assert.ok(m.auditMetadata(paths.map(path=>({path,...m.seoPages[path]}))).every(x=>x.issues.length===0));
assert.ok(m.auditMetadata([{path:"/a",title:"Same",description:"a"},{path:"/b",title:"same",description:"b"}]).every(x=>x.issues.includes("Duplicate title")));
assert.equal(m.productMetadata(null).alternates,undefined);assert.equal(m.productMetadata({slug:"../bad",title:"x",description:"x"}).alternates,undefined);
assert.equal(m.productMetadata({slug:"real-product",title:"x",description:"y"}).alternates.canonical,"https://dealwovo.com/product/real-product");
assert.ok(m.reviewCopy("Best deal $50, 20% off").length>=2);assert.ok(m.reviewCopy("").includes("No copy supplied"));assert.equal(m.reviewCopy("Editorial ideas. Affiliate disclosure.").length,0);
assert.ok(m.reviewCopy("#1 choice").some(x=>x.includes("Ranking")));assert.ok(m.reviewCopy("Top-rated pick").some(x=>x.includes("Ranking")));assert.ok(m.auditMetadata([{path:"/a",title:"First",description:"Same description"},{path:"/b",title:"Second",description:" same  description "}]).every(x=>x.issues.includes("Duplicate description")));
console.log("PASS SEO readiness: 12 canonical metadata entries, indexing hold, duplicate detection, product guard and copy flags");
}finally{fs.rmSync(dir,{recursive:true,force:true});}
