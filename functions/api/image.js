const json=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function onRequestPost({request,env}){try{
 const body=await request.json(),prompt=String(body.prompt||"").trim();if(!prompt)return json({error:"توضیح تصویر خالی است."},400);if(prompt.length>3000)return json({error:"توضیح تصویر بیش از حد طولانی است."},400);
 if(!env.FAL_KEY)return json({error:"برای ساخت تصویر باید کلید FAL_KEY را در Cloudflare Pages → Settings → Variables and Secrets اضافه کنی. تولید تصویر ممکن است اعتبار مصرفی جداگانه داشته باشد."},503);
 const r=await fetch("https://fal.run/fal-ai/flux/schnell",{method:"POST",headers:{"Authorization":"Key "+env.FAL_KEY,"Content-Type":"application/json"},body:JSON.stringify({prompt,image_size:"landscape_4_3",num_images:1,enable_safety_checker:true})});
 if(!r.ok)return json({error:r.status===429?"سهمیه ساخت تصویر موقتاً تمام شده است.":"سرویس ساخت تصویر پاسخ ناموفق داد."},502);
 const data=await r.json(),imageUrl=data.images?.[0]?.url;if(!imageUrl)return json({error:"سرویس تصویر خروجی معتبری برنگرداند."},502);return json({answer:"تصویرت آماده شد.",imageUrl});
 }catch(e){return json({error:"ساخت تصویر با خطا روبه‌رو شد."},500);}}