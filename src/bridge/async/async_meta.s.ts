
import { BonBuffer } from "../../pi/util/bon";
import { addToMeta, removeFromMeta, Struct, notifyModify, StructMgr} from "../../pi/struct/struct_mgr";
import { StructInfo, FieldType, FieldInfo, EnumType} from "../../pi/struct/sinfo";

export class AsyncMeta extends Struct {
	static _$info = new StructInfo("bridge/async/async_meta.AsyncMeta",68782621,  new Map( [["constructor","true"],[" managed","false"]]), [new FieldInfo("path",  new FieldType( EnumType.Str ), null) ]);

    path: string;

	constructor(path?: string, old?: AsyncMeta){
		super();
		if(!old){
			this.path = path;
		}else{
			this.path = path === undefined? old.path:path;
		}
	}

	addMeta(mgr: StructMgr){
		if(this._$meta)
			return;
		addToMeta(mgr, this);
	}

	removeMeta(){
		removeFromMeta(this);
        }



	bonDecode(bb:BonBuffer) {
		this.path = bb.readUtf8();
        }

	bonEncode(bb:BonBuffer) {        
        bb.writeUtf8(this.path);
        
	}
}

