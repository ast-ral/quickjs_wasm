CFLAGS += -I wasi-sysroot/include
CFLAGS += -target wasm32-unknown-wasi
CFLAGS += -DEMSCRIPTEN
CFLAGS += -DCONFIG_VERSION=\"$(shell cat VERSION)\"
CFLAGS += -DCUSTOM_SHIMS
CFLAGS += -O3

build: obj out.wasm

obj:
	mkdir obj

out.wasm: obj/quickjs.o obj/cutils.o obj/libregexp.o obj/libunicode.o obj/shims.o
	wasm-ld $^ wasi-sysroot/lib/wasm32-wasi/libc.a -o $@ --no-entry --export-all --allow-undefined-file=shims.imports

obj/%.o: %.c
	clang -c $^ -o $@ $(CFLAGS)

clean:
	rm -rf obj
	rm -f out.wasm

.PHONY: build clean
