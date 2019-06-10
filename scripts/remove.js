const fs = require("fs");
const pathModule = require("path");

// const fsPromises = require('fs').promises; // 实验性特性,仅较新版本支持

function deleteFiles(path, checkIsDel, delDir){
    return new Promise(resolve => {
        fs.readdir(path, null, (err, files) => {
            if(err) return resolve();

            const delPromises = [];
            files.forEach(function (file) {
                var curPath = pathModule.join(path, file);

                try {
                    if (fs.statSync(curPath).isDirectory()) { // recurse  
    
                        delPromises.push(deleteFiles(curPath, checkIsDel, delDir));
    
                    } else { // delete file
    
                        if(!checkIsDel || checkIsDel(file, path)){
                            delPromises.push(new Promise(fullfile => fs.unlink(curPath, () => {
                                console.log('remove: '+ curPath);
                                fullfile();
                            })));
                        }
    
                    }
                } catch(e) {
                    return;
                }
            });

            resolve(Promise.all(delPromises).then(() => {
                if(!delDir) return;

                return new Promise(fullfile => fs.rmdir(path, fullfile))
            }));
        })
    })
}

function isDelDb(){
    let arg = process.argv[2];
    if(!arg) return false;

    arg = arg.toLocaleLowerCase();

    return arg === 'y' || arg === 'yes';
}


function del(cfgPath){
    const str = fs.readFileSync(cfgPath, "utf8");
    const config = JSON.parse(str);

    const dels = [];

    // 移除项目构建代码及界面编辑器构建代码
    for(let i of [1]){
        const path = config.dsts[i].path;
        dels.push(deleteFiles(path, null, true))
    }

    // 移除app/db中生成的*.s.ts
    dels.push(deleteFiles('../src/game/app/db', file => file.endsWith('.s.ts')));

    // 移除项目中xls中生成的*.c.ts,*.rs,*.s.ts
    // 移除项目中server中生成的*.c.ts,*.p.ts,*.s.ts
    for(let v of ['a', 'b', 'c']){
        const dir = '../src/game/app_' + v;
        dels.push(deleteFiles(dir, (file, path) => {
            if(path.endsWith('xls')){
                return file.endsWith('.rs') || file.endsWith('.s.ts') || file.endsWith('.c.ts')
            }
            if(path.endsWith('server')){
                return file.endsWith('.p.ts') || file.endsWith('.s.ts') || file.endsWith('.c.ts')
            }

            return false;
        }));
    }

    // 移除depend
    const idDepend = file => file.endsWith('.depend');
    dels.push(
        deleteFiles('./', idDepend),
        deleteFiles('../src', idDepend)
    );

    // 删除数据库
    if(isDelDb()) dels.push(deleteFiles('./file', null, true))

    // 移除miniGame_block_hero
    dels.push(deleteFiles("../../miniGame_block_hero", null, true));
    dels.push(deleteFiles("../../miniGame_builder/nginx/html", null, true));
    dels.push(deleteFiles("../miniGame", null, true));
    

    return Promise.all(dels)
}

del("./.conf").then(() => console.log("------------ok"));