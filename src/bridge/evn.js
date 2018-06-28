var self = __thread_call_this;
console.log(__thread_call_this);
var window = self;
self.TextDecoder = TextDecoder;
self.TextEncoder = TextEncoder;
function setTimeout(f, ms){
    console.log("setTimeout------------" + f);
    var _$index = callbacks.register(f);
    NativeObject.call(3964336770,[ ms, _$index]);
}