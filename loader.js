const {readFileSync} = require("fs")

const data = readFileSync("./out.wasm")

const imports = [
	"args_get",
	"args_sizes_get",
	"clock_res_get",
	//"clock_time_get",
	"environ_get",
	"environ_sizes_get",
	"fd_advise",
	"fd_allocate",
	"fd_close",
	"fd_datasync",
	"fd_fdstat_get",
	"fd_fdstat_set_flags",
	"fd_filestat_get",
	"fd_filestat_set_size",
	"fd_filestat_set_times",
	"fd_pread",
	"fd_prestat_dir_name",
	"fd_prestat_get",
	"fd_pwrite",
	"fd_read",
	"fd_readdir",
	"fd_renumber",
	"fd_seek",
	"fd_sync",
	"fd_tell",
	"fd_write",
	"path_create_directory",
	"path_filestat_get",
	"path_filestat_set_times",
	"path_link",
	"path_open",
	"path_readlink",
	"path_remove_directory",
	"path_rename",
	"path_symlink",
	"path_unlink_file",
	"poll_oneoff",
	"proc_exit",
	"random_get",
	"sched_yield",
	"sock_recv",
	"sock_send",
	"sock_shutdown",
]

function make_import(name) {
	return function (...args) {
		console.log(name, "called with args:", args)
		throw new Error("hello from " + name)
	}
}

const files = new Map

const wasi_snapshot_preview1 = {
	fd_write(fd, iovs_ptr, iovs_len, nwritten_ptr) {
		const out = []

		const memory = get_memory()

		let nwritten = 0

		for (let i = 0; i < iovs_len; i++) {
			const buffer = memory.getUint32(iovs_ptr + 8 * i, little_endian)
			const length = memory.getUint32(iovs_ptr + 8 * i + 4, little_endian)

			for (let j = 0; j < length; j++) {
				out.push(memory.getUint8(buffer + j, little_endian))
				nwritten++
			}
		}

		memory.setUint32(nwritten_ptr, nwritten, little_endian)

		console.log(`write on fd ${fd}: ${String.fromCharCode(...out)}`)
	}
}

for (const name of imports) {
	if (!(name in wasi_snapshot_preview1)) {
		wasi_snapshot_preview1[name] = make_import(name)
	}
}

const u32_max = Math.pow(2, 32)

const little_endian = true

const shims = {
	clock_time_get(clock_id, prec_hi, prec_low, out_ptr) {
		if (clock_id != 0) {
			throw new Error("unsupported clock")
		}

		const time = Date.now() * 1000000

		const memory = get_memory()

		memory.setUint32(out_ptr, time / u32_max | 0, little_endian)
		memory.setUint32(out_ptr + 4, time % u32_max, little_endian)

		return 0
	}
}

function get_memory() {
	return new DataView(qjs.memory.buffer)
}

const mod = new WebAssembly.Module(data)
const instance = new WebAssembly.Instance(mod, {wasi_snapshot_preview1, shims})
const qjs = instance.exports

const runtime = qjs.JS_NewRuntime()
const context = qjs.JS_NewContext(runtime)

function write_str(str) {
	const buffer = qjs.malloc(str.length + 1)
	const memory = get_memory()

	for (let i = 0; i < str.length; i++) {
		memory.setUint8(buffer + i, str.charCodeAt(i), little_endian)
	}

	memory.setUint8(buffer + str.length, 0, little_endian)

	return buffer
}

const code = "1 + 2"
const code_ptr = write_str(code)

qjs.eval_code(context, code_ptr, code.length)

qjs.free(code_ptr)
qjs.JS_FreeContext(context)
qjs.JS_FreeRuntime(runtime)
