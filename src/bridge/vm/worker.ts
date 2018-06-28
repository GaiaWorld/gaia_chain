declare var _$db_mgr;
declare var depend;
// import {get_depend, tabkv_new, tabkv_get_value} from "../pi_serv/js_call";
// import {Vec} from "../def/vec";
// import {BonBuffer} from "../../util/bon";
// import {read} from "../db";
// import {Error} from "./njs";
// import {VMFactory} from "../pi_vm/pi_vm_impl";
// export class Worker{
//     index = 0;
//     constructor(path: string){
//         let dp = get_depend(depend, path).as_slice_String();
//         let codeItems = Vec.new_TabKV();
//         for(let i = 0; i < dp.length; i++){
//             let bb = new BonBuffer();
//             bb.writeUtf8(dp[i]);
//             let item = tabkv_new("memory", "_$code", bb.getBuffer());
//             codeItems.push_TabKV(item);
//         }
//         let vmf = VMFactory.new(0);
//         read(_$db_mgr, (tr) => {
//             let codeResult = tr.query(codeItems, 1000, false);
//             if(codeResult instanceof Error){
//                 return codeResult;
//             }
//             let codes = codeResult.as_slice_TabKV();
            
//             for(let i = 0; i < codes.length; i++){
//                 let v = tabkv_get_value(codes[i]);
//                 vmf = vmf.append(v);
//             }
//         });

//     }

//     exec(funcName: string, callback: (any)){

//     }
// }