const fs = require('fs');
const p = 'c:\\Users\\404\\Documents\\GitHub\\FanTv\\src\\app\\settings\\site\\page.tsx';
let txt = fs.readFileSync(p, 'utf8');

if(txt.includes('豆瓣数据代理')) {
  console.log('Already injected!');
  process.exit(0);
}

const target = '<div className="flex justify-end">';

if(!txt.includes(target)) {
  console.log('Target not found!');
  process.exit(1);
}

const replacement = `         <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800/80 space-y-5 mb-6">
            <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">豆瓣数据代理</label>
               <p className="text-xs text-gray-500 mb-2">如果您在获取豆瓣电影数据时遇到 403 (IP 异常)，请选择或配置代理服务。</p>
               <select 
                 value={doubanDataProxy} onChange={e => setDoubanDataProxy(e.target.value)}
                 className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-blue-500 transition-shadow mb-3"
               >
                 <option value="">直连（服务器直接请求豆瓣）</option>
                 <option value="https://cors.zwei.ren/">Cors Proxy By Zwei</option>
                 <option value="custom">自定义代理</option>
               </select>
               {doubanDataProxy === 'custom' && (
                 <input 
                   value={doubanDataProxyCustom} onChange={e => setDoubanDataProxyCustom(e.target.value)} required
                   placeholder="填写完整的代理 API URL (例如: https://api.example.com/)"
                   className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-blue-500 transition-shadow"
                 />
               )}
            </div>
            
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 mt-4">豆瓣图片代理</label>
               <p className="text-xs text-gray-500 mb-2">选择获取豆瓣影册图片的 CDN 加速方式，避免被跨域拦截或图片防盗链。</p>
               <select 
                 value={doubanImageProxy} onChange={e => setDoubanImageProxy(e.target.value)}
                 className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-blue-500 transition-shadow mb-3"
               >
                 <option value="">直连（服务器直接请求豆瓣）</option>
                 <option value="https://images.weserv.nl/?url=">Weserv CDN 缓存加速</option>
                 <option value="https://douban.img.lithub.cc/">豆瓣 CDN By CMLiussss (腾讯云)</option>
                 <option value="https://ali.douban.img.lithub.cc/">豆瓣 CDN By CMLiussss (阿里云)</option>
                 <option value="custom">自定义代理</option>
               </select>
               {doubanImageProxy === 'custom' && (
                 <input 
                   value={doubanImageProxyCustom} onChange={e => setDoubanImageProxyCustom(e.target.value)} required
                   placeholder="填写完整的图片代理前缀 (将在其后拼接原始图片URL)"
                   className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-blue-500 transition-shadow"
                 />
               )}
            </div>
         </div>

         <div className="flex justify-end">`;

txt = txt.replace(target, replacement);
fs.writeFileSync(p, txt);
console.log('Success');
