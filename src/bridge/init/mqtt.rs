#[constructor=true,hasmgr=false]
struct MqttCfg{
    addr: String,
    protocol: String,
    send_buf_size: usize,
    recv_timeout: usize
}