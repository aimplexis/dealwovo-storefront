/** Do not deploy with real catalog credentials until migrations/RLS are installed. */
export function supabaseConfig(): {url:string;key:string}|null {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key=(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
  if(!url||!key)return null;
  try {const parsed=new URL(url);if(parsed.protocol!=="https:")return null;}catch{return null;}
  return {url,key};
}
export function catalogConfigured(){return supabaseConfig()!==null;}
