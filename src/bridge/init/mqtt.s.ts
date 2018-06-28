
import { BonBuffer } from "../../pi/util/bon";
import { addToMeta, removeFromMeta, Struct, notifyModify, StructMgr} from "../../pi/struct/struct_mgr";
import { StructInfo, FieldType, FieldInfo, EnumType} from "../../pi/struct/sinfo";

export class MqttCfg extends Struct {
	static _$info = new StructInfo("bridge/init/mqtt.MqttCfg",2969823486,  new Map( [["constructor","true"],["hasmgr","false"]]), [new FieldInfo("addr",  new FieldType( EnumType.Str ), null), new FieldInfo("protocol",  new FieldType( EnumType.Str ), null), new FieldInfo("send_buf_size",  new FieldType( EnumType.Usize ), null), new FieldInfo("recv_timeout",  new FieldType( EnumType.Usize ), null) ]);

    addr: string;
    protocol: string;
    send_buf_size: number;
    recv_timeout: number;

	constructor(addr?: string,protocol?: string,send_buf_size?: number,recv_timeout?: number, old?: MqttCfg){
		super();
		if(!old){
			this.addr = addr;
			this.protocol = protocol;
			this.send_buf_size = send_buf_size;
			this.recv_timeout = recv_timeout;
		}else{
			this.addr = addr === undefined? old.addr:addr;
			this.protocol = protocol === undefined? old.protocol:protocol;
			this.send_buf_size = send_buf_size === undefined? old.send_buf_size:send_buf_size;
			this.recv_timeout = recv_timeout === undefined? old.recv_timeout:recv_timeout;
		}
	}




	bonDecode(bb:BonBuffer) {
		this.addr = bb.readUtf8();
		this.protocol = bb.readUtf8();
		this.send_buf_size = bb.readInt();
		this.recv_timeout = bb.readInt();
        }

	bonEncode(bb:BonBuffer) {        
        bb.writeUtf8(this.addr);
                
        bb.writeUtf8(this.protocol);
                
        bb.writeInt(this.send_buf_size);
                
        bb.writeInt(this.recv_timeout);
        
	}
}

