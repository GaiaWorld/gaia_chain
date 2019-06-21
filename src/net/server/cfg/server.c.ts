/**
 * Server configuration
 */
import { cfgMgr } from '../../../pi/util/cfg';
import { MqttCfg, NetCfg, NetCfg_Enum, RawNetCfg, RawNetMgr, RpcCfg } from '../../../pi_pt/init/server_cfg.s';

// const netMgr = new NetMgr('netMgr', []);
// const netCfg = new NetCfg('0.0.0.0:9080', 'tcp', true, netMgr, []);
// const mqttCfg = new MqttCfg(netCfg, 1024 * 1024, 500 * 1000, 'mqttServer', []);
// const rpcCfg = new RpcCfg(mqttCfg, 'rpcServer', ['mqttServer']);
// // const httpsCfg = new HttpsCfg('0.0.0.0', 82, 5000, 10000, '../dst/');

// cfgMgr.set(NetMgr._$info.name, new Map<number, any>([[0, netMgr]]));
// cfgMgr.set(NetCfg._$info.name, new Map<number, any>([[0, netCfg]]));
// cfgMgr.set(MqttCfg._$info.name, new Map<number, any>([[0, mqttCfg]]));
// cfgMgr.set(RpcCfg._$info.name, new Map<number, any>([[0, rpcCfg]]));
// // cfgMgr.set(HttpsCfg._$info.name, new Map<number,any>([[0, httpsCfg]]));

// 启动http与ws
const rawNetMgr = new RawNetMgr('rawNetMgr', []);
const rawNetCfg = new NetCfg(NetCfg_Enum.Raw, new RawNetCfg('0.0.0.0:1156', 'tcp', true, rawNetMgr, []));
const mqttCfg = new MqttCfg(rawNetCfg, 1024 * 1024, 500 * 1000, 'mqttServer', []);
const rpcCfg = new RpcCfg(mqttCfg, 'rpcServer', ['mqttServer']);

cfgMgr.set(RawNetMgr._$info.name, new Map<number, any>([[0, rawNetMgr]]));
cfgMgr.set(NetCfg._$info.name, new Map<number, any>([[0, rawNetCfg]]));
cfgMgr.set(MqttCfg._$info.name, new Map<number, any>([[0, mqttCfg]]));
cfgMgr.set(RpcCfg._$info.name, new Map<number, any>([[0, rpcCfg]]));