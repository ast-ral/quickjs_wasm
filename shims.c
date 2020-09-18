#include <wasi/api.h>
#include <stdint.h>
#include <stdio.h>
#include "quickjs.h"

typedef uint32_t u32;

#ifdef CUSTOM_SHIMS

__wasi_errno_t __shim_clock_time_get(__wasi_clockid_t id, u32 prec_hi, u32 prec_low, u32 *time)
__attribute__((
	__import_module__("shims"),
	__import_name__("clock_time_get"),
	__warn_unused_result__,
));

__wasi_errno_t __wasi_clock_time_get(__wasi_clockid_t id, __wasi_timestamp_t precision, __wasi_timestamp_t *time) {
	u32 prec_low = precision;
	u32 prec_hi = precision >> 32;

	u32 time_u32[2];

	__wasi_errno_t err = __shim_clock_time_get(id, prec_hi, prec_low, &time_u32[0]);

	__wasi_timestamp_t time_out = 0;

	time_out += time_u32[0];
	time_out <<= 32;
	time_out += time_u32[1];

	*time = time_out;

	return err;
}

#endif

int eval_code(JSContext *context, const void *code, int code_len) {
	const char *filename = "<eval>";
	JSValue val = JS_Eval(context, code, code_len, filename, 0);
	int is_exc = JS_IsException(val);
	const char *str = JS_ToCString(context, val);
	fprintf(stderr, "%s", str);
	JS_FreeValue(context, val);
	return is_exc;
}
