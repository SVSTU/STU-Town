// Local, read-only asset preview server. No game backend or account writes.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.glb':'model/gltf-binary','.png':'image/png','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
    let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400).end();return;}
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.stat(file,(error,stat)=>{
        if(error||!stat.isFile()){res.writeHead(404).end();return;}
        res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
        const preview=file===path.join(root,'tools/map3d-smoke.html')||file.endsWith(path.sep+'preview.html');
        if(preview){
            let html=fs.readFileSync(file,'utf8');
            for(const [url,name] of [['https://cdn.babylonjs.com/babylon.js','babylon.js'],['https://cdn.babylonjs.com/gui/babylon.gui.min.js','babylon.gui.min.js'],['https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js','babylonjs.loaders.min.js']]){
                if(fs.existsSync(path.join(root,'tools/.preview-cache',name)))html=html.replaceAll(url,'/tools/.preview-cache/'+name);
            }
            res.end(html);return;
        }
        fs.createReadStream(file).pipe(res);
    });
}).listen(8766,'127.0.0.1',()=>console.log('3D previews: http://127.0.0.1:8766/tools/map3d-smoke.html?map=khu-a'));
