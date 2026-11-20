const json=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function onRequestPost({request,env}){try{
 const body=await request.json(),prompt=String(body.prompt||"").trim();if(!prompt)return json({error:"توضیح تصویر خالی است."},400);if(prompt.length>3000)return json({error:"توضیح تصویر بیش از حد طولانی است."},400);
 if(!env.ONE_X_AI_API_KEY)return json({error:"برای ساخت تصویر، کلید ONE_X_AI_API_KEY را به‌صورت Secret در Cloudflare اضافه کن."},503);
 const r=await fetch("https://1xai.ir/v1/images/generations",{method:"POST",headers:{"Authorization":"Bearer "+env.ONE_X_AI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:env.ONE_X_AI_IMAGE_MODEL||"gpt-image-2",prompt,size:"1024x1024"})});
 if(!r.ok)return json({error:r.status===402?"اعتبار حساب 1xAi کافی نیست.":r.status===429?"سهمیه ساخت تصویر موقتاً تمام شده است.":"سرویس ساخت تصویر پاسخ ناموفق داد؛ مدل و دسترسی آن را در پنل 1xAi بررسی کن."},502);
 const data=await r.json(),item=data.data?.[0]||data.images?.[0]||data.output?.[0]||{};
 const imageUrl=item.url||item.image_url||(item.b64_json?"data:image/png;base64,"+item.b64_json:null);
 if(!imageUrl)return json({error:"پاسخ سرویس تصویر خروجی قابل نمایش نداشت."},502);
 return json({answer:"تصویرت آماده شد.",imageUrl,provider:"1xAi"});
 }catch(e){return json({error:"ساخت تصویر با خطا روبه‌رو شد."},500);}}
