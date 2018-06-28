
import {cfgMgr} from "../../pi/util/cfg";
import {MqttCfg} from "./mqtt.s";
cfgMgr.set("_$server_cfg", new Map<number,any>([[0, new MqttCfg("0.0.0.0:1234", "tcp", 1024*1024, 500 * 1000)]]));