/**
 * RPC的标准返回值
 */
 #[type=rpc]
struct OK {
}

 #[type=rpc]
struct OK_I {
	value:i32,
}

 #[type=rpc]
struct OK_S {
	value:str,
}

 #[type=rpc]
struct Error {
	code: i32,
	info:str,
}

/**
 * RPC的请求
 */
 #[type=rpc]
struct Req {
	path: str,
}



