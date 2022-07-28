import * as Comlink from "comlink";
import rustPlugin from "../../../../pkg/obsidian_rust_plugin_bg.wasm";
import * as wasm from "../../../../pkg";
import {init_panic_hook, add, find, Note, find_silent} from "../../../../pkg";
import JsNote from "../../JsNote";

class WasmComlinkWorker {
    public async init () {
        console.log("calling init");
        // @ts-ignore
        const buffer = Uint8Array.from(atob(rustPlugin), c => c.charCodeAt(0))
        await wasm.default(Promise.resolve(buffer));
        init_panic_hook()
    }

    public add (a: number, b: number): number {
        console.log("calling add");
        return add(a, b);
    }

    public async find(context: any, notes: Note[], callback: Function) {
        console.log("calling find")
        return await find(context, notes, callback);
    }

    public async findSilent(notes: JsNote[]) {
        console.log(notes)
        console.log("calling find silent")
        return await find_silent(notes);
    }

}
Comlink.expose(WasmComlinkWorker);