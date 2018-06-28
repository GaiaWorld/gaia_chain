_$define("rt/js_njs/njs", function (require, exports, module){
    exports.NativeObject = NativeObject;
    exports.callbacks = callbacks;
    exports.__thread_yield = __thread_yield;
    exports.__thread_call = __thread_call;
    exports.Error = function(str){
        this.message = str;
    }
    exports.syncCall = function(funHash, args){
        console.log("7777777777777777777777777788888888888888888888888888888888888");
        try {
            var r = NativeObject.call(funHash, args);
           
            if(r === undefined){
                    return __thread_yield();
            }else{
                return r;
            }
        } catch (error) {
            if(typeof error === "string" && error.indexOf("Result is Err") > -1){
                return exports.Error(error.replace("Result is Err", ""));
            }else{
                throw error;
            }
        }
    }

    exports.call = function(funHash, args){
        try {
            return NativeObject.call(funHash, args);
        } catch (error) {
            if(typeof error === "string" && error.indexOf("Result is Err") > -1){
                return exports.Error(error.replace("Result is Err", ""));
            }else{
                throw error;
            }
        }
    }

    exports.asyncCall = function(funHash, args, callback){
        var index = callbacks.register(callback);
        args.push(index);
        try {
            return NativeObject.call(funHash, args);
        } catch (error) {
            if(typeof error === "string" && error.indexOf("Result is Err") > -1){
                return exports.Error(error.replace("Result is Err", ""));
            }else{
                throw error;
            }
        }
    }

    //将大整数转化为u32的数组
    //根据本机大小端转换TODO
    exports.u64ToBuffer = function(n){
       var arr = new Uint32Array(2);
       var i = 0;
       while (!n.isZero()){
            var r = n.divmod(4294967296);
            arr[i] = r.remainder.value;
            n = r.quotient;
            i++;
       }
       return arr.buffer;
    }

    //将大整数转化为u32的数组
    //根据本机大小端转换TODO
    exports.u128ToBuffer = function(n){
        var arr = new Uint32Array(4);
        var i = 0;
        while (!n.isZero()){
             var r = n.divmod(4294967296);
             arr[i] = r.remainder.value;
             n = r.quotient;
             i++;
        }
        return arr.buffer;
     }
})

