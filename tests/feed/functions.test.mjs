// Exercise the actual Netlify entry points with isolated provider transports.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { A, video } from './helpers.mjs';

test('scheduled and HTTP entry points share a conditional edition with a fail-closed site binding', async t => {
  const symbol=Symbol.for('nerdy-birdie.test-get-store');
  let entry=null, writes=0;
  globalThis[symbol]=({name, consistency})=>{
    assert.equal(name,'nb-staging-source-feed-v1'); assert.equal(consistency,'strong');
    return {
      getWithMetadata:async()=>structuredClone(entry),
      setJSON:async(_key,data,condition)=>{
        const valid=entry ? condition.onlyIfMatch === entry.etag : condition.onlyIfNew === true;
        if (!valid) return {modified:false};
        entry={etag:String(++writes),data:structuredClone(data)}; return {modified:true};
      }
    };
  };
  const fake='data:text/javascript,'+encodeURIComponent("export const getStore=globalThis[Symbol.for('nerdy-birdie.test-get-store')];");
  const hooks=registerHooks({resolve(specifier,context,next){
    return specifier==='@netlify/blobs' ? {url:fake,shortCircuit:true} : next(specifier,context);
  }});
  const uuid='00000000-0000-0000-0000-000000000001', ctx={site:{id:uuid}};
  const config={NB_STAGING_SITE_ID:uuid,NB_DISCOVERY_ENABLED:'true',NB_YOUTUBE_CHANNEL_IDS:A,NB_YOUTUBE_KEY:'test-only',NB_UPLOAD_LIMIT:'1'};
  const old=Object.fromEntries(Object.keys(config).map(k=>[k,process.env[k]]));
  Object.assign(process.env,config);
  t.after(()=>{
    hooks.deregister(); delete globalThis[symbol];
    for(const [key,value] of Object.entries(old)) {
      if(value===undefined) delete process.env[key]; else process.env[key]=value;
    }
  });
  const responses={channels:[{id:A,contentDetails:{relatedPlaylists:{uploads:'UU'+'a'.repeat(22)}}}],
    playlistItems:[{contentDetails:{videoId:'sample00001'}}], videos:[video()]};
  t.mock.method(globalThis,'fetch',async u=>Response.json({items:responses[u.pathname.split('/').pop()]}));
  const {default: scheduled,config: schedule}=await import('../../netlify/functions/nb-daily.mjs');
  const {default: read}=await import('../../netlify/functions/nb-feed.mjs');
  const request=(query='',method='GET')=>new Request('https://example.invalid/.netlify/functions/nb-feed'+query,{method});
  assert.equal(schedule.schedule,'17 10 * * *');
  await assert.rejects(scheduled(null,{site:{id:'wrong'}})); assert.equal(writes,0);
  process.env.NB_DISCOVERY_ENABLED='false'; await scheduled(null,ctx); assert.equal(writes,0);
  process.env.NB_DISCOVERY_ENABLED='true'; await scheduled(null,ctx);
  const afterFirst=writes; await scheduled(null,ctx); assert.equal(writes,afterFirst);
  const safe=await read(request(),ctx); assert.equal(safe.status,200); assert.match(safe.headers.get('cache-control'),/no-store/);
  const data=await safe.json(); assert.equal(data.items.length,1); assert.equal(data.items[0].title,undefined);
  const visible=await (await read(request('?reveal=1&category=vehicles'),ctx)).json();
  assert.equal(visible.items[0].title,video().snippet.title);
  assert.equal((await read(request('?category=unknown'),ctx)).status,400);
  assert.equal((await read(request('','POST'),ctx)).status,405);
  assert.equal((await read(request(),{site:{id:'wrong'}})).status,503);
});
