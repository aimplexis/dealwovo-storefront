const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"dw-visual-"));
try{
 cp.execFileSync(process.execPath,[require.resolve("typescript/bin/tsc"),"--target","ES2022","--module","commonjs","--strict","--skipLibCheck","--outDir",dir,"src/lib/marketing/visual-template.ts"],{stdio:"inherit"});
 const {themes,formats,palettes,validCreative,creativeSvg}=require(path.join(dir,"visual-template.js"));
 let n=0;for(const t of Object.keys(themes))for(const f of Object.keys(formats))for(const p of Object.keys(palettes)){const c=validCreative(t,f,p),s=creativeSvg(c);assert.ok(c);assert.equal(s,creativeSvg(c));assert.ok(s.includes('width="'+formats[f][0]+'" height="'+formats[f][1]+'"'));assert.ok(s.includes("Not a verified product offer"));assert.ok(!/<script|<image|<foreignObject|href=|onload=/i.test(s));n++;}
 assert.equal(n,48);for(const bad of ["__proto__","constructor","<script>",null,42]){assert.equal(validCreative(bad,"square","cream"),null);assert.equal(validCreative("holiday",bad,"cream"),null);assert.equal(validCreative("holiday","square",bad),null);}
 console.log("PASS visual templates: all 48 combinations, dimensions, deterministic rendering, editorial disclaimer and invalid input rejection");
}finally{fs.rmSync(dir,{recursive:true,force:true});}
